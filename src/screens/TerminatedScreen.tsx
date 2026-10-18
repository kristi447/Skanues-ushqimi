import { useEffect, useRef } from 'react';
import { DecodeText } from '../components/DecodeText';
import { config } from '../config';
import { formatMinutes } from '../lib/time';
import '../styles/terminated.css';

/** Shown when the window closes mid-session: a notice, then a CRT power-down. */
export function TerminatedScreen({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => done.current(), 3400);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="screen terminated">
      <div className="terminated__tube">
        <DecodeText className="terminated__title" text="CONNECTION TERMINATED" duration={700} />
        <DecodeText
          className="terminated__sub"
          text={`CHANNEL CLOSED AT ${formatMinutes(config.closeAt)} · SEE YOU TOMORROW NIGHT`}
          duration={800}
          delay={300}
        />
      </div>
    </main>
  );
}
