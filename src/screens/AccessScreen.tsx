import { useEffect, useState } from 'react';
import { backend } from '../api';
import { BootLog } from '../components/BootLog';
import { DecodeText } from '../components/DecodeText';
import { GlitchTitle } from '../components/GlitchTitle';
import { SignalNoise } from '../components/SignalNoise';
import { Spinner } from '../components/Spinner';
import { TerminalInput } from '../components/TerminalInput';
import { config } from '../config';
import { load, remove, save } from '../lib/storage';
import { pad2 } from '../lib/time';
import { useNow } from '../lib/useNow';
import '../styles/access.css';

const TITLE = ['The Preca', 'Underground'];
const BOOT = [
  '[ OK ] carrier detected',
  '[ OK ] handshake 0x7F3A..ok',
  '[ OK ] cipher suite AES-256-GCM',
  '[ .. ] awaiting credentials',
];
const LOCK_KEY = 'pu.lockout';

type Status = { kind: 'idle' } | { kind: 'checking' } | { kind: 'denied'; message: string } | { kind: 'granted' };

export function AccessScreen({ onGranted }: { onGranted: (ticket: string) => void }) {
  const now = useNow();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [fails, setFails] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(() => load<number>(LOCK_KEY) ?? 0);

  const lockLeft = Math.max(0, Math.ceil((lockedUntil - now.getTime()) / 1000));
  const locked = lockLeft > 0;
  const busy = status.kind === 'checking' || status.kind === 'granted';

  useEffect(() => {
    if (!locked && lockedUntil) {
      remove(LOCK_KEY);
      setLockedUntil(0);
      setFails(0);
    }
  }, [locked, lockedUntil]);

  const submit = async () => {
    if (busy || locked) return;
    if (!code.trim()) {
      setStatus({ kind: 'denied', message: 'NO CODE ENTERED' });
      setShakeKey((k) => k + 1);
      return;
    }
    setStatus({ kind: 'checking' });
    const result = await backend.verifyCode(code);
    if (result.ok) {
      setStatus({ kind: 'granted' });
      setTimeout(() => onGranted(result.ticket), 650);
      return;
    }
    const n = fails + 1;
    setFails(n);
    setCode('');
    setShakeKey((k) => k + 1);
    if (n >= config.maxCodeAttempts) {
      const until = Date.now() + config.lockoutSeconds * 1000;
      save(LOCK_KEY, until);
      setLockedUntil(until);
      setStatus({ kind: 'denied', message: 'TOO MANY ATTEMPTS' });
    } else {
      const left = config.maxCodeAttempts - n;
      setStatus({ kind: 'denied', message: `${result.message} · ${left} ${left === 1 ? 'TRY' : 'TRIES'} LEFT` });
    }
  };

  const tone = status.kind === 'denied' || locked ? 'error' : status.kind === 'granted' ? 'ok' : 'idle';

  return (
    <main className="screen access">
      <SignalNoise />
      <BootLog lines={BOOT} />

      <section className="access__center">
        <GlitchTitle lines={TITLE} />
        <p className="access__sub">
          <span className="access__sub-rule" />
          PRIVATE RELAY · BY INVITATION ONLY
          <span className="access__sub-rule" />
        </p>

        <form
          className="access__form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div key={shakeKey} className="access__field">
            <TerminalInput
              label="Access code"
              name="access-code"
              value={code}
              onChange={(v) => {
                setCode(v);
                if (status.kind === 'denied' && !locked) setStatus({ kind: 'idle' });
              }}
              onSubmit={submit}
              uppercase
              maxLength={20}
              autoFocus
              disabled={busy || locked}
              tone={tone}
              placeholder="ENTER CODE"
            />
          </div>

          <div className={`access__status access__status--${tone}`} role="status" aria-live="polite">
            {locked ? (
              <>
                <span>TERMINAL LOCKED</span>
                <span className="access__detail">RETRY IN 00:{pad2(lockLeft)}</span>
              </>
            ) : status.kind === 'checking' ? (
              <span>
                <Spinner /> AUTHENTICATING
              </span>
            ) : status.kind === 'granted' ? (
              <DecodeText text="ACCESS GRANTED" duration={420} />
            ) : status.kind === 'denied' ? (
              <>
                <DecodeText text="ACCESS DENIED" duration={300} />
                <span className="access__detail">{status.message}</span>
              </>
            ) : (
              <span className="access__hint">PRESS ENTER TO CONNECT</span>
            )}
          </div>

          <button className="btn access__btn" type="submit" disabled={busy || locked}>
            Connect
          </button>
        </form>
      </section>

      <footer className="access__foot">
        <span>END-TO-END ENCRYPTED</span>
        <span>UNAUTHORIZED ACCESS IS LOGGED</span>
      </footer>
    </main>
  );
}
