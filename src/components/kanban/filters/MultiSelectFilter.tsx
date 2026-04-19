/**
 * MultiSelectFilter — Atlaskit-native multi-select filter trigger.
 *
 * Anatomy (design intent):
 *   [ Label • count ]  ← button trigger (active state = blue outline + count pill)
 *       └─ @atlaskit/popup
 *           └─ @atlaskit/select (isMulti, searchable, options from adapter)
 *
 * Why Popup + Select rather than inline @atlaskit/select directly:
 *   • The filter bar needs compact triggers, not full select fields. A
 *     button + popup keeps the bar dense and scannable; the select only
 *     occupies real estate when the user asks for it.
 *   • Selected-count badge on the trigger is the primary affordance that
 *     tells the user "this filter is on". @atlaskit/select alone can't
 *     surface that in a bar layout.
 *
 * Accessibility:
 *   • Trigger is a real <button> with aria-expanded + aria-haspopup="listbox".
 *   • Select inside the popup is Atlaskit-native, so keyboard + screen
 *     reader support is inherited.
 */
import { useMemo, useState } from 'react';
import Popup from '@atlaskit/popup';
import AkSelect, { type OptionType } from '@atlaskit/select';
import { ChevronDown } from 'lucide-react';
import { token } from '@atlaskit/tokens';
import type { KanbanFilterOption } from '../catalyst-types';

interface MultiSelectFilterProps {
  label: string;
  icon?: React.ReactNode;
  options: KanbanFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  width?: number;
  testId?: string;
}

export function MultiSelectFilter({
  label, icon, options, selected, onChange, width = 240, testId,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const akOptions = useMemo<OptionType[]>(
    () => options.map(o => ({
      label: o.count !== undefined ? `${o.label}  ·  ${o.count}` : o.label,
      value: o.value,
    })),
    [options],
  );

  const akValue = useMemo<OptionType[]>(
    () => akOptions.filter(o => selected.includes(String(o.value))),
    [akOptions, selected],
  );

  const activeCount = selected.length;

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          data-testid={testId}
          onClick={() => setIsOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 12px',
            borderRadius: 6,
            border: `1px solid ${activeCount > 0 ? token('color.border.selected') : token('color.border')}`,
            background: activeCount > 0 ? token('color.background.selected') : token('color.background.input'),
            color: activeCount > 0 ? token('color.text.selected') : token('color.text.subtle'),
            fontSize: 13, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            transition: 'background 120ms ease, border-color 120ms ease',
          }}
        >
          {icon}
          <span>{label}</span>
          {activeCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, borderRadius: 9,
              background: token('color.background.selected.bold'),
              color: token('color.text.inverse'),
              fontSize: 11, fontWeight: 700, padding: '0 5px',
              fontVariantNumeric: 'tabular-nums',
            }}>{activeCount}</span>
          )}
          <ChevronDown size={14} aria-hidden />
        </button>
      )}
      content={() => (
        <div style={{ width, padding: 8 }} onClick={(e) => e.stopPropagation()}>
          <AkSelect<OptionType, true>
            isMulti
            isSearchable
            options={akOptions}
            value={akValue}
            onChange={(next) => {
              const values = (next ?? []).map(o => String(o.value));
              onChange(values);
            }}
            placeholder={`Filter by ${label.toLowerCase()}…`}
            menuIsOpen
            autoFocus
            hideSelectedOptions={false}
            backspaceRemovesValue
            closeMenuOnSelect={false}
            spacing="compact"
          />
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                marginTop: 6, width: '100%',
                height: 28, borderRadius: 4,
                border: 'none',
                background: 'transparent',
                color: token('color.text.accent.red'),
                fontSize: 12, fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                textAlign: 'left',
                padding: '0 8px',
              }}
            >Clear all</button>
          )}
        </div>
      )}
    />
  );
}
