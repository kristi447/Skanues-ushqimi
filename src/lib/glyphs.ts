export const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\|{}[]';

export const randomGlyph = () => SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
export const randomBit = () => (Math.random() < 0.5 ? '0' : '1');

/** Stable pseudo-random number in [0,1) for an integer seed. */
export function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
