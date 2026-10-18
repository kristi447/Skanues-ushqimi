export function StatusDot({ online, tone = 'green' }: { online: boolean; tone?: 'green' | 'cyan' }) {
  return (
    <span
      className={`dot ${online ? `dot--on dot--${tone}` : 'dot--off'}`}
      role="img"
      aria-label={online ? 'online' : 'offline'}
    />
  );
}
