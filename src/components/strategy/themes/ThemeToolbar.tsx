/**
 * ThemeToolbar — Search, filters, view toggle, actions
 */
import { Search, List, LayoutGrid, GanttChart, Network, Download, Plus } from 'lucide-react';
import type { StrategicTheme, ThemeView } from '@/types/strategic-themes';
import { BSC_FILTER_OPTIONS } from './theme-utils';

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
}

const viewOptions: { key: ThemeView; icon: typeof List; label: string }[] = [
  { key: 'list', icon: List, label: 'List' },
  { key: 'board', icon: LayoutGrid, label: 'Board' },
  { key: 'timeline', icon: GanttChart, label: 'Timeline' },
  { key: 'alignment', icon: Network, label: 'Map' },
];

const baseSelectStyle: React.CSSProperties = {
  fontSize: 12, height: 32, borderRadius: 6,
  border: '1px solid #E2E8F0', background: '#FFFFFF',
  color: '#334155', padding: '0 8px', outline: 'none',
  cursor: 'pointer', width: 'auto', minWidth: 0,
};

function filterStyle(hasValue: boolean): React.CSSProperties {
  return {
    ...baseSelectStyle,
    ...(hasValue ? { background: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' } : {}),
  };
}

export function ThemeToolbar(props: Props) {
  const owners = [...new Set(props.themes.map(t => t.owner_name).filter(Boolean))];
  const fiscalYears = [...new Set(props.themes.map(t => t.fiscal_year))].sort();

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        padding: '10px 0',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: 16,
      }}
    >
      {/* Search */}
      <div className="relative" style={{ width: 240 }}>
        <Search size={14} color="#94A3B8" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search themes..."
          value={props.search}
          onChange={e => props.onSearchChange(e.target.value)}
          className="w-full"
          style={{
            ...baseSelectStyle,
            paddingLeft: 30,
            minWidth: 'unset',
          }}
        />
      </div>

      {/* Status filter */}
      <select value={props.statusFilter} onChange={e => props.onStatusFilterChange(e.target.value)} style={filterStyle(!!props.statusFilter)}>
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>

      {/* Owner filter */}
      <select value={props.ownerFilter} onChange={e => props.onOwnerFilterChange(e.target.value)} style={filterStyle(!!props.ownerFilter)}>
        <option value="">All Owners</option>
        {owners.map(o => <option key={o} value={o!}>{o}</option>)}
      </select>

      {/* BSC filter */}
      <select value={props.bscFilter} onChange={e => props.onBscFilterChange(e.target.value)} style={filterStyle(!!props.bscFilter)}>
        <option value="">All BSC</option>
        {BSC_FILTER_OPTIONS.map(o => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
        <option value="__none__">None (Untagged)</option>
      </select>

      {/* FY filter */}
      <select value={props.fyFilter} onChange={e => props.onFyFilterChange(e.target.value)} style={filterStyle(!!props.fyFilter)}>
        <option value="">All FY</option>
        {fiscalYears.map(fy => <option key={fy} value={String(fy)}>FY{fy}</option>)}
      </select>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: '#E2E8F0', margin: '0 4px' }} />

      {/* View toggle */}
      <div className="flex items-center rounded-md overflow-hidden border" style={{ borderColor: '#E2E8F0' }}>
        {viewOptions.map(v => (
          <button
            key={v.key}
            onClick={() => props.onViewChange(v.key)}
            title={v.label}
            className="flex items-center justify-center"
            style={{
              width: 34, height: 30,
              background: props.view === v.key ? '#EFF6FF' : '#FFFFFF',
              color: props.view === v.key ? '#2563EB' : '#64748B',
              border: 'none', cursor: 'pointer',
              borderRight: '1px solid #E2E8F0',
            }}
          >
            <v.icon size={15} strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Export */}
      <button
        className="flex items-center gap-1.5 rounded-md"
        style={{
          fontSize: 12, fontWeight: 500, height: 32,
          padding: '0 12px', border: '1px solid #E2E8F0',
          background: '#FFFFFF', color: '#334155', cursor: 'pointer',
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
          background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
          borderRadius: 6,
        }}
      >
        <Plus size={14} /> New Theme
      </button>
    </div>
  );
}
