import { useEffect, useState } from 'react';

const FRAMES = ['|', '/', '-', '\\'];

export function Spinner() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % FRAMES.length), 90);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="spinner" aria-hidden>
      {FRAMES[i]}
    </span>
  );
}
