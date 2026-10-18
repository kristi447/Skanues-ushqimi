/** Scanlines, vignette, faint refresh flicker and an optional rolling scan band. */
export function CrtOverlay({ roll = true }: { roll?: boolean }) {
  return (
    <div className="crt" aria-hidden>
      {roll && <div className="crt__roll" />}
      <div className="crt__scan" />
      <div className="crt__vignette" />
      <div className="crt__flicker" />
    </div>
  );
}
