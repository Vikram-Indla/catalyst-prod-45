/**
 * ThemeToolbar — Search, filters (Radix Select), view toggle, actions
 * ECLIPSE D8-R4: Dark mode parity
 */
import { Search, List, LayoutGrid, GanttChart, Download, Plus, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StrategicTheme, ThemeView } from '@/types/strategic-themes';
import { BSC_FILTER_OPTIONS, DK } from './theme-utils';

interface Props {
  themes: StrategicTheme[];
  view: ThemeView;
  onViewChange: (v: ThemeView) => void;
  search: string;
  onSearchChange: (s: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (s: string) => void;
  bscFilter: string;
  onBscFilterChange: (s: string) => void;
  fyFilter: string;
  onFyFilterChange: (s: string) => void;
  onNewTheme: () => void;
  isIntelligenceOpen?: boolean;
  onToggleIntelligence?: () => void;
  isDark?: boolean;
}

const viewOptions: { key: ThemeView; icon: typeof List; label: string }[] = [
  { key: 'list', icon: List, label: 'List' },
  { key: 'board', icon: LayoutGrid, label: 'Board' },
  { key: 'timeline', icon: GanttChart, label: 'Timeline' },
];

export function ThemeToolbar(props: Props) {
  const { isDark = false } = props;
  const owners = [...new Set(props.themes.map(t => t.owner_name).filter(Boolean))];
  const fiscalYears = [...new Set(props.themes.map(t => t.fiscal_year))].sort();

  const borderColor = isDark ? DK.border : 'var(--divider)';

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        padding: '10px 0',
        borderBottom: `1px solid ${borderColor}`,
        marginBottom: 16,
      }}
    >
      {/* Search */}
      <div className="relative" style={{ width: 240 }}>
        <Search size={14} color={isDark ? 'var(--cp-t3)' : 'var(--fg-4)'} className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search themes..."
          value={props.search}
          onChange={e => props.onSearchChange(e.target.value)}
          className="w-full"
          style={{
            fontSize: 12, height: 32, borderRadius: 6,
            border: `1px solid ${borderColor}`,
            background: isDark ? DK.bg : 'var(--bg-app)',
            color: isDark ? DK.t1 : 'var(--fg-2)',
            paddingLeft: 30, paddingRight: 8, outline: 'none',
          }}
        />
      </div>

      {/* Status filter */}
      <Select value={props.statusFilter || '_all'} onValueChange={v => props.onStatusFilterChange(v === '_all' ? '' : v)}>
        <SelectTrigger
          className="h-8 text-xs border-border bg-background"
          style={{
            width: 'auto', minWidth: 110,
            ...(props.statusFilter
              ? (isDark
                ? { background: 'rgba(59,130,246,0.12)', borderColor: '#3B82F6', color: '#93C5FD' }
                : { background: 'var(--cp-primary-5)', borderColor: 'var(--cp-blue)', color: 'var(--cp-blue)' })
              : {}),
          }}
        >
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          <SelectItem value="_all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="planned">Planned</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Owner filter */}
      <Select value={props.ownerFilter || '_all'} onValueChange={v => props.onOwnerFilterChange(v === '_all' ? '' : v)}>
        <SelectTrigger
          className="h-8 text-xs border-border bg-background"
          style={{
            width: 'auto', minWidth: 120,
            ...(props.ownerFilter
              ? (isDark
                ? { background: 'rgba(59,130,246,0.12)', borderColor: '#3B82F6', color: '#93C5FD' }
                : { background: 'var(--cp-primary-5)', borderColor: 'var(--cp-blue)', color: 'var(--cp-blue)' })
              : {}),
          }}
        >
          <SelectValue placeholder="All Owners" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          <SelectItem value="_all">All Owners</SelectItem>
          {owners.map(o => <SelectItem key={o} value={o!}>{o}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* BSC filter */}
      <Select value={props.bscFilter || '_all'} onValueChange={v => props.onBscFilterChange(v === '_all' ? '' : v)}>
        <SelectTrigger
          className="h-8 text-xs border-border bg-background"
          style={{
            width: 'auto', minWidth: 110,
            ...(props.bscFilter
              ? (isDark
                ? { background: 'rgba(59,130,246,0.12)', borderColor: '#3B82F6', color: '#93C5FD' }
                : { background: 'var(--cp-primary-5)', borderColor: 'var(--cp-blue)', color: 'var(--cp-blue)' })
              : {}),
          }}
        >
          <SelectValue placeholder="All BSC" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          <SelectItem value="_all">All BSC</SelectItem>
          {BSC_FILTER_OPTIONS.map(o => (
            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
          ))}
          <SelectItem value="__none__">None (Untagged)</SelectItem>
        </SelectContent>
      </Select>

      {/* FY filter */}
      <Select value={props.fyFilter || '_all'} onValueChange={v => props.onFyFilterChange(v === '_all' ? '' : v)}>
        <SelectTrigger
          className="h-8 text-xs border-border bg-background"
          style={{
            width: 'auto', minWidth: 90,
            ...(props.fyFilter
              ? (isDark
                ? { background: 'rgba(59,130,246,0.12)', borderColor: '#3B82F6', color: '#93C5FD' }
                : { background: 'var(--cp-primary-5)', borderColor: 'var(--cp-blue)', color: 'var(--cp-blue)' })
              : {}),
          }}
        >
          <SelectValue placeholder="All FY" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          <SelectItem value="_all">All FY</SelectItem>
          {fiscalYears.map(fy => <SelectItem key={fy} value={String(fy)}>FY{fy}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: borderColor, margin: '0 4px' }} />

      {/* View toggle */}
      <div className="flex items-center rounded-md overflow-hidden border" style={{ borderColor }}>
        {viewOptions.map(v => (
          <button
            key={v.key}
            onClick={() => props.onViewChange(v.key)}
            title={v.label}
            className="relative flex items-center justify-center"
            style={{
              width: 34, height: 30,
              background: props.view === v.key
                ? (isDark ? 'rgba(59,130,246,0.12)' : 'var(--cp-primary-5)')
                : (isDark ? 'transparent' : 'var(--bg-app)'),
              color: props.view === v.key
                ? (isDark ? '#93C5FD' : 'var(--cp-blue)')
                : (isDark ? 'var(--cp-t2)' : 'var(--fg-3)'),
              border: 'none', cursor: 'pointer',
              borderRight: `1px solid ${borderColor}`,
            }}
          >
            <v.icon size={15} strokeWidth={1.8} />
          </button>
        ))}
      </div>

      {/* Intelligence button */}
      {props.onToggleIntelligence && (
        <button
          onClick={props.onToggleIntelligence}
          style={{
            background: 'var(--cp-blue)',
            color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none',
            borderRadius: 20, padding: '0 16px', height: 32,
            fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'all 200ms ease',
            fontFamily: 'var(--cp-font-body)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 0 0 6px rgba(37,99,235,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = ''; }}
        >
          <Zap size={13} strokeWidth={2.2} />
          Intelligence
        </button>
      )}

      <div className="flex-1" />

      {/* Export */}
      <button
        className="flex items-center gap-1.5 rounded-md"
        style={{
          fontSize: 12, fontWeight: 500, height: 32,
          padding: '8px 12px',
          border: `1px solid ${borderColor}`,
          background: isDark ? 'transparent' : 'var(--bg-app)',
          color: isDark ? DK.t1 : 'var(--fg-2)',
          cursor: 'pointer',
        }}
      >
        <Download size={14} /> Export
      </button>

      {/* New Theme */}
      <button
        onClick={props.onNewTheme}
        className="flex items-center gap-1.5 rounded-md"
        style={{
          fontSize: 12, fontWeight: 600, height: 32,
          padding: '0 14px', border: 'none',
          background: 'var(--cp-blue)', color: 'var(--ds-text-inverse, #FFFFFF)', cursor: 'pointer',
          borderRadius: 6,
        }}
      >
        <Plus size={14} /> New Theme
      </button>
    </div>
  );
}
