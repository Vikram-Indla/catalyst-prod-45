/**
 * GroupByPopover — Canonical enterprise Group By dropdown
 * 
 * Single source of truth for grouping controls across ForYou, StoryBacklog,
 * and any future list view. Dark mode aware, keyboard navigable, with
 * field-specific icons.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Layers, Search, Check, X, CircleDot, Flag, LayoutGrid, FolderKanban, User, Tag, GitBranch } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface GroupByOption<K extends string = string> {
  key: K;
  label: string;
  icon?: keyof typeof FIELD_ICONS;
}

const FIELD_ICONS = {
  status: CircleDot,
  priority: Flag,
  hub: LayoutGrid,
  project: FolderKanban,
  reporter: User,
  assignee: User,
  type: Tag,
  parent: GitBranch,
} as const;

interface GroupByPopoverProps<K extends string> {
  value: K;
  onChange: (v: K) => void;
  options: GroupByOption<K>[];
  noneKey?: K;
  label?: string;
}

export function GroupByPopover<K extends string>({
  value,
  onChange,
  options,
  noneKey = 'none' as K,
  label = 'Group',
}: GroupByPopoverProps<K>) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusIdx, setFocusIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isActive = value !== noneKey;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset focus index when search changes
  useEffect(() => { setFocusIdx(-1); }, [search]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback((key: K) => {
    onChange(value === key ? noneKey : key);
    setOpen(false);
    setSearch('');
  }, [value, noneKey, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusIdx >= 0 && focusIdx < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[focusIdx].key);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  }, [filtered, focusIdx, handleSelect]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[focusIdx + 1] as HTMLElement; // +1 for section header
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);

  // Tokens
  const tk = {
    bg: isDark ? '#1A1A1A' : '#FFFFFF',
    border: isDark ? '#2E2E2E' : '#E2E8F0',
    borderSubtle: isDark ? '#292929' : '#F1F5F9',
    text: isDark ? '#EDEDED' : '#0F172A',
    textMuted: isDark ? '#878787' : '#94A3B8',
    textSecondary: isDark ? '#A1A1A1' : '#475569',
    hover: isDark ? '#1F1F1F' : '#F8FAFC',
    selected: isDark ? '#0D1526' : '#F0F6FF',
    selectedBorder: '#2563EB',
    shadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.5)'
      : '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    inputBg: isDark ? '#111111' : '#FFFFFF',
    triggerBg: isDark ? '#1A1A1A' : '#FFFFFF',
    triggerBgActive: isDark ? '#0D1526' : '#F0F6FF',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => { setOpen(p => !p); if (!open) setTimeout(() => inputRef.current?.focus(), 50); }}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] font-medium cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1"
        style={{
          border: `1.5px solid ${isActive ? tk.selectedBorder : tk.border}`,
          background: isActive ? tk.triggerBgActive : tk.triggerBg,
          color: isActive ? '#2563EB' : tk.text,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Layers size={14} strokeWidth={2.2} />
        {label}
        {isActive && (
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              minWidth: 18, height: 18,
              background: '#2563EB', color: '#FFFFFF',
              fontSize: 10, fontWeight: 700,
              lineHeight: 1,
            }}
          >
            1
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
            width: 280, background: tk.bg,
            border: `1px solid ${tk.border}`, borderRadius: 8,
            boxShadow: tk.shadow,
            overflow: 'hidden',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search Header */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${tk.borderSubtle}` }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  color: tk.textMuted, pointerEvents: 'none',
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search grouping options"
                autoFocus
                className="focus:outline-none"
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: search ? 28 : 8,
                  border: `1.5px solid ${tk.border}`, borderRadius: 6,
                  fontSize: 13, color: tk.text, background: tk.inputBg,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'border-color 150ms',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = tk.border)}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: tk.textMuted, padding: 2, display: 'flex',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div ref={listRef} style={{ padding: '4px 0', maxHeight: 260, overflowY: 'auto' }}>
            {/* Section Header */}
            <div
              style={{
                padding: '6px 12px 4px', fontSize: 11, fontWeight: 600,
                color: tk.textMuted, textTransform: 'uppercase',
                letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif",
              }}
            >
              All fields
            </div>

            {filtered.map((opt, idx) => {
              const isSelected = value === opt.key;
              const isFocused = focusIdx === idx;
              const IconComp = FIELD_ICONS[opt.icon || opt.key as keyof typeof FIELD_ICONS] || CircleDot;

              return (
                <button
                  key={opt.key}
                  onClick={() => handleSelect(opt.key)}
                  className="focus:outline-none"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    height: 36, padding: '0 12px',
                    border: 'none',
                    background: isSelected
                      ? tk.selected
                      : isFocused
                        ? tk.hover
                        : 'transparent',
                    color: isSelected ? '#2563EB' : tk.text,
                    fontSize: 13.5, fontWeight: isSelected ? 500 : 400,
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => {
                    setFocusIdx(idx);
                    if (!isSelected) e.currentTarget.style.background = tk.hover;
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <IconComp size={15} strokeWidth={1.8} style={{ color: isSelected ? '#2563EB' : tk.textSecondary, flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                  {isSelected && <Check size={14} style={{ color: '#2563EB', flexShrink: 0 }} />}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div style={{
                padding: '16px 12px', textAlign: 'center',
                fontSize: 13, color: tk.textMuted,
                fontFamily: "'Inter', sans-serif",
              }}>
                No matching fields
              </div>
            )}
          </div>

          {/* Clear Footer */}
          {isActive && (
            <div style={{ padding: '6px 12px', borderTop: `1px solid ${tk.borderSubtle}` }}>
              <button
                onClick={() => { onChange(noneKey); setOpen(false); setSearch(''); }}
                className="focus:outline-none"
                style={{
                  border: 'none', background: 'transparent',
                  color: tk.textMuted,
                  fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  padding: '4px 0',
                  transition: 'color 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                onMouseLeave={e => (e.currentTarget.style.color = tk.textMuted)}
              >
                Clear grouping
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
