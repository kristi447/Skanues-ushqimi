import { useLayoutEffect, useRef, useState } from 'react';
import { useTerminalCaret } from '../components/useTerminalCaret';

const MAX_LEN = 2000;

/**
 * Message input. The native textarea renders the (green) text and handles every
 * keyboard/IME/selection detail; a mirror layer on top only paints the block cursor.
 */
export function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const { caret, focused, sync, bump, handlers, cursorClass } = useTerminalCaret(ref);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    if (mirrorRef.current) mirrorRef.current.scrollTop = el.scrollTop;
  }, [value]);

  const send = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    requestAnimationFrame(() => {
      sync();
      ref.current?.focus();
    });
  };

  const at = Math.min(caret, value.length);
  const ch = value[at];
  const onChar = ch !== undefined && ch !== '\n';

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <span className="composer__prompt" aria-hidden>
        &gt;
      </span>
      <div className="composer__field">
        <textarea
          ref={ref}
          className="composer__text"
          rows={1}
          value={value}
          maxLength={MAX_LEN}
          placeholder="transmit..."
          aria-label="Message"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          onChange={(e) => {
            setValue(e.target.value);
            bump();
            sync();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          onScroll={(e) => {
            if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          {...handlers}
        />
        <div ref={mirrorRef} className="composer__text composer__mirror" aria-hidden>
          {value.slice(0, at)}
          {(focused || value) && <span className={cursorClass}>{onChar ? ch : ' '}</span>}
          {value.slice(onChar ? at + 1 : at)}
          {'​'}
        </div>
      </div>
      <button className="composer__send" type="submit" disabled={disabled || !value.trim()} aria-label="Send">
        SEND
      </button>
    </form>
  );
}
