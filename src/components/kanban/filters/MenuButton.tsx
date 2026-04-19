/**
 * MenuButton — Atlaskit DropdownMenu wrapper for group-by / sort / density.
 *
 * These three controls all share the same anatomy:
 *   [ Label: Value ] ▼    or just [ Icon ] when collapsed
 *
 * A light wrapper keeps the visual rhythm of the filter bar consistent
 * and lets the host swap the three menus freely without re-implementing
 * the trigger styling.
 */
import DropdownMenu, {
  DropdownItemGroup,
  DropdownItemCheckbox,
  DropdownItemCheckboxGroup,
} from '@atlaskit/dropdown-menu';
import { token } from '@atlaskit/tokens';
import { ChevronDown } from 'lucide-react';

export interface MenuButtonOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface MenuButtonProps {
  label: string;
  /** Selected option id. */
  value: string;
  options: MenuButtonOption[];
  onChange: (id: string) => void;
  /** When set, trigger renders only the icon to save bar space. */
  iconOnly?: boolean;
  leadingIcon?: React.ReactNode;
  testId?: string;
}

export function MenuButton({
  label, value, options, onChange, iconOnly, leadingIcon, testId,
}: MenuButtonProps) {
  const current = options.find(o => o.id === value);
  const active = value !== options[0]?.id;

  return (
    <DropdownMenu
      placement="bottom-end"
      testId={testId}
      trigger={({ triggerRef, ...triggerProps }) => (
        <button
          {...triggerProps}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type="button"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 32, padding: iconOnly ? '0 8px' : '0 12px',
            borderRadius: 6,
            border: `1px solid ${active ? token('color.border.selected') : token('color.border')}`,
            background: active ? token('color.background.selected') : token('color.background.input'),
            color: active ? token('color.text.selected') : token('color.text.subtle'),
            fontSize: 13, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            transition: 'background 120ms ease, border-color 120ms ease',
          }}
        >
          {leadingIcon}
          {iconOnly ? null : (
            <span>
              {label}
              {current && <span style={{ color: token('color.text.subtlest'), marginLeft: 4 }}>· {current.label}</span>}
            </span>
          )}
          <ChevronDown size={14} aria-hidden />
        </button>
      )}
    >
      <DropdownItemCheckboxGroup id={`${label}-group`} title={label}>
        {options.map(o => (
          <DropdownItemCheckbox
            key={o.id}
            id={o.id}
            isSelected={o.id === value}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </DropdownItemCheckbox>
        ))}
      </DropdownItemCheckboxGroup>
    </DropdownMenu>
  );
}

/* Re-export convenience — hosts sometimes want the group primitives too. */
export { DropdownItemGroup, DropdownItemCheckbox };
