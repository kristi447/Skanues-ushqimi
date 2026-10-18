import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { hash01, randomGlyph } from '../lib/glyphs';
import { useTerminalCaret } from './useTerminalCaret';

/** One typed character. With `live`, it resolves out of noise and keeps a faint flicker. */
function Glyph({ ch, index, live }: { ch: string; index: number; live: boolean }) {
  const [shown, setShown] = useState(live ? randomGlyph() : ch);

  useEffect(() => {
    if (!live) {
      setShown(ch);
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n >= 3) {
        setShown(ch);
        clearInterval(id);
      } else setShown(randomGlyph());
    }, 45);
    return () => clearInterval(id);
  }, [ch, live]);

  if (!live) return <>{ch}</>;
  const style = {
    '--fd': `${(-hash01(index) * 4).toFixed(2)}s`,
    '--fdur': `${(2.4 + hash01(index + 11) * 2.8).toFixed(2)}s`,
  } as CSSProperties;
  return (
    <span className="fl" style={style}>
      {shown}
    </span>
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  label: string;
  maxLength?: number;
  /** Letters resolve out of noise and flicker slightly. */
  flicker?: boolean;
  uppercase?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  tone?: 'idle' | 'error' | 'ok';
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  name?: string;
}

/** A single-line terminal field: native input underneath, our own glyphs + block cursor on top. */
export function TerminalInput({
  value,
  onChange,
  onSubmit,
  label,
  maxLength = 24,
  flicker = false,
  uppercase = false,
  disabled = false,
  autoFocus = false,
  placeholder,
  tone = 'idle',
  inputMode,
  name,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const { caret, focused, sync, bump, handlers, cursorClass } = useTerminalCaret(ref);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    // Delay so the focus (and phone keyboard) lands after the screen's entry animation.
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 380);
    return () => clearTimeout(t);
  }, [autoFocus, disabled]);

  const at = Math.min(caret, value.length);
  const cells = Array.from(value).map((ch, i) => <Glyph key={`${i}:${ch}`} ch={ch} index={i} live={flicker} />);
  const cursor = (
    <span key="cursor" className={cursorClass}>
      {at < value.length ? value[at] : ' '}
    </span>
  );
  if (!disabled) {
    if (at < value.length) cells.splice(at, 1, cursor);
    else cells.push(cursor);
  }

  return (
    <label className={`tfield tfield--${tone}${focused ? ' is-focused' : ''}${disabled ? ' is-disabled' : ''}`}>
      <span className="tfield__label label">{label}</span>
      <span className="tfield__frame">
        <span className="tfield__prompt" aria-hidden>
          &gt;
        </span>
        <span className="tfield__box">
          <input
            ref={ref}
            className="tfield__input"
            name={name}
            value={value}
            maxLength={maxLength}
            disabled={disabled}
            inputMode={inputMode}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize={uppercase ? 'characters' : 'off'}
            spellCheck={false}
            enterKeyHint="go"
            aria-label={label}
            onChange={(e) => {
              onChange(uppercase ? e.target.value.toUpperCase() : e.target.value);
              bump();
              sync();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit?.();
              }
            }}
            {...handlers}
          />
          <span className="tfield__mirror" aria-hidden>
            {value.length === 0 && placeholder && !focused ? <span className="tfield__ph">{placeholder}</span> : cells}
          </span>
        </span>
      </span>
    </label>
  );
}
