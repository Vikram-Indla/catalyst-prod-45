/**
 * SlashCommandPalette — inline /-trigger popover for composer. When the user
 * types `/` at the start of the input (or after whitespace), shows a list of
 * available slash commands (/remind, /poll, /code, /table, /quote, /hr).
 *
 * Navigation: arrow keys (up/down) to select, Enter to apply, Escape to close.
 * Portal: position:absolute, anchored to textarea, z-index 1000.
 * Styling: ADS tokens (bg, border, hover), 12px/400 font, 4px radius.
 */
import React, { useEffect, useMemo, useState } from 'react';

export interface SlashCommand {
  name: string;          // Command name without /
  label: string;         // Display label
  description: string;   // Short help text
  insert: string;        // Text to insert when selected
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'remind',
    label: 'Remind',
    description: 'Set a reminder for this conversation',
    insert: '/remind ',
  },
  {
    name: 'poll',
    label: 'Poll',
    description: 'Create a poll for team feedback',
    insert: '/poll ',
  },
  {
    name: 'code',
    label: 'Code block',
    description: 'Insert a code snippet',
    insert: '/code\n\n',
  },
  {
    name: 'table',
    label: 'Table',
    description: 'Insert a formatted table',
    insert: '/table\n\n',
  },
  {
    name: 'quote',
    label: 'Quote',
    description: 'Quote a previous message',
    insert: '/quote ',
  },
  {
    name: 'hr',
    label: 'Divider',
    description: 'Add a horizontal divider',
    insert: '/hr\n',
  },
];

export interface SlashCommandPaletteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}

interface CommandState {
  open: boolean;
  query: string;
  triggerIndex: number;
  selectedIndex: number;
}

const INITIAL: CommandState = { open: false, query: '', triggerIndex: -1, selectedIndex: 0 };

export function SlashCommandPalette({
  textareaRef,
  value,
  onChange,
  onClose,
}: SlashCommandPaletteProps) {
  const [state, setState] = useState<CommandState>(INITIAL);

  const candidates = useMemo(() => {
    if (!state.open) return [];
    const q = state.query.trim().toLowerCase();
    const filtered = q
      ? SLASH_COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(q))
      : SLASH_COMMANDS;
    return filtered;
  }, [state]);

  // Recompute open-state whenever the value or caret changes.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const onSelChange = () => {
      // Read the live DOM value rather than the `value` prop — on a
      // controlled textarea, this listener (attached directly to the
      // element) can run before React has flushed the prop update from
      // fireEvent/typing, which would otherwise leave us evaluating a
      // stale caret/text snapshot.
      const liveValue = el.value;
      const caret = el.selectionStart ?? liveValue.length;
      const upto = liveValue.slice(0, caret);
      const lastSlash = upto.lastIndexOf('/');

      if (lastSlash < 0) {
        setState(INITIAL);
        return;
      }

      const sliceAfter = upto.slice(lastSlash + 1);
      // Close if the /-token has whitespace or is too long
      if (/\s/.test(sliceAfter) || sliceAfter.length > 32) {
        setState(INITIAL);
        return;
      }

      // Trigger char must be at start or follow whitespace (or newline)
      if (lastSlash > 0 && !/[\s\n]/.test(upto[lastSlash - 1])) {
        setState(INITIAL);
        return;
      }

      setState(prev => {
        // Nothing about the /-token actually changed (e.g. a keyup fired
        // after an ArrowUp/ArrowDown palette-navigation keydown, which moves
        // selectedIndex but never touches the caret or text) — keep the
        // current selection instead of resetting it back to 0.
        if (prev.open && prev.triggerIndex === lastSlash && prev.query === sliceAfter) {
          return prev;
        }
        return {
          open: true,
          query: sliceAfter,
          triggerIndex: lastSlash,
          selectedIndex: 0, // Reset selection when query changes
        };
      });
    };

    el.addEventListener('input', onSelChange);
    el.addEventListener('keyup', onSelChange);
    el.addEventListener('click', onSelChange);

    return () => {
      el.removeEventListener('input', onSelChange);
      el.removeEventListener('keyup', onSelChange);
      el.removeEventListener('click', onSelChange);
    };
  }, [textareaRef, value]);

  // Keyboard navigation — capture phase so we intercept before other handlers.
  // This ensures Escape, ArrowUp, ArrowDown, and Enter only navigate the palette
  // when it's open, rather than bubbling to parent handlers.
  useEffect(() => {
    if (!state.open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Escape → close palette
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setState(INITIAL);
        onClose();
        return;
      }

      // ArrowDown → next command
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % candidates.length,
        }));
        return;
      }

      // ArrowUp → previous command
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + candidates.length) % candidates.length,
        }));
        return;
      }

      // Enter → select current command
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (candidates.length > 0) {
          insertCommand(candidates[state.selectedIndex]);
        }
        return;
      }
    };

    const el = textareaRef.current;
    if (el) {
      // Capture phase beats other handlers (e.g., composer's own Enter key handling)
      el.addEventListener('keydown', onKeyDown, true);
    }

    return () => {
      if (el) {
        el.removeEventListener('keydown', onKeyDown, true);
      }
    };
  }, [state.open, state.selectedIndex, candidates]);

  const insertCommand = (cmd: SlashCommand) => {
    const before = value.slice(0, state.triggerIndex);
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const after = value.slice(caret);
    const next = `${before}${cmd.insert}${after}`;
    onChange(next);
    setState(INITIAL);
    onClose();

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        // Position cursor after the inserted text
        const pos = before.length + cmd.insert.length;
        el.setSelectionRange(pos, pos);
        el.focus();
      }
    });
  };

  if (!state.open || candidates.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Slash command palette"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 8,
        marginBottom: 4,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 4,
        boxShadow: '0 4px 8px var(--ds-shadow-raised)',
        width: 280,
        maxHeight: 320,
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      {candidates.map((cmd, idx) => (
        <button
          key={cmd.name}
          type="button"
          role="option"
          aria-selected={idx === state.selectedIndex}
          onClick={() => insertCommand(cmd)}
          onMouseEnter={() => setState(prev => ({ ...prev, selectedIndex: idx }))}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            width: '100%',
            padding: '8px 12px',
            background: idx === state.selectedIndex
              ? 'var(--ds-background-neutral-subtle-hovered)'
              : 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 400,
            color: 'var(--ds-text)',
            lineHeight: 1.3,
          }}>
            {cmd.label}
          </span>
          <span style={{
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 400,
            color: 'var(--ds-text-subtle)',
            lineHeight: 1.2,
          }}>
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}

export default SlashCommandPalette;
