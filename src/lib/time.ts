export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** True when `now` is inside [openAt, closeAt). Handles windows that cross midnight. */
export function isWindowOpen(now: Date, openAt: number, closeAt: number): boolean {
  const m = minutesOfDay(now);
  return openAt <= closeAt ? m >= openAt && m < closeAt : m >= openAt || m < closeAt;
}

/** Milliseconds until the next moment the clock reads `openAt`. */
export function msUntil(now: Date, at: number): number {
  const target = new Date(now);
  target.setHours(Math.floor(at / 60), at % 60, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export function splitDuration(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatClock(d: Date, withSeconds = true): string {
  const base = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad2(d.getSeconds())}` : base;
}

export function formatMinutes(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60) % 24)}:${pad2(minutes % 60)}`;
}
