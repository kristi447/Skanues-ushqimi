import { useEffect, useRef, useState } from 'react';
import { DecodeText } from '../components/DecodeText';
import { SignalNoise } from '../components/SignalNoise';
import { BODY, COLS, KEYHOLE, LIFT, SHACKLE, TUCK, cellsOf, type Cell } from './lockArt';
import '../styles/unlock.css';

// Timeline (ms). Everything is derived from elapsed time, so dropped frames
// never desync the sequence, and a hard fallback timer guarantees completion.
const T = {
  materialize: 700,
  scan: 1750,
  turn: 2200,
  lift: 2800,
  grant: 3500,
  exit: 4000,
};

type Phase = 'decrypt' | 'turn' | 'lift' | 'grant' | 'exit';

const ROWS = LIFT + (SHACKLE.length - TUCK) + BODY.length;
const BODY_TOP = LIFT + SHACKLE.length - TUCK;
const SHACKLE_TOP = BODY_TOP - (SHACKLE.length - TUCK);
const KEY_GLYPHS = ['|', '/', '-', '-'];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (x: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function UnlockScreen({ operative, onDone }: { operative?: string; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [phase, setPhase] = useState<Phase>('decrypt');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reduced ? 0.5 : 1;
    const total = T.exit * speed;

    let finished = false;
    let raf = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      onDoneRef.current();
    };
    const fallback = setTimeout(finish, total + 1600);
    if (!canvas || !ctx) {
      setPhase('grant');
      const t = setTimeout(finish, 1200);
      return () => {
        clearTimeout(t);
        clearTimeout(fallback);
      };
    }

    const shackle = cellsOf(SHACKLE);
    const body = cellsOf(BODY);
    let F = 18;
    let cellW = 10;
    let rowH = 18;
    let pad = 18;
    let current: Phase = 'decrypt';
    let lastScramble = 0;
    let start = 0;

    const layout = () => {
      ctx.font = '100px VT323, monospace';
      const k = (ctx.measureText('0').width / 100) * 1.32;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = Math.min(vw - 48, 340);
      const maxH = vh * 0.5;
      F = Math.max(10, Math.min(26, maxW / (COLS * k), maxH / (ROWS * 1.02)));
      cellW = F * k;
      rowH = F * 1.02;
      pad = Math.ceil(F * 0.9);
      const w = COLS * cellW + pad * 2;
      const h = ROWS * rowH + pad * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
    };

    const setPhaseOnce = (p: Phase) => {
      if (p !== current) {
        current = p;
        setPhase(p);
      }
    };

    const intensity = (c: Cell, gridRow: number, t: number) => {
      const pMat = t / (T.materialize * speed);
      if (pMat < c.reveal) return 0;
      let a = c.base * 0.86;
      if (pMat - c.reveal < 0.12) a = 1.5; // flash as it appears

      // Scan line sweeping down the lock while the key is checked.
      if (t > T.materialize * speed && t < T.scan * speed) {
        const p = (t - T.materialize * speed) / ((T.scan - T.materialize) * speed);
        const scanRow = -2 + p * (ROWS + 4);
        a += Math.max(0, 1 - Math.abs(gridRow - scanRow) / 1.4) * 0.7;
      }

      // Shockwave out of the keyhole as the key turns.
      if (t > T.scan * speed && t < (T.turn + 500) * speed) {
        const radius = ((t - T.scan * speed) / (450 * speed)) * 9;
        const dx = c.col - KEYHOLE.col;
        const dy = ((gridRow - BODY_TOP - KEYHOLE.row) * rowH) / cellW;
        const d = Math.hypot(dx, dy);
        a += Math.max(0, 1 - Math.abs(d - radius) / 2.4) * 0.9;
      }

      // Surge when access is granted, settling to a steady bright hum.
      if (t > T.lift * speed) {
        const p = clamp01((t - T.lift * speed) / ((T.grant - T.lift) * speed));
        a = Math.max(a, 0.95) + (1 - p) * 0.8;
      }
      return a;
    };

    const draw = (cell: Cell, x: number, y: number, a: number) => {
      if (a <= 0.01) return;
      ctx.fillStyle = a > 1.25 ? 'rgba(214,255,224,1)' : `rgba(66,255,104,${Math.min(1, a).toFixed(3)})`;
      ctx.fillText(cell.bit, x, y);
    };

    const frame = (now: number) => {
      if (finished) return;
      const t = now - start;
      if (t >= total) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);

      if (t < T.scan * speed) setPhaseOnce('decrypt');
      else if (t < T.turn * speed) setPhaseOnce('turn');
      else if (t < T.lift * speed) setPhaseOnce('lift');
      else if (t < T.grant * speed) setPhaseOnce('grant');
      else setPhaseOnce('exit');

      const progress = clamp01(t / (T.turn * speed));
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      if (pctRef.current) pctRef.current.textContent = `${String(Math.round(progress * 100)).padStart(3, '0')}%`;

      // Bits keep mutating; they slow down and lock in once access is granted.
      const settled = t > T.grant * speed;
      const interval = t > T.lift * speed ? 160 : 70;
      if (!settled && now - lastScramble > interval) {
        lastScramble = now;
        const rate = t > T.lift * speed ? 0.08 : 0.22;
        for (const c of shackle) if (Math.random() < rate) c.bit = c.bit === '0' ? '1' : '0';
        for (const c of body) if (Math.random() < rate) c.bit = c.bit === '0' ? '1' : '0';
      }

      const w = COLS * cellW + pad * 2;
      const h = ROWS * rowH + pad * 2;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${F}px VT323, monospace`;

      // Mechanical jolt as the key turns.
      let ox = 0;
      let oy = 0;
      if (!reduced && t > T.scan * speed && t < (T.scan + 260) * speed) {
        const k = 1 - (t - T.scan * speed) / (260 * speed);
        ox = (Math.random() - 0.5) * F * 0.35 * k;
        oy = (Math.random() - 0.5) * F * 0.2 * k;
      }

      const lift = -LIFT * rowH * easeOutBack(clamp01((t - T.turn * speed) / ((T.lift - T.turn) * speed)));
      const half = cellW / 2;

      // The shackle is clipped at the body's top edge, so its tucked legs stay hidden
      // until it lifts clear (no opaque slab, which would glow as a box).
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, pad + BODY_TOP * rowH + oy - rowH * 0.08);
      ctx.clip();
      for (const c of shackle) {
        const gridRow = SHACKLE_TOP + c.row;
        draw(c, pad + c.col * cellW + half + ox, pad + gridRow * rowH + lift + oy, intensity(c, gridRow, t));
      }
      ctx.restore();

      for (const c of body) {
        const gridRow = BODY_TOP + c.row;
        draw(c, pad + c.col * cellW + half + ox, pad + gridRow * rowH + oy, intensity(c, gridRow, t));
      }

      // The key itself, turning in the keyhole.
      if (t > T.materialize * speed) {
        const turnP = clamp01((t - T.scan * speed) / ((T.turn - T.scan) * speed));
        const glyph = KEY_GLYPHS[Math.min(KEY_GLYPHS.length - 1, Math.floor(turnP * KEY_GLYPHS.length))];
        const bright = t > T.scan * speed ? 1 : 0.35 + 0.25 * Math.sin(t / 120);
        ctx.fillStyle = bright >= 1 ? 'rgba(214,255,224,1)' : `rgba(66,255,104,${bright.toFixed(3)})`;
        ctx.fillText(glyph, pad + KEYHOLE.col * cellW + half + ox, pad + (BODY_TOP + KEYHOLE.row - 0.5) * rowH + oy);
      }
    };

    let cancelled = false;
    const begin = () => {
      if (cancelled) return;
      layout();
      start = performance.now();
      raf = requestAnimationFrame(frame);
    };
    // Wait (briefly) for the terminal font so glyph metrics are right; never block on it.
    Promise.race([
      document.fonts?.load('20px VT323') ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 600)),
    ]).then(begin, begin);

    window.addEventListener('resize', layout);
    return () => {
      cancelled = true;
      finished = true;
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      window.removeEventListener('resize', layout);
    };
  }, []);

  const opened = phase === 'grant' || phase === 'exit';

  return (
    <main className={`screen unlock is-${phase}`}>
      <SignalNoise density={0.6} />
      <div className="unlock__stage">
        <div className="unlock__frame">
          <canvas ref={canvasRef} className="unlock__canvas" aria-hidden />
          <span className="unlock__corner unlock__corner--tl" />
          <span className="unlock__corner unlock__corner--tr" />
          <span className="unlock__corner unlock__corner--bl" />
          <span className="unlock__corner unlock__corner--br" />
        </div>

        <div className="unlock__readout" role="status" aria-live="polite">
          {opened ? (
            <>
              <DecodeText className="unlock__granted" text="ACCESS GRANTED" duration={520} />
              <DecodeText
                className="unlock__sub"
                text={operative ? `WELCOME BACK, ${operative.toUpperCase()}` : 'NEW OPERATIVE · IDENTITY SETUP'}
                duration={600}
                delay={180}
              />
            </>
          ) : (
            <>
              <div className="unlock__row">
                <span>
                  {phase === 'decrypt' ? 'DECRYPTING KEY' : phase === 'turn' ? 'KEY ACCEPTED' : 'RELEASING LOCK'}
                </span>
                <span ref={pctRef}>000%</span>
              </div>
              <div className="unlock__bar">
                <div ref={barRef} className="unlock__bar-fill" />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
