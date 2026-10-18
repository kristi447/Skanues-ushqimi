import type { ReactNode } from 'react';
import { DigitalClock } from './DigitalClock';
import { StatusDot } from './StatusDot';

/** Top bar: clock dead center, encryption badge beside it, optional side slots. */
export function StatusBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="sbar">
      <div className="sbar__side">{left}</div>
      <div className="sbar__center">
        <DigitalClock />
        <span className="sbar__enc">
          <StatusDot online />
          ENCRYPTED
        </span>
      </div>
      <div className="sbar__side sbar__side--r">{right}</div>
    </header>
  );
}
