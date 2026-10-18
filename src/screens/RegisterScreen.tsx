import { useState } from 'react';
import { backend, type Session } from '../api';
import { avatars } from '../avatars';
import { DecodeText } from '../components/DecodeText';
import { Spinner } from '../components/Spinner';
import { StatusDot } from '../components/StatusDot';
import { TerminalInput } from '../components/TerminalInput';
import { config } from '../config';
import '../styles/register.css';

function validate(nick: string): string | null {
  const { min, max, pattern } = config.nickname;
  if (nick.length < min) return `ALIAS TOO SHORT · MIN ${min}`;
  if (nick.length > max) return `ALIAS TOO LONG · MAX ${max}`;
  if (!pattern.test(nick)) return 'ONLY A-Z 0-9 _ . - ALLOWED';
  return null;
}

export function RegisterScreen({ ticket, onDone }: { ticket: string; onDone: (s: Session) => void }) {
  const [nick, setNick] = useState('');
  const [avatarId, setAvatarId] = useState(avatars[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (busy) return;
    const problem = validate(nick) ?? (avatarId ? null : 'SELECT AN AVATAR');
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await backend.register(ticket, nick, avatarId);
      setDone(true);
      setTimeout(() => onDone(session), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message.toUpperCase() : 'REGISTRATION FAILED');
      setBusy(false);
    }
  };

  const selected = avatars.find((a) => a.id === avatarId);

  return (
    <main className="screen register">
      <div className="register__scroll">
        <header className="register__head">
          <span className="label">Identity // 01</span>
          <span className="label">New operative</span>
        </header>

        <h2 className="register__title">
          <DecodeText text="CREATE YOUR ALIAS" duration={700} />
        </h2>
        <p className="register__lede">No real names. Pick an alias and a mark. This is how the others will see you.</p>

        <form
          className="register__form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TerminalInput
            label="Alias"
            name="alias"
            value={nick}
            onChange={(v) => {
              setNick(v.replace(/\s/g, '_'));
              setError(null);
            }}
            onSubmit={submit}
            maxLength={config.nickname.max}
            flicker
            autoFocus
            disabled={busy}
            placeholder="choose_wisely"
            tone={error ? 'error' : done ? 'ok' : 'idle'}
          />
          <div className={`register__hint${error ? ' is-error' : ''}`} role="status" aria-live="polite">
            {error ?? `${config.nickname.min}-${config.nickname.max} CHARS · A-Z 0-9 _ . -`}
          </div>

          <fieldset className="register__avatars">
            <legend className="label">Select your mark</legend>
            <div className="register__grid" role="radiogroup" aria-label="Avatar">
              {avatars.map((a, i) => {
                const on = a.id === avatarId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`mark${on ? ' is-on' : ''}`}
                    onClick={() => setAvatarId(a.id)}
                    disabled={busy}
                  >
                    <span className="mark__img">
                      <img src={a.src} alt="" draggable={false} />
                      <span className="mark__scan" />
                    </span>
                    <span className="mark__meta">
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <span className="mark__name">{a.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="register__preview" aria-label="Preview">
            <span className="label">Preview</span>
            <div className="register__preview-row">
              {selected && <img className="register__preview-av" src={selected.src} alt="" />}
              <span className="register__preview-nick">{nick || 'alias'}</span>
              <StatusDot online />
            </div>
          </div>

          <button className="btn register__btn" type="submit" disabled={busy}>
            {busy ? (
              done ? (
                <DecodeText text="IDENTITY FORGED" duration={400} />
              ) : (
                <>
                  <Spinner /> Forging
                </>
              )
            ) : (
              'Initialize'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
