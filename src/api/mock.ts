import { avatars } from '../avatars';
import { config } from '../config';
import type { Backend, ChatMessage, Member, RoomEvents, Session } from './types';

// Offline stand-in for the real server, so the whole flow can be designed and tested.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const avatarAt = (i: number) => avatars[i % Math.max(avatars.length, 1)]?.id ?? '';

const CREW: Member[] = [
  { id: 'm-ghost', nickname: 'ghost_99', avatarId: avatarAt(1), online: true },
  { id: 'm-nova', nickname: 'n0va', avatarId: avatarAt(0), online: true },
  { id: 'm-cipher', nickname: 'cipher', avatarId: avatarAt(3), online: false },
  { id: 'm-root', nickname: 'r00t_kid', avatarId: avatarAt(2), online: true },
  { id: 'm-zero', nickname: 'zer0day', avatarId: avatarAt(4), online: false },
];

const CHATTER = [
  'anyone get past level 4 of the CTF?',
  'patched the overflow. three hours. worth it.',
  'who is still running windows in here',
  'reminder: nothing said here leaves this channel',
  'my compiler hates me tonight',
  'found a cleaner regex for that parser, will share tomorrow',
  'tunnel is up. latency is fine.',
  'brb, recompiling',
  'that physics homework was basically a hash function',
  '0xDEADBEEF',
  'aGVsbG8gd29ybGQ=',
  'sleep is a deprecated feature',
  'who wrote the bot that only answers in base64',
  'rolled my own crypto for fun. do not use it. ever.',
  'lol',
  'quiet night on the wire',
];

const HISTORY: Array<[string, string, number]> = [
  ['m-ghost', 'link is up. who is on tonight?', 14],
  ['m-root', 'here. keyboard still warm from the last session', 13],
  ['m-nova', 'present', 12],
  ['m-ghost', 'new rule: aliases only. no real names in here.', 9],
  ['m-root', 'obviously', 9],
  ['m-nova', 'anyone tried the cipher i dropped yesterday?', 4],
];

const pick = <T>(list: T[]) => list[(Math.random() * list.length) | 0];

export function createMockBackend(): Backend {
  const crew = CREW.map((m) => ({ ...m }));

  return {
    async verifyCode(code) {
      await wait(1100);
      if (code.trim().toUpperCase() === config.mockCode.toUpperCase()) {
        return { ok: true, ticket: `t-${uid()}` };
      }
      return { ok: false, message: 'INVALID ACCESS CODE' };
    },

    async register(_ticket, nickname, avatarId) {
      await wait(900);
      if (crew.some((m) => m.nickname.toLowerCase() === nickname.toLowerCase())) {
        throw new Error('ALIAS ALREADY TAKEN');
      }
      return { token: `s-${uid()}`, user: { id: `me-${uid()}`, nickname, avatarId, online: true } };
    },

    async resume(_ticket, session: Session) {
      await wait(300);
      return session;
    },

    async listRooms() {
      await wait(350);
      return [{ id: 'main', name: config.roomName, online: crew.filter((m) => m.online).length + 1 }];
    },

    joinRoom(session, _roomId, events: RoomEvents) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      let closed = false;
      const later = (fn: () => void, ms: number) => timers.push(setTimeout(() => !closed && fn(), ms));

      events.onStatus('connecting');
      later(() => {
        events.onMembers([...crew, session.user]);
        const now = Date.now();
        events.onHistory(
          HISTORY.map(([senderId, text, minsAgo], i) => ({
            id: `h-${i}`,
            senderId,
            text,
            sentAt: now - minsAgo * 60_000,
            status: 'sent',
          })),
        );
        events.onStatus('live');
      }, 700);

      const chatter = () => {
        const online = crew.filter((m) => m.online);
        if (online.length) {
          events.onMessage({
            id: `m-${uid()}`,
            senderId: pick(online).id,
            text: pick(CHATTER),
            sentAt: Date.now(),
            status: 'sent',
          });
        }
        later(chatter, 7000 + Math.random() * 9000);
      };
      later(chatter, 4500);

      const presence = () => {
        const m = pick(crew);
        m.online = !m.online;
        events.onPresence(m.id, m.online);
        later(presence, 15000 + Math.random() * 20000);
      };
      later(presence, 12000);

      return {
        async send(text) {
          await wait(220 + Math.random() * 200);
          const msg: ChatMessage = {
            id: `m-${uid()}`,
            senderId: session.user.id,
            text,
            sentAt: Date.now(),
            status: 'sent',
          };
          return msg;
        },
        close() {
          closed = true;
          timers.forEach(clearTimeout);
        },
      };
    },
  };
}
