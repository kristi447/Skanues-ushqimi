import { useEffect } from 'react';

/**
 * Pins the app to the *visible* viewport. On phones the on-screen keyboard shrinks
 * the visual viewport without resizing the layout one (iOS), which would otherwise
 * hide the message box behind the keyboard.
 */
export function useViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;
    const update = () => {
      root.style.setProperty('--app-h', `${vv.height}px`);
      root.style.setProperty('--app-top', `${vv.offsetTop}px`);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}
