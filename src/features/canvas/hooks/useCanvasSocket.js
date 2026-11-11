import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '../../auth/services/authApi';
import { getWebSocketUrl } from '../../chat/services/stompClient';

export const useCanvasSocket = (canvasId, onEventReceived) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const connectedRef = useRef(false);
  const subIdCounterRef = useRef(0);
  const subscriptionsRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const eventCallbackRef = useRef(onEventReceived);

  useEffect(() => {
    eventCallbackRef.current = onEventReceived;
  }, [onEventReceived]);

  const sendFrame = useCallback((frameType, headers = {}, body = '') => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !connectedRef.current) {
      return false;
    }
    const headerLines = Object.entries(headers).map(([k, v]) => `${k}:${v}`);
    const payload = typeof body === 'object' ? JSON.stringify(body) : String(body);
    const contentLength = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(payload).length
      : payload.length;

    const frame = [
      frameType,
      ...headerLines,
      `content-type:application/json`,
      `content-length:${contentLength}`,
      '',
      payload,
    ].join('\n') + '\0';

    try {
      ws.send(frame);
      return true;
    } catch (err) {
      console.error('Failed to send WebSocket frame:', err);
      return false;
    }
  }, []);

  const subscribeToDestination = useCallback((destination, callback) => {
    const subId = `sub-canvas-${subIdCounterRef.current++}`;
    subscriptionsRef.current.set(subId, { destination, callback });

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && connectedRef.current) {
      const subFrame = ['SUBSCRIBE', `id:${subId}`, `destination:${destination}`, '', ''].join('\n') + '\0';
      try {
        ws.send(subFrame);
      } catch (err) {
        console.error('Failed to send subscribe frame:', err);
      }
    }

    return () => {
      subscriptionsRef.current.delete(subId);
      const activeWs = wsRef.current;
      if (activeWs && activeWs.readyState === WebSocket.OPEN && connectedRef.current) {
        const unsubFrame = ['UNSUBSCRIBE', `id:${subId}`, '', ''].join('\n') + '\0';
        try {
          activeWs.send(unsubFrame);
        } catch {
        }
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (!canvasId) return;
    intentionalCloseRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const token = getAccessToken();
    if (!token) {
      setConnectionStatus('unauthorized');
      return;
    }

    setConnectionStatus('connecting');
    const wsUrl = getWebSocketUrl();

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket instance:', err);
      handleReconnect();
      return;
    }

    ws.onopen = () => {
      let host = 'localhost';
      try {
        host = new URL(wsUrl).host || 'localhost';
      } catch {
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

      try {
        ws.send(connectFrame);
      } catch (err) {
        console.error('Failed to send CONNECT frame:', err);
      }
    };

    ws.onmessage = async (event) => {
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

      if (!data) return;
      const chunks = data.split('\0');
      for (const chunk of chunks) {
        const cleaned = chunk.replace(/^[\r\n]+/, '').trim();
        if (!cleaned) continue;

        parseFrame(cleaned);
      }
    };

    ws.onerror = (err) => {
      console.warn('Canvas STOMP WebSocket error:', err);
    };

    ws.onclose = () => {
      connectedRef.current = false;
      wsRef.current = null;
      if (!intentionalCloseRef.current) {
        handleReconnect();
      } else {
        setConnectionStatus('disconnected');
      }
    };
  }, [canvasId]);

  const handleReconnect = () => {
    setConnectionStatus('reconnecting');
    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000);
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const parseFrame = (frameStr) => {
    let headerBodySplit = frameStr.indexOf('\r\n\r\n');
    let delimLen = 4;
    if (headerBodySplit === -1) {
      headerBodySplit = frameStr.indexOf('\n\n');
      delimLen = 2;
    }

    let headerStr = frameStr;
    let body = '';
    if (headerBodySplit !== -1) {
      headerStr = frameStr.slice(0, headerBodySplit);
      body = frameStr.slice(headerBodySplit + delimLen).replace(/\0+$/, '');
    }

    const lines = headerStr.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const command = lines[0].toUpperCase();
    const headers = {};
    for (let i = 1; i < lines.length; i++) {
      const idx = lines[i].indexOf(':');
      if (idx !== -1) {
        headers[lines[i].slice(0, idx).trim().toLowerCase()] = lines[i].slice(idx + 1).trim();
      }
    }

    switch (command) {
      case 'CONNECTED':
        connectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        setConnectionStatus('connected');

        for (const [subId, sub] of subscriptionsRef.current.entries()) {
          const subFrame = ['SUBSCRIBE', `id:${subId}`, `destination:${sub.destination}`, '', ''].join('\n') + '\0';
          try {
            wsRef.current?.send(subFrame);
          } catch {
          }
        }
        break;

      case 'MESSAGE': {
        const destination = headers['destination'];
        let parsedBody = body;
        try {
          parsedBody = JSON.parse(body);
        } catch {
        }

        for (const sub of subscriptionsRef.current.values()) {
          if (sub.destination === destination) {
            try {
              sub.callback(parsedBody, headers);
            } catch (err) {
              console.error('Error in subscription callback:', err);
            }
          }
        }

        if (destination === `/topic/canvases/${canvasId}` && eventCallbackRef.current) {
          try {
            eventCallbackRef.current(parsedBody);
          } catch (err) {
            console.error('Error in canvas event handler:', err);
          }
        }
        break;
      }

      case 'ERROR':
        console.error('STOMP Error frame received:', headers, body);
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    if (!canvasId) return undefined;
    connect();

    const unsubscribeTopic = subscribeToDestination(`/topic/canvases/${canvasId}`, (eventData) => {
      if (eventCallbackRef.current) {
        eventCallbackRef.current(eventData);
      }
    });

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      unsubscribeTopic?.();
      const ws = wsRef.current;
      if (ws) {
        try {
          if (connectedRef.current && ws.readyState === WebSocket.OPEN) {
            ws.send(['DISCONNECT', '', ''].join('\n') + '\0');
          }
          ws.close();
        } catch {
        }
        wsRef.current = null;
      }
      connectedRef.current = false;
      setConnectionStatus('disconnected');
    };
  }, [canvasId, connect, subscribeToDestination]);

  const createCanvas = useCallback((projectId, name) => {
    return new Promise((resolve, reject) => {
      const unsub = subscribeToDestination('/user/queue/canvas-created', (data) => {
        unsub();
        resolve(data);
      });
      const sent = sendFrame('SEND', { destination: `/app/projects/${projectId}/canvases/create` }, { name });
      if (!sent) {
        unsub();
        reject(new Error('WebSocket is not connected. Cannot create canvas.'));
      }
    });
  }, [sendFrame, subscribeToDestination]);

  const renameCanvas = useCallback((name, targetCanvasId = canvasId) => {
    return sendFrame('SEND', { destination: `/app/canvases/${targetCanvasId}/rename` }, { name });
  }, [canvasId, sendFrame]);

  const deleteCanvas = useCallback((targetCanvasId = canvasId) => {
    return sendFrame('SEND', { destination: `/app/canvases/${targetCanvasId}/delete` }, {});
  }, [canvasId, sendFrame]);

  const createElement = useCallback((elementData) => {
    return sendFrame('SEND', { destination: `/app/canvases/${canvasId}/elements/create` }, elementData);
  }, [canvasId, sendFrame]);

  const updateElement = useCallback((elementId, elementData) => {
    return sendFrame('SEND', { destination: `/app/canvases/${canvasId}/elements/${elementId}/update` }, elementData);
  }, [canvasId, sendFrame]);

  const deleteElement = useCallback((elementId) => {
    return sendFrame('SEND', { destination: `/app/canvases/${canvasId}/elements/${elementId}/delete` }, {});
  }, [canvasId, sendFrame]);

  const convertToIssue = useCallback((elementId, issuePayload) => {
    return new Promise((resolve, reject) => {
      const unsub = subscribeToDestination('/user/queue/canvas-issue-created', (data) => {
        unsub();
        resolve(data);
      });
      const sent = sendFrame('SEND', { destination: `/app/canvases/${canvasId}/elements/${elementId}/convert-to-issue` }, issuePayload);
      if (!sent) {
        unsub();
        reject(new Error('WebSocket is not connected. Cannot convert element to issue.'));
      }
    });
  }, [canvasId, sendFrame, subscribeToDestination]);

  return {
    connectionStatus,
    createCanvas,
    renameCanvas,
    deleteCanvas,
    createElement,
    updateElement,
    deleteElement,
    convertToIssue,
  };
};
