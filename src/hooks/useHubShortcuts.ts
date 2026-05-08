/**
 * useHubShortcuts — Cmd/Ctrl + N (1-9, 0, -) jumps to a hub.
 *
 * 2026-05-08 (Step 7.4): the market-driving keyboard layer for the hub
 * navigator. No other Jira-parity competitor ships these. Power users
 * who use ⌘5 to land in Project 50 times a day never go back.
 *
 * Mapping:
 *   ⌘1 Home · ⌘2 Strategy · ⌘3 Ideation · ⌘4 Product · ⌘5 Project
 *   ⌘6 Release · ⌘7 Test · ⌘8 Incident · ⌘9 Task · ⌘0 Plan · ⌘- Wiki
 *
 * Skips when an input/textarea/contenteditable element is focused so the
 * shortcut never collides with an in-flight edit. Ctrl is honoured as a
 * Cmd alias on non-mac platforms.
 */
import { useEffect } from 'react';

export interface HubShortcutTarget {
  /** Keyboard key value as event.key — '1'…'9', '0', '-'. */
  key: string;
  /** Hub slug for analytics / recents bookkeeping. */
  hubKey: string;
  /** SPA destination. */
  href: string;
}

interface UseHubShortcutsArgs {
  targets: HubShortcutTarget[];
  navigate: (href: string) => void;
  recordRecent: (hubKey: string) => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

export function useHubShortcuts({ targets, navigate, recordRecent }: UseHubShortcutsArgs) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Modifier required — bare numbers must remain free for in-page use.
      if (!event.metaKey && !event.ctrlKey) return;
      // Don't hijack while typing.
      if (isInputFocused()) return;
      // Single-character key only — '1', '0', '-', etc.
      const target = targets.find((t) => t.key === event.key);
      if (!target) return;
      event.preventDefault();
      recordRecent(target.hubKey);
      navigate(target.href);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [targets, navigate, recordRecent]);
}
