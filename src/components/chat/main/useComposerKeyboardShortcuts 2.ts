/**
 * useComposerKeyboardShortcuts — keyboard shortcuts for the chat MessageComposer.
 *
 * Integrates with both plain textarea (Cmd+/ to toggle rich mode) and
 * the AtlaskitEditor (rich text formatting shortcuts).
 *
 * Supported shortcuts:
 *   Plain Mode (textarea):
 *     - Cmd+/ → toggle to rich mode
 *     - / → trigger slash palette (native SlashCommandPalette handles nav)
 *     - @ → trigger mention picker (native MentionPicker handles nav)
 *
 *   Rich Mode (@atlaskit/editor-core):
 *     - Cmd+B → bold
 *     - Cmd+I → italic
 *     - Cmd+U → underline
 *     - Cmd+Shift+X → strikethrough
 *     - Cmd+K → link picker / link insertion
 *     - Cmd+Shift+7 → blockquote
 *     - Cmd+Shift+8 → unordered list
 *     - Cmd+Shift+9 → ordered list
 *     - Cmd+Shift+: (backtick on US keyboard) → code block
 *     - Escape → blur editor (revert to plain mode optional)
 *
 * The rich editor handles most shortcuts natively via @atlaskit/editor-core's
 * keymap. This hook wires the few that need custom routing:
 *   - Cmd+/ (plain→rich toggle)
 *   - Some custom block insertions (blockquote, lists, code block may need tweaking)
 */

import { useEffect, useRef } from 'react';
import type { EditorView } from '@atlaskit/editor-prosemirror/view';

export interface UseComposerKeyboardShortcutsProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  richMode?: boolean;
  onToggleRich?: () => void;
  editorViewRef?: React.RefObject<EditorView | null>;
}

const IS_MAC = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/**
 * Shortcut key combinations — platform-aware.
 * We store logical names (e.g., 'mod+b') and resolve at runtime.
 */
const SHORTCUTS = {
  // Plain mode
  toggleRichMode: IS_MAC ? 'cmd+/' : 'ctrl+/',

  // Rich mode — handled natively by @atlaskit/editor-core
  // Listed here for reference; Atlaskit handles these automatically:
  bold: IS_MAC ? 'cmd+b' : 'ctrl+b',
  italic: IS_MAC ? 'cmd+i' : 'ctrl+i',
  underline: IS_MAC ? 'cmd+u' : 'ctrl+u',
  strikethrough: IS_MAC ? 'cmd+shift+x' : 'ctrl+shift+x',
  link: IS_MAC ? 'cmd+k' : 'ctrl+k',
  blockquote: IS_MAC ? 'cmd+shift+7' : 'ctrl+shift+7',
  bulletList: IS_MAC ? 'cmd+shift+8' : 'ctrl+shift+8',
  orderedList: IS_MAC ? 'cmd+shift+9' : 'ctrl+shift+9',
  codeBlock: IS_MAC ? 'cmd+shift+:' : 'ctrl+shift+:',
};

/**
 * Parse a keyboard event into a normalized shortcut string.
 * E.g., Cmd+B on Mac → 'cmd+b', Ctrl+B on Windows → 'ctrl+b'
 */
function eventToShortcut(e: KeyboardEvent): string {
  const modKey = (IS_MAC && e.metaKey) || (!IS_MAC && e.ctrlKey);
  const shift = e.shiftKey;
  const alt = e.altKey;

  let key = e.key.toLowerCase();
  // Map special keys
  if (e.key === '/') key = '/';
  if (e.key === ':') key = ':';
  if (e.key === '7') key = '7';
  if (e.key === '8') key = '8';
  if (e.key === '9') key = '9';

  const parts: string[] = [];
  if (modKey) parts.push(IS_MAC ? 'cmd' : 'ctrl');
  if (alt) parts.push('alt');
  if (shift) parts.push('shift');
  parts.push(key);

  return parts.join('+');
}

/**
 * Check if a shortcut string matches a KeyboardEvent.
 * Handles order-insensitive modifier combinations.
 */
function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const fired = eventToShortcut(e);
  return fired === shortcut;
}

export function useComposerKeyboardShortcuts({
  textareaRef,
  richMode = false,
  onToggleRich,
  editorViewRef,
}: UseComposerKeyboardShortcutsProps) {
  // We don't need a ref for the handler itself — just attach/detach to the refs' elements

  useEffect(() => {
    if (!richMode) {
      // Plain mode — listen on textarea for Cmd+/
      const el = textareaRef?.current;
      if (!el) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+/ → toggle rich mode
        if (matchesShortcut(e, SHORTCUTS.toggleRichMode)) {
          e.preventDefault();
          onToggleRich?.();
          return;
        }
      };

      el.addEventListener('keydown', handleKeyDown);
      return () => el.removeEventListener('keydown', handleKeyDown);
    } else {
      // Rich mode — most formatting shortcuts are handled natively by Atlaskit.
      // We just need to listen for Escape to optionally blur/exit, or Cmd+/ to exit rich.
      // The editor's view already has built-in handlers for Cmd+B, Cmd+I, etc.
      const el = editorViewRef?.current?.dom;
      if (!el) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+/ → toggle back to plain mode
        if (matchesShortcut(e, SHORTCUTS.toggleRichMode)) {
          e.preventDefault();
          onToggleRich?.();
          return;
        }

        // Escape → blur and optionally exit rich (optional behavior — for now, just blur)
        if (e.key === 'Escape') {
          e.preventDefault();
          el.blur();
          // Uncomment to auto-exit rich mode on Escape:
          // onToggleRich?.();
          return;
        }
      };

      el.addEventListener('keydown', handleKeyDown);
      return () => el.removeEventListener('keydown', handleKeyDown);
    }
  }, [richMode, textareaRef, editorViewRef, onToggleRich]);
}

/**
 * Keyboard shortcut help text — displayed in UI (e.g., settings, help modal).
 * Format: { action: string, shortcut: string }[]
 */
export function getKeyboardShortcutHelp() {
  return [
    // Formatting
    { action: 'Bold', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+B` },
    { action: 'Italic', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+I` },
    { action: 'Underline', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+U` },
    { action: 'Strikethrough', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+Shift+X` },
    // Blocks
    { action: 'Link', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+K` },
    { action: 'Blockquote', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+Shift+7` },
    { action: 'Bullet list', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+Shift+8` },
    { action: 'Ordered list', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+Shift+9` },
    { action: 'Code block', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+Shift+:` },
    // Mode toggle
    { action: 'Toggle rich text', shortcut: `${IS_MAC ? '⌘' : 'Ctrl'}+/` },
  ];
}
