import { useEffect, useState } from 'react';

/** Faint system log that types itself out, line by line. */
export function BootLog({ lines, speed = 22 }: { lines: string[]; speed?: number }) {
  const [chars, setChars] = useState(0);
  const total = lines.reduce((n, l) => n + l.length + 1, 0);

  useEffect(() => {
    if (chars >= total) return;
    const nextIsBreak = (() => {
      let n = chars;
      for (const l of lines) {
        if (n === l.length) return true;
        n -= l.length + 1;
        if (n < 0) return false;
      }
      return false;
    })();
    const t = setTimeout(() => setChars((c) => c + 1), nextIsBreak ? 260 : speed);
    return () => clearTimeout(t);
  }, [chars, total, lines, speed]);

  let left = chars;
  return (
    <pre className="bootlog" aria-hidden>
      {lines.map((line, i) => {
        const shown = line.slice(0, Math.max(0, left));
        const typing = (left >= 0 && left <= line.length) || (i === lines.length - 1 && chars >= total);
        left -= line.length + 1;
        if (!shown && !typing) return null;
        return (
          <span key={i} className="bootlog__line">
            {shown}
            {typing && <span className="blink">_</span>}
            {'\n'}
          </span>
        );
      })}
    </pre>
  );
}
