import { describe, expect, it } from 'vitest';
import { isWindowOpen, msUntil, splitDuration } from './time';

const at = (h: number, m = 0, s = 0) => new Date(2026, 9, 18, h, m, s);
const OPEN = 20 * 60;
const CLOSE = 21 * 60;

describe('isWindowOpen', () => {
  it('is open from 20:00 up to but not including 21:00', () => {
    expect(isWindowOpen(at(19, 59, 59), OPEN, CLOSE)).toBe(false);
    expect(isWindowOpen(at(20, 0), OPEN, CLOSE)).toBe(true);
    expect(isWindowOpen(at(20, 59, 59), OPEN, CLOSE)).toBe(true);
    expect(isWindowOpen(at(21, 0), OPEN, CLOSE)).toBe(false);
  });

  it('handles windows that cross midnight', () => {
    expect(isWindowOpen(at(23, 30), 23 * 60, 60)).toBe(true);
    expect(isWindowOpen(at(0, 30), 23 * 60, 60)).toBe(true);
    expect(isWindowOpen(at(1, 0), 23 * 60, 60)).toBe(false);
  });
});

describe('msUntil', () => {
  it('counts down to today when before opening', () => {
    expect(splitDuration(msUntil(at(18, 30), OPEN))).toEqual({ h: 1, m: 30, s: 0 });
  });

  it('rolls over to tomorrow after the window', () => {
    expect(splitDuration(msUntil(at(21, 0, 1), OPEN))).toEqual({ h: 22, m: 59, s: 59 });
  });
});
