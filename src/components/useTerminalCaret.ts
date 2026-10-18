import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Tracks where the caret is in a native input/textarea so we can paint our own
 * block cursor there, and whether the user is mid-typing (solid) or idle (pulsing).
 */
export function useTerminalCaret(ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>) {
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const sync = useCallback(() => {
    const el = ref.current;
    if (el) setCaret(el.selectionStart ?? el.value.length);
  }, [ref]);

  const bump = useCallback(() => {
    setTyping(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setTyping(false), 550);
  }, []);

  useEffect(() => {
    const onSel = () => document.activeElement === ref.current && sync();
    document.addEventListener('selectionchange', onSel);
    return () => {
      document.removeEventListener('selectionchange', onSel);
      clearTimeout(idle.current);
    };
  }, [ref, sync]);

  const handlers = {
    onFocus: () => {
      setFocused(true);
      sync();
    },
    onBlur: () => setFocused(false),
    onSelect: sync,
    onKeyUp: sync,
    onClick: sync,
  };

  const cursorClass = `tcursor${focused ? '' : ' is-idle-unfocused'}${typing ? ' is-typing' : ''}`;

  return { caret, focused, typing, sync, bump, handlers, cursorClass };
}
