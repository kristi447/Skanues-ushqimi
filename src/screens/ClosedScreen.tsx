import { useRef } from 'react';
import { config } from '../config';
import { formatMinutes, msUntil, pad2, splitDuration } from '../lib/time';
import { useNow } from '../lib/useNow';
import { SignalNoise } from '../components/SignalNoise';
import '../styles/closed.css';

/** Keeps an angle continuous across the 360→0 wrap so CSS transitions never spin backwards. */
function useUnwrapped(target: number) {
  const ref = useRef<number | null>(null);
  if (ref.current === null) ref.current = target;
  else ref.current += ((((target - ref.current) % 360) + 540) % 360) - 180;
  return ref.current;
}

function AnalogClock({ now }: { now: Date }) {
  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours() % 12;
  // Minute hand jumps once a minute (station-clock style); hour hand creeps.
  const minute = useUnwrapped(m * 6);
  const hour = useUnwrapped(h * 30 + m * 0.5);

  return (
    <svg className="aclock" viewBox="0 0 200 200" role="img" aria-label="Clock">
      <circle className="aclock__rim" cx="100" cy="100" r="97" />
      <circle className="aclock__rim aclock__rim--inner" cx="100" cy="100" r="91" />
      {Array.from({ length: 60 }, (_, i) => {
        const behind = (s - i + 60) % 60;
        const a = (i * 6 * Math.PI) / 180;
        const major = i % 5 === 0;
        const cls = behind === 0 ? 'is-now' : behind < 7 ? `is-trail t${behind}` : major ? 'is-major' : '';
        return (
          <circle
            key={i}
            className={`aclock__tick ${cls}`}
            cx={100 + Math.sin(a) * 84}
            cy={100 - Math.cos(a) * 84}
            r={behind === 0 ? 2.1 : major ? 1.5 : 0.9}
          />
        );
      })}
      <g className="aclock__hands">
        <line
          className="aclock__hand aclock__hand--h"
          x1="100"
          y1="108"
          x2="100"
          y2="54"
          style={{ transform: `rotate(${hour}deg)` }}
        />
        <line
          className="aclock__hand aclock__hand--m"
          x1="100"
          y1="112"
          x2="100"
          y2="28"
          style={{ transform: `rotate(${minute}deg)` }}
        />
      </g>
      <circle key={s} className="aclock__hub" cx="100" cy="100" r="4" />
    </svg>
  );
}

export function ClosedScreen() {
  const now = useNow();
  const { h, m, s } = splitDuration(msUntil(now, config.openAt));

  return (
    <main className="screen closed">
      <SignalNoise density={0.45} />

      <header className="closed__top">
        <span className="label">The Preca Underground</span>
        <span className="closed__state">
          <span className="closed__led" /> CHANNEL OFFLINE
        </span>
      </header>

      <section className="closed__center">
        <AnalogClock now={now} />

        <div className="closed__countdown" aria-live="off">
          <span className="label">Link opens in</span>
          <div className="closed__digits" role="timer" aria-label={`${h} hours ${m} minutes ${s} seconds`}>
            <span className="closed__unit">
              <b>{pad2(h)}</b>
              <small>HRS</small>
            </span>
            <span className="closed__sep">:</span>
            <span className="closed__unit">
              <b>{pad2(m)}</b>
              <small>MIN</small>
            </span>
            <span className="closed__sep">:</span>
            <span className="closed__unit">
              <b>{pad2(s)}</b>
              <small>SEC</small>
            </span>
          </div>
        </div>
      </section>

      <footer className="closed__foot">
        <span>
          WINDOW {formatMinutes(config.openAt)} — {formatMinutes(config.closeAt)} LOCAL
        </span>
        <span className="closed__await">
          &gt; awaiting carrier<span className="blink">_</span>
        </span>
      </footer>
    </main>
  );
}
