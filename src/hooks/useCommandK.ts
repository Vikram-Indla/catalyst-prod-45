import { useEffect } from 'react';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el.isContentEditable
  );
}

export function useCommandK() {
  const open = useGlobalSearchStore((s) => s.open);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Cmd/Ctrl+K — global search
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-command-k-ignore="true"]')) return;
        event.preventDefault();
        open();
        window.dispatchEvent(new CustomEvent('open-global-search'));
        return;
      }

      // Skip bare-key shortcuts when an input has focus
      if (isInputFocused()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // 'c' — trigger the global Create button
      if (event.key === 'c') {
        const createBtn = document.querySelector<HTMLElement>(
          '[data-testid="create-button"], [aria-label="Create"], [data-create-trigger]'
        );
        if (createBtn) {
          event.preventDefault();
          createBtn.click();
        } else {
          // Dispatch a custom event so any listener (e.g. CreateDropdown) can react
          window.dispatchEvent(new CustomEvent('catalyst-global-create'));
        }
        return;
      }

      // '/' — focus the search input
      if (event.key === '/') {
        const searchInput = document.querySelector<HTMLElement>(
          'input[placeholder*="Search"], input[type="search"]'
        );
        if (searchInput) {
          event.preventDefault();
          searchInput.focus();
        }
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);
}
