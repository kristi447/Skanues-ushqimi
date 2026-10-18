import { useEffect, useRef } from 'react';

interface Streak {
  x: number;
  y: number;
  w: number;
  h: number;
  born: number;
  life: number;
  peak: number;
}

/**
 * Horizontal interference streaks drifting across a black field, like a
 * signal that is not quite locked. Canvas, time-based, ~30fps, pauses when hidden.
 */
export function SignalNoise({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let band = Math.random();
    let bandUntil = 0;
    const streaks: Streak[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (t: number) => {
      // Streaks cluster around a wandering "bad line" band, with some strays.
      const clustered = Math.random() < 0.6;
      const y = clustered ? (band + (Math.random() - 0.5) * 0.12) * h : Math.random() * h;
      const long = Math.random() < 0.12;
      streaks.push({
        x: Math.random() * w * 1.1 - w * 0.05,
        y: Math.round(y),
        w: long ? w * (0.25 + Math.random() * 0.5) : 6 + Math.random() * 70,
        h: Math.random() < 0.8 ? 1 : 2,
        born: t,
        life: 120 + Math.random() * 700,
        peak: 0.12 + Math.random() * (long ? 0.18 : 0.5),
      });
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;

      if (t > bandUntil) {
        band = Math.random();
        bandUntil = t + 900 + Math.random() * 2600;
      }
      const target = (reduced ? 6 : 34) * density;
      if (streaks.length < target) for (let i = 0; i < 3; i++) spawn(t);

      ctx.clearRect(0, 0, w, h);
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        const p = (t - s.born) / s.life;
        if (p >= 1) {
          streaks.splice(i, 1);
          continue;
        }
        // Quick on, flickering hold, fade out.
        const env = p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9;
        const a = s.peak * env * (0.7 + Math.random() * 0.3);
        ctx.fillStyle = `rgba(66,255,104,${a.toFixed(3)})`;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        if (s.peak > 0.4) {
          ctx.fillStyle = `rgba(66,255,104,${(a * 0.18).toFixed(3)})`;
          ctx.fillRect(s.x - 4, s.y - 2, s.w + 8, s.h + 4);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [density]);

  return <canvas ref={ref} className="noise" aria-hidden />;
}
