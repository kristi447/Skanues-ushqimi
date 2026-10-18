import { useLayoutEffect, useRef } from 'react';
import { randomGlyph } from '../lib/glyphs';

/**
 * Text that resolves out of random glyphs, left to right. Time-based, and the final
 * text is always written at the end (or immediately when motion is reduced).
 */
export function DecodeText({
  text,
  duration = 600,
  delay = 0,
  className,
}: {
  text: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || !text) return;
    // Mutate React's own text node in place (same length, monospace) so layout never
    // jumps and React stays in sync with the DOM.
    if (!(host.firstChild instanceof Text)) host.textContent = text;
    const el = host.firstChild as Text;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.nodeValue = text;
      return;
    }
    let raf = 0;
    let lastPaint = 0;
    const start = performance.now() + delay;
    const render = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      if (p >= 1) {
        el.nodeValue = text;
        return;
      }
      raf = requestAnimationFrame(render);
      if (t - lastPaint < 45) return;
      lastPaint = t;
      const solved = Math.floor(text.length * p);
      let out = text.slice(0, solved);
      for (let i = solved; i < text.length; i++) {
        const ch = text[i];
        out += ch === ' ' || ch === '\n' ? ch : t < start ? ' ' : randomGlyph();
      }
      el.nodeValue = out;
    };
    render(performance.now()); // paint the scrambled state before the browser shows the final text
    const done = setTimeout(() => (el.nodeValue = text), delay + duration + 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
      el.nodeValue = text;
    };
  }, [text, duration, delay]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}
