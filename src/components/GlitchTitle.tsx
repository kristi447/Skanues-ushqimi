import { useEffect, useState, type CSSProperties } from 'react';
import { randomGlyph } from '../lib/glyphs';

interface Burst {
  line: number;
  top: number;
  height: number;
  shift: number;
  swap: number;
  glyph: string;
}

/**
 * The title, permanently unstable: a CSS layer flickers and slices the text on
 * irregular loops, while a JS layer fires random heavier bursts (displaced bands,
 * corrupted letters). Pure transform/clip/opacity, so it never stutters.
 */
export function GlitchTitle({ lines }: { lines: string[] }) {
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (ms: number) => {
      timer = setTimeout(fire, ms);
    };
    const fire = () => {
      const line = (Math.random() * lines.length) | 0;
      const top = Math.random() * 80;
      setBurst({
        line,
        top,
        height: 6 + Math.random() * 22,
        shift: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 16),
        swap: Math.random() < 0.55 ? (Math.random() * lines[line].length) | 0 : -1,
        glyph: randomGlyph(),
      });
      timer = setTimeout(
        () => {
          setBurst(null);
          // Sometimes a quick double-hit, otherwise a calm gap.
          schedule(Math.random() < 0.3 ? 70 + Math.random() * 120 : 1400 + Math.random() * 3200);
        },
        70 + Math.random() * 170,
      );
    };
    schedule(900);
    return () => clearTimeout(timer);
  }, [lines]);

  return (
    <h1 className="gtitle" aria-label={lines.join(' ')}>
      {lines.map((line, i) => {
        const hit = burst?.line === i ? burst : null;
        const text =
          hit && hit.swap >= 0 && line[hit.swap] !== ' '
            ? line.slice(0, hit.swap) + hit.glyph + line.slice(hit.swap + 1)
            : line;
        const style = hit
          ? ({
              '--bt': `${hit.top}%`,
              '--bb': `${Math.max(0, 100 - hit.top - hit.height)}%`,
              '--bx': `${hit.shift}px`,
            } as CSSProperties)
          : undefined;
        return (
          <span key={i} className={`gtitle__line${hit ? ' is-burst' : ''}`} style={style} aria-hidden>
            <span className="gtitle__text" data-text={text}>
              {text}
            </span>
          </span>
        );
      })}
    </h1>
  );
}
