/**
 * For You Inline Filters — Rich dropdowns with hub dots, reporter avatars, searchable
 * FINAL spec · fy- ring-fenced
 */

import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, Search, Check } from 'lucide-react';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { cn } from '@/lib/utils';

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
  Product: '#3F3F46',
  Task: '#D4D4D8',
  Incident: '#DC2626',
  Release: '#16A34A',
  Test: '#3F3F46',
  Strategy: '#0891B2',
  Plan: '#6366F1',
};

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
}

function FilterDropdown({ label, value, options, onChange, variant = 'default' }: FilterDropdownProps) {
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
  const getAvatarColor = (name: string) => {
    const ini = getInitials(name);
    return ['#2563EB', '#0D9488', '#D97706', '#DC2626', '#7C3AED'][ini.charCodeAt(0) % 5];
  };

  return (
    <div ref={ref} className="fy-dropdown" style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          transition: 'all 0.15s',
          border: `1px solid ${value ? T.primary : T.border}`,
          background: value ? T.primaryBg : T.surface,
          color: value ? T.primary : T.inkTertiary,
          cursor: 'pointer',
        }}
      >
        {value || label}
        {value ? (
          <X
            size={12}
            style={{ opacity: 0.8, cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
          />
        ) : (
          <ChevronDown size={11} style={{ opacity: 0.5 }} />
        )}
      </button>

      {open && (
        <div
          className="fy-dropdown-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            minWidth: 240, maxHeight: 300, overflowY: 'auto',
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            zIndex: 50, padding: 4,
            animation: 'fy-dropIn 0.15s ease',
          }}
        >
          {/* Search */}
          <div style={{ padding: '4px 4px 2px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 30,
              padding: '0 8px', background: T.surfaceTertiary, borderRadius: 6,
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
                  fontSize: 12, color: T.ink,
                }}
              />
            </div>
          </div>

          {/* All option */}
          <button
            onClick={() => { onChange(null); setOpen(false); setSearch(''); }}
            className="fy-dropdown-option"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', textAlign: 'left', padding: '7px 10px',
              borderRadius: 6, fontSize: 12,
              fontWeight: !value ? 600 : 400,
              color: !value ? T.primary : T.ink,
              background: !value ? 'rgba(37,99,235,0.06)' : 'transparent',
              border: 'none', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = T.surfaceSecondary; }}
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
                className="fy-dropdown-option"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  textAlign: 'left', padding: '7px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? T.primary : T.ink,
                  background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.surfaceSecondary; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
              >
                {/* Hub dot */}
                {variant === 'hub' && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: HUB_DOT_COLORS[option] || T.inkMuted, flexShrink: 0 }} />
                )}

                {/* Reporter avatar */}
                {variant === 'reporter' && (() => {
                  const avatarUrl = nameAvatarMap.get(option.toLowerCase());
                  const ini = getInitials(option);
                  const clr = getAvatarColor(option);
                  return avatarUrl ? (
                    <img src={avatarUrl} alt={option} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                  );
                })()}

                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option}</span>

                {isSelected && <Check size={14} style={{ color: T.primary, flexShrink: 0 }} />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 11, color: T.inkMuted, textAlign: 'center' }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ForYouInlineFilters({ filters, onFiltersChange, projectOptions, hubOptions, reportedByOptions }: ForYouInlineFiltersProps) {
  const activeCount = [filters.project, filters.hub, filters.reportedBy].filter(Boolean).length;

  return (
    <div className="fy-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* Filter icon label */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.04em', userSelect: 'none' }}>
        <Filter size={12} style={{ opacity: 0.6 }} />
        Filters
        {activeCount > 0 && (
          <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9999, background: T.primary, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeCount}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 16, background: T.border }} />

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
      />

      {/* Clear all — danger-text color */}
      {activeCount > 0 && (
        <button
          onClick={() => onFiltersChange({ project: null, hub: null, reportedBy: null })}
          style={{
            fontSize: 11, fontWeight: 600, color: T.dangerText,
            background: 'none', border: 'none', cursor: 'pointer',
            marginLeft: 4, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Clear all
        </button>
      )}

      {/* dropIn animation */}
      <style>{`
        @keyframes fy-dropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
