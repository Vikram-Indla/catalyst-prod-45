/**
 * ActiveFilterChips — Row of removable Atlaskit Lozenges showing the
 * currently applied filter values.
 *
 * Design intent:
 *   • Appears below the primary filter row ONLY when filters are active.
 *   • Each chip = one (field, value) pair — clicking the × removes just
 *     that value, not the whole field. Power users can see exactly what
 *     is filtered without opening any popovers.
 *   • Bulk "Clear all" ghost button on the right returns to the empty
 *     state in one click.
 *   • No filter row is ever hidden below the fold; the primary row is
 *     always visible, chips wrap below.
 */
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { X } from 'lucide-react';

export interface ActiveFilterChip {
  fieldId: string;
  fieldLabel: string;
  value: string;
  valueLabel: string;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (fieldId: string, value: string) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Active filters"
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        padding: '0 24px 10px',
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        color: token('color.text.subtlest'),
        letterSpacing: '0.04em',
        marginRight: 4,
      }}>Filters</span>
      {chips.map(chip => (
        <span
          key={`${chip.fieldId}:${chip.value}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 4px 2px 8px',
            borderRadius: 4,
            background: token('color.background.neutral'),
            color: token('color.text.subtle'),
            fontSize: 12, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <span style={{ color: token('color.text.subtlest') }}>{chip.fieldLabel}:</span>
          <Lozenge appearance="default" isBold>{chip.valueLabel}</Lozenge>
          <button
            type="button"
            aria-label={`Remove filter ${chip.fieldLabel}: ${chip.valueLabel}`}
            onClick={() => onRemove(chip.fieldId, chip.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: 3,
              border: 'none', background: 'transparent',
              cursor: 'pointer', color: token('color.icon.subtle'),
            }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        style={{
          height: 22, padding: '0 8px',
          border: 'none', background: 'transparent',
          color: token('color.link'),
          fontSize: 12, fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          marginLeft: 4,
        }}
      >Clear all</button>
    </div>
  );
}
