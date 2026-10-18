const env = import.meta.env;

/** Parses "HH:MM" into minutes since midnight. */
function parseClock(value: string | undefined, fallback: string): number {
  const [h, m] = (value || fallback).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return parseClock(fallback, fallback);
  return h * 60 + m;
}

export const config = {
  appName: 'The Preca Underground',
  roomName: env.VITE_ROOM_NAME || 'mainframe',
  /** Nightly window in local device time, minutes since midnight. */
  openAt: parseClock(env.VITE_OPEN_AT, '20:00'),
  closeAt: parseClock(env.VITE_CLOSE_AT, '21:00'),
  backend: (env.VITE_BACKEND || 'mock') as 'mock' | 'http',
  apiUrl: env.VITE_API_URL || 'http://localhost:3000',
  wsUrl: env.VITE_WS_URL || 'ws://localhost:3000/ws',
  mockCode: env.VITE_MOCK_CODE || 'UNDERGROUND',
  nickname: { min: 3, max: 16, pattern: /^[A-Za-z0-9_.-]+$/ },
  maxCodeAttempts: 3,
  lockoutSeconds: 30,
};
