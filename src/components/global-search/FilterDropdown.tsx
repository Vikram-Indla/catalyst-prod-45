import { useMemo, useState } from 'react';
import Popup from '@atlaskit/popup';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import Avatar from '@atlaskit/avatar';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';

// FilterDropdown — generic Jira-parity multi-select filter chip used by the
// global search panel for App / Space / Assignee.
//
// Pattern: chip button (icon + label + caret) → on click, opens an Atlaskit
// Popup anchored bottom-start with: search Textfield ("Find <noun>"), a
// Suggested section listing rows of [Checkbox + Avatar/Icon + Name (KEY?)],
// and a "Clear filter" footer row. Multi-select; matches reference imagery.

export interface FilterOption {
  id: string;
  name: string;
  /** Optional secondary tag rendered as " (KEY)" after the name (Spaces). */
  tag?: string;
  /** Avatar image URL; if omitted we render initials via Atlaskit Avatar. */
  avatarSrc?: string;
}

interface FilterDropdownProps {
  /** Chip label e.g. "App", "Space", "Assignee". */
  label: string;
  /** Placeholder for the in-popup search field. */
  searchPlaceholder: string;
  /** Icon rendered on the LEFT side of the chip (Atlaskit icon component). */
  leadingIcon: React.ComponentType<{ label: string }>;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

// Step 7.6b (2026-05-08) — every raw hex swapped for --ds-* tokens so the
// chip honours Atlaskit's light/dark theme switch and inherits any future
// token shifts. Visual chrome is identical; the values just resolve through
// the token system now instead of being baked into the source.
const chipBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 10px 0 8px',
  borderRadius: 4,
  border: '1px solid var(--ds-border)',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'var(--cp-font-body)',
  cursor: 'pointer',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const chipActive: React.CSSProperties = {
  ...chipBase,
  background: 'var(--ds-background-selected)',
  border: '1px solid var(--ds-border-selected)',
  color: 'var(--ds-text-selected)',
};

export function FilterDropdown({
  label,
  searchPlaceholder,
  leadingIcon: LeadingIcon,
  options,
  selectedIds,
  onChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.tag && o.tag.toLowerCase().includes(q)),
    );
  }, [query, options]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const isActive = selectedIds.length > 0 || open;

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      content={() => (
        <div
          style={{
            width: 460,
            maxHeight: 460,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--ds-surface, #FFFFFF)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: 10, borderBottom: '1px solid var(--ds-border)' }}>
            <Textfield
              autoFocus
              value={query}
              onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder={searchPlaceholder}
              elemAfterInput={
                <span style={{ display: 'inline-flex', paddingRight: 8, color: 'var(--ds-text-subtlest)' }}>
                  <SearchIcon label="" />
                </span>
              }
            />
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            <div
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--ds-text-subtle)',
              }}
            >
              Suggested
            </div>
            {filtered.map((opt) => {
              const checked = selectedIds.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 16px',
                    cursor: 'pointer',
                    background: checked ? 'var(--ds-background-neutral)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered)';
                  }}
                  onMouseLeave={(e) => {
                    if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Checkbox isChecked={checked} onChange={() => toggle(opt.id)} />
                  <Avatar
                    appearance="circle"
                    size="small"
                    name={opt.name}
                    src={opt.avatarSrc}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: 'var(--ds-text, #172B4D)',
                      fontFamily: 'var(--cp-font-body)',
                    }}
                  >
                    {opt.name}
                    {opt.tag ? <span style={{ color: 'var(--ds-text, #172B4D)' }}> ({opt.tag})</span> : null}
                  </span>
                </label>
              );
            })}
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  color: 'var(--ds-text-subtlest)',
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                No matches
              </div>
            ) : null}
          </div>
          {/* Clear filter */}
          <button
            type="button"
            onClick={() => onChange([])}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '12px 16px',
              borderTop: '1px solid var(--ds-border)',
              fontSize: 14,
              color: 'var(--ds-text, #172B4D)',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            Clear filter
          </button>
        </div>
      )}
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={isActive ? chipActive : chipBase}
        >
          <LeadingIcon label="" />
          <span>{label}</span>
          {selectedIds.length > 0 ? (
            <span
              style={{
                marginLeft: 2,
                padding: '0 6px',
                borderRadius: 8,
                background: 'var(--ds-background-brand-bold)',
                color: 'var(--ds-surface, #FFFFFF)',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: '16px',
              }}
            >
              {selectedIds.length}
            </span>
          ) : null}
          <ChevronDownIcon label="" />
        </button>
      )}
    />
  );
}
