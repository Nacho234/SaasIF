import { useEffect } from 'react';

export interface ShortcutMap {
  /** Claves tipo "F2", "F4", "Escape", "Delete", "ctrl+k", "ctrl+enter". */
  [combo: string]: (event: KeyboardEvent) => void;
}

function comboFromEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  parts.push(event.key.toLowerCase());
  return parts.join('+');
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      const combo = comboFromEvent(event);
      const action = shortcuts[combo];
      if (!action) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      // Los atajos de función y ctrl funcionan siempre; letras sueltas no si se está tipeando.
      if (isTyping && !combo.startsWith('ctrl') && !combo.startsWith('f') && combo !== 'escape') return;
      event.preventDefault();
      action(event);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}
