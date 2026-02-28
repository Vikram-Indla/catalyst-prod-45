/**
 * For You Inline Filters — Rich dropdowns with hub dots, reporter avatars, searchable
 * FINAL spec · fy- ring-fenced
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';

// Design tokens
const T = {
  ink: '#09090B', inkSecondary: '#18181B', inkTertiary: '#3F3F46',
  inkMuted: '#71717A',
  surface: '#FFFFFF', surfaceSecondary: '#FAFAFA', surfaceTertiary: '#F4F4F5',
  border: '#E4E4E7',
  primary: '#2563EB', primaryBg: '#EFF6FF',
  dangerText: '#D92525',
};

const HUB_DOT_COLORS: Record<string, string> = {
  Project: '#2563EB',
  Product: '#7C3AED',
  Task: '#EA580C',
  Incident: '#DC2626',
  Release: '#16A34A',
  Test: '#3F3F46',
  Strategy: '#0891B2',
  Plan: '#6366F1',
};

const AVATAR_PALETTE = ["#6b7a8d", "#7a8b6b", "#8b7a6b", "#6b6b8b", "#6b8b8b", "#8b6b7a", "#7a6b8b", "#6b8b7a"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export interface ForYouFilters {
  project: string | null;
  hub: string | null;
  reportedBy: string | null;
}

interface ForYouInlineFiltersProps {
  filters: ForYouFilters;
  onFiltersChange: (filters: ForYouFilters) => void;
  projectOptions: string[];
  hubOptions: string[];
  reportedByOptions: string[];
}

interface FilterDropdownProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  variant?: 'default' | 'hub' | 'reporter';
  alignRight?: boolean;
}

function FilterDropdown({ label, value, options, onChange, variant = 'default', alignRight = false }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const nameAvatarMap = useProfileAvatarsByName();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger chip */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 34, padding: '0 14px', borderRadius: 7,
          fontSize: 13, fontWeight: value ? 600 : 500,
          transition: 'all 0.15s',
          border: value ? '1px solid #2563EB' : '1px solid hsl(214,32%,91%)',
          background: value ? '#EFF6FF' : '#FFFFFF',
          color: value ? '#2563EB' : T.inkSecondary,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {value || label}
        {value ? (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              backgroundColor: 'rgba(37,99,235,0.15)', border: 'none',
              cursor: 'pointer', color: T.primary, fontSize: 10, fontWeight: 700,
              marginLeft: 2,
            }}
          >
            ✕
          </span>
        ) : (
          <ChevronDown size={12} style={{ opacity: 0.5 }} />
        )}
      </button>

      {/* Dropdown panel — ABSOLUTE positioned, floats over content */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            ...(alignRight ? { right: 0, left: 'auto' } : { left: 0 }),
            minWidth: 260, maxHeight: 340, overflowY: 'auto',
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            zIndex: 50, padding: 6,
            animation: 'fy-dropIn 0.15s ease',
          }}
        >
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            borderBottom: `1px solid ${T.border}`,
            marginBottom: 4,
          }}>
            <Search size={14} style={{ color: T.inkMuted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder={`Filter ${label.toLowerCase()}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: 13, color: T.ink, fontFamily: "'Inter', system-ui",
              }}
            />
          </div>

          {/* All option */}
          <button
            onClick={() => { onChange(null); setOpen(false); setSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', textAlign: 'left', padding: '10px 12px',
              borderRadius: 8, fontSize: 13,
              fontWeight: !value ? 600 : 500,
              color: !value ? T.primary : T.ink,
              background: !value ? 'rgba(37,99,235,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer',
              transition: 'background 0.1s', lineHeight: '1.4',
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = T.surfaceTertiary; }}
            onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
          >
            All {label}
            {!value && <Check size={14} style={{ color: T.primary }} />}
          </button>

          {filtered.map(option => {
            const isSelected = value === option;
            return (
              <button
                key={option}
                onClick={() => { onChange(option); setOpen(false); setSearch(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                  fontSize: 13, fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? T.primary : T.ink,
                  background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.1s', lineHeight: '1.4',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.surfaceTertiary; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.08)' : 'transparent'; }}
              >
                {/* Hub dot — 8px */}
                {variant === 'hub' && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: HUB_DOT_COLORS[option] || T.inkMuted, flexShrink: 0 }} />
                )}

                {/* Reporter avatar — 28px */}
                {variant === 'reporter' && (() => {
                  const avatarUrl = nameAvatarMap.get(option.toLowerCase());
                  const ini = getInitials(option);
                  const clr = getAvatarColor(option);
                  return avatarUrl ? (
                    <img src={avatarUrl} alt={option} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                  );
                })()}

                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option}</span>

                {isSelected && <Check size={14} style={{ color: T.primary, flexShrink: 0 }} />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 12, color: T.inkMuted, textAlign: 'center' }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ForYouInlineFilters({ filters, onFiltersChange, projectOptions, hubOptions, reportedByOptions }: ForYouInlineFiltersProps) {
  const activeCount = [filters.project, filters.hub, filters.reportedBy].filter(Boolean).length;

  return (
    <div className="fy-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }}>
      {/* No dead "FILTERS" label — chips ARE the filters */}

      <FilterDropdown
        label="Project"
        value={filters.project}
        options={projectOptions}
        onChange={v => onFiltersChange({ ...filters, project: v })}
      />
      <FilterDropdown
        label="Hub"
        value={filters.hub}
        options={hubOptions}
        onChange={v => onFiltersChange({ ...filters, hub: v })}
        variant="hub"
      />
      <FilterDropdown
        label="Reported by"
        value={filters.reportedBy}
        options={reportedByOptions}
        onChange={v => onFiltersChange({ ...filters, reportedBy: v })}
        variant="reporter"
        alignRight
      />

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={() => onFiltersChange({ project: null, hub: null, reportedBy: null })}
          style={{
            fontSize: 12, fontWeight: 600, color: T.dangerText,
            background: 'none', border: 'none', cursor: 'pointer',
            marginLeft: 4, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Clear all
        </button>
      )}

      <style>{`
        @keyframes fy-dropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
