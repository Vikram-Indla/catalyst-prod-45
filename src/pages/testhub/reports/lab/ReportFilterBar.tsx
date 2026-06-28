import React from 'react';
import Button from '@atlaskit/button/standard-button';

export interface FilterState {
  dateRange: '7d' | '30d' | '90d' | 'all';
  cycle: string;
  folder: string;
  owner: string;
}

interface Props {
  filters: FilterState;
  cycles: { id: string; name: string }[];
  folders: string[];
  owners: string[];
  onChange: (f: FilterState) => void;
  showDateRange: boolean;
}

const DATE_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
] as const;

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--ds-border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '4px 11px',
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: value === opt.value ? 600 : 400,
            color: value === opt.value ? 'var(--ds-text-brand)' : 'var(--ds-text-subtle)',
            background: value === opt.value ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
            border: 'none',
            borderRight: i < options.length - 1 ? '1px solid var(--ds-border)' : 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text)',
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border)',
          borderRadius: 4,
          padding: '4px 8px',
          cursor: 'pointer',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ReportFilterBar({ filters, cycles, folders, owners, onChange, showDateRange }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const cycleOptions = [
    { value: 'all', label: 'All cycles' },
    ...cycles.map(c => ({ value: c.id, label: c.name })),
  ];
  const folderOptions = [
    { value: 'all', label: 'All folders' },
    ...folders.map(f => ({ value: f, label: f })),
  ];
  const ownerOptions = [
    { value: 'all', label: 'All owners' },
    ...owners.map(o => ({ value: o, label: o })),
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 20px',
        borderBottom: '1px solid var(--ds-border)',
        background: 'var(--ds-surface)',
        flexWrap: 'wrap',
        minHeight: 48,
      }}
    >
      {showDateRange && (
        <SegmentedControl
          options={DATE_OPTIONS as unknown as { value: string; label: string }[]}
          value={filters.dateRange}
          onChange={v => set({ dateRange: v as FilterState['dateRange'] })}
        />
      )}
      <SelectFilter
        label="Cycle"
        value={filters.cycle}
        options={cycleOptions}
        onChange={v => set({ cycle: v })}
      />
      <SelectFilter
        label="Folder"
        value={filters.folder}
        options={folderOptions}
        onChange={v => set({ folder: v })}
      />
      <SelectFilter
        label="Owner"
        value={filters.owner}
        options={ownerOptions}
        onChange={v => set({ owner: v })}
      />
      {(filters.cycle !== 'all' || filters.folder !== 'all' || filters.owner !== 'all') && (
        <Button
          appearance="subtle"
          onClick={() => onChange({ dateRange: filters.dateRange, cycle: 'all', folder: 'all', owner: 'all' })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
