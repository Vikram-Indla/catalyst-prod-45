/**
 * Inline-edit cells for the Epic Backlog — Status / Priority / Summary.
 *
 * Click the display chip → Atlaskit DropdownMenu / InlineEdit opens →
 * picking a value triggers the parent mutation (optimistic, with rollback).
 * Clicks do not bubble to the row so the drawer/navigation isn't triggered.
 */
import { useCallback, useState } from 'react';
import Lozenge, { type ThemeAppearance } from '@atlaskit/lozenge';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { Check } from 'lucide-react';
import { StatusLozengeCell, PriorityCell } from './cells';
import { EPIC_STATUS_LOZENGE } from '../../utils/backlog.utils';

// ─── EDITABLE STATUS ────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: string; category: 'todo' | 'in_progress' | 'done' }[] = [
  { value: 'To Do',       category: 'todo' },
  { value: 'Backlog',     category: 'todo' },
  { value: 'In Progress', category: 'in_progress' },
  { value: 'Done',        category: 'done' },
  { value: 'Cancelled',   category: 'todo' },
];

interface EditableStatusProps {
  value: string | null | undefined;
  onChange: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  disabled?: boolean;
}

export function EditableStatus({ value, onChange, disabled }: EditableStatusProps) {
  if (disabled) return <StatusLozengeCell status={value ?? null} />;
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-block">
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button
            type="button"
            ref={triggerRef}
            aria-label={`Change status — currently ${value ?? 'none'}`}
            className="cursor-pointer rounded border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
            {...props}
          >
            <StatusLozengeCell status={value ?? null} />
          </button>
        )}
        placement="bottom-start"
      >
        <DropdownItemGroup>
          {STATUS_OPTIONS.map((opt) => {
            const cfg = EPIC_STATUS_LOZENGE[opt.value];
            const appearance: ThemeAppearance =
              cfg?.color === 'blue' ? 'inprogress' : cfg?.color === 'green' ? 'success' : 'default';
            const selected = value === opt.value;
            return (
              <DropdownItem
                key={opt.value}
                onClick={() => onChange(opt.value, opt.category)}
                elemAfter={selected ? <Check size={14} /> : undefined}
              >
                <Lozenge appearance={appearance} isBold>{(cfg?.label ?? opt.value).toUpperCase()}</Lozenge>
              </DropdownItem>
            );
          })}
        </DropdownItemGroup>
      </DropdownMenu>
    </span>
  );
}

// ─── EDITABLE PRIORITY ──────────────────────────────────────────────────
const PRIORITY_OPTIONS = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

interface EditablePriorityProps {
  value: string | null | undefined;
  onChange: (priority: string) => void;
  disabled?: boolean;
}

export function EditablePriority({ value, onChange, disabled }: EditablePriorityProps) {
  if (disabled) return <PriorityCell priority={value ?? null} />;
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-block">
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button
            type="button"
            ref={triggerRef}
            aria-label={`Change priority — currently ${value ?? 'Medium'}`}
            className="cursor-pointer rounded border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
            {...props}
          >
            <PriorityCell priority={value ?? null} />
          </button>
        )}
        placement="bottom-start"
      >
        <DropdownItemGroup>
          {PRIORITY_OPTIONS.map((opt) => {
            const selected = (value ?? 'Medium').toLowerCase() === opt.toLowerCase();
            return (
              <DropdownItem
                key={opt}
                onClick={() => onChange(opt)}
                elemAfter={selected ? <Check size={14} /> : undefined}
              >
                <PriorityCell priority={opt} />
              </DropdownItem>
            );
          })}
        </DropdownItemGroup>
      </DropdownMenu>
    </span>
  );
}

// ─── EDITABLE SUMMARY (@atlaskit/inline-edit) ───────────────────────────
interface EditableSummaryProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

export function EditableSummary({ value, onChange, disabled }: EditableSummaryProps) {
  const [committed, setCommitted] = useState(value);

  const handleConfirm = useCallback(
    (next: string) => {
      const trimmed = (next ?? '').trim();
      if (!trimmed || trimmed === committed) return;
      setCommitted(trimmed);
      onChange(trimmed);
    },
    [committed, onChange]
  );

  if (disabled) {
    return <span className="block truncate text-[13px] text-foreground">{committed}</span>;
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="block">
      <InlineEdit
        defaultValue={committed}
        label=""
        editButtonLabel={`Edit summary — ${committed}`}
        readView={() => (
          <span className="block cursor-text truncate text-[13px] text-foreground">{committed}</span>
        )}
        editView={({ errorMessage, ...fieldProps }) => (
          <Textfield {...fieldProps} autoFocus />
        )}
        onConfirm={handleConfirm}
        hideActionButtons
        readViewFitContainerWidth
      />
    </span>
  );
}
