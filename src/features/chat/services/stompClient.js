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
      const connectFrame = [
        'CONNECT',
        'accept-version:1.2',
        `Authorization:Bearer ${token}`,
        `passcode:${token}`,
        'heart-beat:0,0',
        '',
        '',
      ].join('\n') + '\0';

      this.ws.send(connectFrame);
    };

    this.ws.onmessage = (event) => {
      this.handleIncomingData(event.data);
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
    const headerBodySplit = frameStr.indexOf('\n\n');
    let headerStr = frameStr;
    let body = '';

    if (headerBodySplit !== -1) {
      headerStr = frameStr.slice(0, headerBodySplit);
      body = frameStr.slice(headerBodySplit + 2);
    }

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
        break;

      case 'MESSAGE': {
        const destination = headers['destination'];
        const subId = headers['subscription'];

        let parsedBody = body;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          // Keep raw string body if JSON parsing fails
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

  unsubscribe(subId) {
    if (this.subscriptions.has(subId)) {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        const unsubFrame = ['UNSUBSCRIBE', `id:${subId}`, '', ''].join('\n') + '\0';
        try {
          this.ws.send(unsubFrame);
        } catch {
          // Socket might already be closed
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

    const sendFrame = [
      'SEND',
      `destination:${destination}`,
      'content-type:application/json',
      `content-length:${new Blob([payload]).size}`,
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
        // Socket might already be closed
      }
      this.ws = null;
    }

    this.connected = false;
    this.updateStatus('disconnected');
  }
}

