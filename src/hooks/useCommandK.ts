import { useEffect } from 'react';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

export function useCommandK() {
  const open = useGlobalSearchStore((s) => s.open);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-command-k-ignore="true"]')) return;
      event.preventDefault();
      open();
      window.dispatchEvent(new CustomEvent('open-global-search'));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);
}
