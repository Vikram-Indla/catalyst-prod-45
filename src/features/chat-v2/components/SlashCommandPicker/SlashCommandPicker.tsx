import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HeadphonesIcon } from '../shared/Icon';
import { BUILTIN_SLASH_COMMANDS, filterSlashCommands, type SlashCommand } from './commands';

interface SlashCommandPickerProps {
  query: string;
  anchorRect: DOMRect | null;
  /** Host-injected action commands (real wired handlers only). */
  actions?: SlashCommand[];
  onPick: (command: SlashCommand) => void;
  onClose: () => void;
}

const PICKER_W = 420;
const ROW_H = 44;
const MAX_VISIBLE = 8;

export function SlashCommandPicker({
  query,
  anchorRect,
  actions = [],
  onPick,
  onClose,
}: SlashCommandPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const commands = useMemo(
    () => filterSlashCommands([...actions, ...BUILTIN_SLASH_COMMANDS], query),
    [actions, query],
  );

  useEffect(() => setActiveIdx(0), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (commands.length === 0) {
        if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setActiveIdx(i => (i + 1) % commands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setActiveIdx(i => (i - 1 + commands.length) % commands.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault(); e.stopPropagation();
        const c = commands[activeIdx];
        if (c) onPick(c);
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [commands, activeIdx, onPick, onClose]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  if (!anchorRect) return null;
  if (commands.length === 0) return null;

  const visibleCount = Math.min(commands.length, MAX_VISIBLE);
  const height = visibleCount * ROW_H + 8;
  const top = Math.max(12, anchorRect.top - height - 8);
  let left = anchorRect.left;
  if (left + PICKER_W > window.innerWidth - 12) left = window.innerWidth - PICKER_W - 12;
  if (left < 12) left = 12;

  return createPortal(
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Slash commands"
      style={{
        position: 'fixed',
        top,
        left,
        width: PICKER_W,
        maxHeight: height,
        overflowY: 'auto',
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: 4,
        fontFamily: 'var(--cv2-font)',
        zIndex: 'var(--cv2-popover-z, 1100)' as unknown as number,
      }}
    >
      {commands.slice(0, MAX_VISIBLE).map((c, idx) => (
        <CommandRow
          key={`${c.kind}-${c.id}`}
          command={c}
          active={idx === activeIdx}
          onMouseEnter={() => setActiveIdx(idx)}
          onClick={() => onPick(c)}
        />
      ))}
    </div>,
    document.body,
  );
}

function CommandRow({
  command,
  active,
  onMouseEnter,
  onClick,
}: {
  command: SlashCommand;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        height: ROW_H,
        padding: '0 12px',
        background: active ? 'var(--cv2-bg-row-hover)' : 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--cv2-bg-row-active)',
          color: command.kind === 'action' ? 'var(--cv2-accent)' : 'var(--cv2-text-subtle)',
          borderRadius: 'var(--cv2-radius-sm)',
        }}
      >
        {command.kind === 'action' && command.id === 'huddle'
          ? <HeadphonesIcon size={15} />
          : <span style={{ font: 'var(--ds-font-body)', fontWeight: 700 }}>/</span>}
      </span>
      <span style={{ font: 'var(--ds-font-body)', fontWeight: 700, color: 'var(--cv2-text-strong)', whiteSpace: 'nowrap' }}>
        {command.label}
      </span>
      <span
        style={{
          font: 'var(--ds-font-body-small)',
          color: 'var(--cv2-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {command.hint}
      </span>
      <span
        style={{
          font: 'var(--ds-font-body-small)',
          color: 'var(--cv2-text-muted)',
          padding: active ? '2px 8px' : '0',
          borderRadius: 'var(--cv2-radius-sm)',
          border: active ? '1px solid var(--cv2-border-strong)' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {active ? 'Enter' : ''}
      </span>
    </button>
  );
}
