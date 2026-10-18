import { useSyncExternalStore } from 'react';

// One shared ticker for the whole app, aligned to wall-clock second boundaries
// so every clock on screen flips at the same instant.
let now = new Date();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function tick() {
  now = new Date();
  listeners.forEach((l) => l());
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) tick();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) clearTimeout(timer);
  };
}

export function useNow(): Date {
  return useSyncExternalStore(subscribe, () => now);
}
