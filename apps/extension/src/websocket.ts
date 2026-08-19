import type { SubtitleEvent } from './types';
import { getSettings } from './content-settings';

type ConnectionState = 'connected' | 'disconnected' | 'connecting';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionState: ConnectionState = 'disconnected';

export function getConnectionState(): ConnectionState {
  return connectionState;
}

export async function sendEvent(event: SubtitleEvent): Promise<boolean> {
  const settings = getSettings();
  if (!settings.enabled) {
    return false;
  }

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    await connect();
  }

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(JSON.stringify(event));
  return true;
}

export async function connect(): Promise<void> {
  const settings = getSettings();
  const url = `ws://127.0.0.1:${settings.serverPort}`;

  if (socket?.readyState === WebSocket.OPEN) {
    return;
  }

  if (socket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  connectionState = 'connecting';

  await new Promise<void>((resolve) => {
    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        connectionState = 'connected';
        socket?.send(JSON.stringify({ type: 'ping' }));
        resolve();
      };

      socket.onclose = () => {
        connectionState = 'disconnected';
        scheduleReconnect();
        resolve();
      };

      socket.onerror = () => {
        connectionState = 'disconnected';
        resolve();
      };

      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data as string) as SubtitleEvent;
          if (payload.type === 'pong') {
            connectionState = 'connected';
          }
        } catch {
          // ignore malformed messages
        }
      };
    } catch {
      connectionState = 'disconnected';
      scheduleReconnect();
      resolve();
    }
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, 3000);
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  connectionState = 'disconnected';
}
