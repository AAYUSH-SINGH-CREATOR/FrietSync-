import { getAccessToken } from '../../auth/services/authApi';

const DEFAULT_HTTP_BASE = import.meta.env.VITE_BASE_URL;

export const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const base = DEFAULT_HTTP_BASE || 'https://frietsync.live/api/v1';
  let wsUrl = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  if (wsUrl.includes('/api/v1')) {
    wsUrl = wsUrl.replace(/\/api\/v1\/?$/, '/ws');
  } else if (!wsUrl.endsWith('/ws')) {
    wsUrl = wsUrl.replace(/\/+$/, '') + '/ws';
  }
  return wsUrl;
};

const getToken = () => {
  const rawToken =
    localStorage.getItem('frietSyncToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';
  return rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : getAccessToken() || '';
};

export class StompChatClient {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || getWebSocketUrl();
    this.ws = null;
    this.connected = false;
    this.subIdCounter = 0;
    this.subscriptions = new Map(); 
    this.connectListeners = new Set();
    this.onConnected = options.onConnected || null;
    this.onDisconnected = options.onDisconnected || null;
    this.onError = options.onError || null;
    this.onStatusChange = options.onStatusChange || null;

    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this.intentionalClose = false;
  }

  updateStatus(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  connect() {
    this.intentionalClose = false;
    this.clearReconnectTimer();

    if (this.connected || (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN))) {
      return;
    }

    const token = getToken();
    if (!token) {
      this.updateStatus('unauthorized');
      if (this.onError) this.onError(new Error('No access token available for chat authentication'));
      return;
    }

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
      this.handleConnectionFailure();
      return;
    }

    this.ws.onopen = () => {
      let host;
      try {
        host = new URL(this.wsUrl).host || '/';
      } catch {
        host = '/';
      }

      const connectFrame = [
        'CONNECT',
        'accept-version:1.0,1.1,1.2',
        `host:${host}`,
        'heart-beat:0,0',
        `Authorization:Bearer ${token}`,
        `authorization:Bearer ${token}`,
        `passcode:${token}`,
        `login:${token}`,
        '',
        '',
      ].join('\n') + '\0';

      this.ws.send(connectFrame);
    };

    this.ws.onmessage = async (event) => {
      let data = event.data;
      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        try {
          data = await data.text();
        } catch {
          return;
        }
      } else if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
        data = new TextDecoder().decode(data);
      }
      this.handleIncomingData(data);
    };

    this.ws.onerror = (err) => {
      console.warn('STOMP WebSocket error:', err);
      if (this.onError) this.onError(err);
    };

    this.ws.onclose = (event) => {
      const wasConnected = this.connected;
      this.connected = false;

      if (wasConnected && this.onDisconnected) {
        this.onDisconnected(event);
      }

      if (!this.intentionalClose) {
        this.handleConnectionFailure();
      } else {
        this.updateStatus('disconnected');
      }
    };
  }

  handleConnectionFailure() {
    this.updateStatus('reconnecting');
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts += 1;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.updateStatus('disconnected');
    }
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  handleIncomingData(rawData) {
    if (!rawData) return;

    const chunks = rawData.split('\0');
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      this.parseFrame(chunk);
    }
  }

  parseFrame(frameStr) {
    const cleaned = frameStr.replace(/^[\r\n]+/, '');
    let headerBodySplit = cleaned.indexOf('\r\n\r\n');
    let delimiterLength = 4;
    if (headerBodySplit === -1) {
      headerBodySplit = cleaned.indexOf('\n\n');
      delimiterLength = 2;
    }

    let headerStr = cleaned;
    let body = '';

    if (headerBodySplit !== -1) {
      headerStr = cleaned.slice(0, headerBodySplit);
      body = cleaned.slice(headerBodySplit + delimiterLength);
    }

    body = body.replace(/\0+$/, '');

    const lines = headerStr.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const command = lines[0].toUpperCase();
    const headers = {};
    for (let i = 1; i < lines.length; i++) {
      const colonIdx = lines[i].indexOf(':');
      if (colonIdx !== -1) {
        const key = lines[i].slice(0, colonIdx).trim().toLowerCase();
        const val = lines[i].slice(colonIdx + 1).trim();
        headers[key] = val;
      }
    }

    switch (command) {
      case 'CONNECTED':
        this.connected = true;
        this.reconnectAttempts = 0;
        this.updateStatus('connected');

        for (const [subId, sub] of this.subscriptions.entries()) {
          this.sendSubscribeFrame(subId, sub.destination);
        }

        if (this.onConnected) this.onConnected(headers);
        this.connectListeners.forEach((cb) => {
          try {
            cb(headers);
          } catch (e) {
            console.error('Error in connect listener:', e);
          }
        });
        break;

      case 'MESSAGE': {
        const destination = headers['destination'];
        const subId = headers['subscription'];

        let parsedBody = body;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          
        }

        for (const [id, sub] of this.subscriptions.entries()) {
          if ((subId && subId === id) || (destination && sub.destination === destination)) {
            try {
              sub.callback(parsedBody, headers);
            } catch (cbErr) {
              console.error('Error in chat message subscriber callback:', cbErr);
            }
          }
        }
        break;
      }

      case 'ERROR':
        console.error('STOMP server error frame:', headers, body);
        if (this.onError) {
          const err = new Error(headers['message'] || 'STOMP error from server');
          err.details = body;
          this.onError(err);
        }
        break;

      default:
        break;
    }
  }

  sendSubscribeFrame(subId, destination) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscribeFrame = [
      'SUBSCRIBE',
      `id:${subId}`,
      `destination:${destination}`,
      '',
      '',
    ].join('\n') + '\0';

    this.ws.send(subscribeFrame);
  }

  subscribe(destination, callback) {
    const subId = `sub-${this.subIdCounter++}`;
    this.subscriptions.set(subId, { destination, callback });

    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribeFrame(subId, destination);
    }

    return () => {
      this.unsubscribe(subId);
    };
  }

  addConnectListener(callback) {
    if (typeof callback !== 'function') return () => {};
    this.connectListeners.add(callback);
    return () => {
      this.connectListeners.delete(callback);
    };
  }

  unsubscribe(subId) {
    if (this.subscriptions.has(subId)) {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        const unsubFrame = ['UNSUBSCRIBE', `id:${subId}`, '', ''].join('\n') + '\0';
        try {
          this.ws.send(unsubFrame);
        } catch {
          
        }
      }
      this.subscriptions.delete(subId);
    }
  }

  publish(destination, body) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Chat WebSocket is not connected.');
    }

    const payload = typeof body === 'object' ? JSON.stringify(body) : String(body);
    const contentLength = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(payload).length
      : (typeof Blob !== 'undefined' ? new Blob([payload]).size : payload.length);

    const sendFrame = [
      'SEND',
      `destination:${destination}`,
      'content-type:application/json',
      `content-length:${contentLength}`,
      '',
      payload,
    ].join('\n') + '\0';

    this.ws.send(sendFrame);
  }

  disconnect() {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.subscriptions.clear();

    if (this.ws) {
      try {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
          const discFrame = ['DISCONNECT', '', ''].join('\n') + '\0';
          this.ws.send(discFrame);
        }
        this.ws.close();
      } catch {
        
      }
      this.ws = null;
    }

    this.connected = false;
    this.updateStatus('disconnected');
  }
}

let sharedStompClientInstance = null;

export const getSharedStompClient = () => {
  if (!sharedStompClientInstance) {
    sharedStompClientInstance = new StompChatClient();
  }
  return sharedStompClientInstance;
};


