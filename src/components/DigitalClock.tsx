import { formatClock } from '../lib/time';
import { useNow } from '../lib/useNow';

export function DigitalClock({ seconds = true, className = '' }: { seconds?: boolean; className?: string }) {
  const now = useNow();
  return (
    <time className={`dclock ${className}`} dateTime={now.toISOString()}>
      {formatClock(now, seconds)}
    </time>
  );
}
