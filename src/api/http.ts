import { config } from '../config';
import { decryptText, deriveFromCode, encryptText } from './crypto';
import type { Backend, ChatMessage, Member, Room, RoomEvents, Session } from './types';

// Adapter for the real backend. The contract it expects is documented in README.md
// ("Backend contract"); adjust the paths/fields here if your server differs.

interface WireMessage {
  id: string;
  senderId: string;
  ciphertext: string;
  sentAt: number;
}

type ServerEvent =
  | { type: 'history'; messages: WireMessage[] }
  | { type: 'message'; message: WireMessage }
  | { type: 'members'; members: Member[] }
  | { type: 'presence'; memberId: string; online: boolean }
  | { type: 'ack'; clientId: string; message: WireMessage };

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(String(body.error || body.message || `HTTP ${res.status}`), res.status);
  return body as T;
}

export function createHttpBackend(): Backend {
  // The message key lives only in memory; it is re-derived from the code on every visit.
  let key: CryptoKey | null = null;

  const open = async (m: WireMessage): Promise<ChatMessage> => {
    let text: string;
    try {
      text = key ? await decryptText(key, m.ciphertext) : '[NO KEY]';
    } catch {
      text = '[UNDECRYPTABLE PAYLOAD]';
    }
    return { id: m.id, senderId: m.senderId, text, sentAt: m.sentAt, status: 'sent' };
  };

  return {
    async verifyCode(code) {
      const derived = await deriveFromCode(code);
      try {
        const { ticket } = await api<{ ticket: string }>('/auth/verify', {
          method: 'POST',
          body: JSON.stringify({ proof: derived.proof }),
        });
        key = derived.key;
        return { ok: true, ticket };
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return { ok: false, message: 'INVALID ACCESS CODE' };
        }
        if (err instanceof ApiError && err.status === 423) {
          return { ok: false, message: 'CHANNEL CLOSED' };
        }
        return { ok: false, message: 'NO CARRIER — SERVER UNREACHABLE' };
      }
    },

    register(ticket, nickname, avatarId) {
      return api<Session>('/users', {
        method: 'POST',
        body: JSON.stringify({ ticket, nickname, avatarId }),
      });
    },

    resume(ticket, session) {
      return api<Session>('/sessions/resume', { method: 'POST', body: JSON.stringify({ ticket }) }, session.token);
    },

    listRooms(session) {
      return api<Room[]>('/rooms', {}, session.token);
    },

    joinRoom(session, roomId, events: RoomEvents) {
      let ws: WebSocket | null = null;
      let closed = false;
      let retry = 0;
      let retryTimer: ReturnType<typeof setTimeout> | undefined;
      const pending = new Map<string, (m: ChatMessage) => void>();

      const connect = () => {
        events.onStatus('connecting');
        const url = new URL(config.wsUrl);
        url.searchParams.set('token', session.token);
        url.searchParams.set('room', roomId);
        ws = new WebSocket(url);

        ws.onopen = () => {
          retry = 0;
          events.onStatus('live');
        };
        ws.onmessage = async (ev) => {
          let data: ServerEvent;
          try {
            data = JSON.parse(ev.data);
          } catch {
            return;
          }
          switch (data.type) {
            case 'history':
              events.onHistory(await Promise.all(data.messages.map(open)));
              break;
            case 'message':
              if (data.message.senderId !== session.user.id) events.onMessage(await open(data.message));
              break;
            case 'members':
              events.onMembers(data.members);
              break;
            case 'presence':
              events.onPresence(data.memberId, data.online);
              break;
            case 'ack': {
              const resolve = pending.get(data.clientId);
              pending.delete(data.clientId);
              resolve?.(await open(data.message));
              break;
            }
          }
        };
        ws.onclose = () => {
          if (closed) return;
          events.onStatus('lost');
          retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 15000));
        };
      };
      connect();

      return {
        async send(text) {
          if (!key) throw new Error('NO KEY');
          if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('LINK DOWN');
          const clientId = crypto.randomUUID();
          const ciphertext = await encryptText(key, text);
          return new Promise<ChatMessage>((resolve, reject) => {
            pending.set(clientId, resolve);
            ws!.send(JSON.stringify({ type: 'send', clientId, ciphertext }));
            setTimeout(() => {
              if (pending.delete(clientId)) reject(new Error('TIMEOUT'));
            }, 10000);
          });
        },
        close() {
          closed = true;
          clearTimeout(retryTimer);
          ws?.close();
        },
      };
    },
  };
}
