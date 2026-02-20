/**
 * ThemeToolbar — Search, filters (Radix Select), view toggle, actions
 */
import { Search, List, LayoutGrid, GanttChart, Download, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  isIntelligenceOpen?: boolean;
  onToggleIntelligence?: () => void;
}

const viewOptions: { key: ThemeView; icon: typeof List; label: string }[] = [
  { key: 'list', icon: List, label: 'List' },
  { key: 'board', icon: LayoutGrid, label: 'Board' },
  { key: 'timeline', icon: GanttChart, label: 'Timeline' },
];

export function ThemeToolbar(props: Props) {
  const owners = [...new Set(props.themes.map(t => t.owner_name).filter(Boolean))];
  const fiscalYears = [...new Set(props.themes.map(t => t.fiscal_year))].sort();

  const hasActive = !!(props.statusFilter || props.ownerFilter || props.bscFilter || props.fyFilter);

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
        <Search size={14} color="#94A3B8" className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search themes..."
          value={props.search}
          onChange={e => props.onSearchChange(e.target.value)}
          className="w-full"
          style={{
            fontSize: 12, height: 32, borderRadius: 6,
            border: '1px solid #E2E8F0', background: '#FFFFFF',
            color: '#334155', paddingLeft: 30, paddingRight: 8, outline: 'none',
          }}
        />
      </div>

      {/* Status filter */}
      <Select value={props.statusFilter || '_all'} onValueChange={v => props.onStatusFilterChange(v === '_all' ? '' : v)}>
        <SelectTrigger
          className="h-8 text-xs border-border bg-background"
          style={{
            width: 'auto', minWidth: 110,
            ...(props.statusFilter ? { background: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' } : {}),
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
            ...(props.ownerFilter ? { background: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' } : {}),
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
            ...(props.bscFilter ? { background: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' } : {}),
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
            ...(props.fyFilter ? { background: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' } : {}),
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
      <div style={{ width: 1, height: 24, background: '#E2E8F0', margin: '0 4px' }} />

      {/* View toggle */}
      <div className="flex items-center rounded-md overflow-hidden border" style={{ borderColor: '#E2E8F0' }}>
        {viewOptions.map(v => (
          <button
            key={v.key}
            onClick={() => props.onViewChange(v.key)}
            title={v.label}
            className="relative flex items-center justify-center"
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

      {/* Intelligence button */}
      {props.onToggleIntelligence && (
        <button
          onClick={props.onToggleIntelligence}
          className={`group flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg transition-all duration-200 cursor-pointer ${
            props.isIntelligenceOpen
              ? 'border-[1.5px] border-purple-500 bg-purple-50'
              : 'border border-slate-200 bg-white hover:border-purple-300 hover:bg-[#FAFAFF] hover:shadow-[0_2px_8px_rgba(124,58,237,0.08)]'
          }`}
        >
          <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 ${
            props.isIntelligenceOpen ? 'bg-purple-600' : ''
          }`}
            style={props.isIntelligenceOpen ? undefined : { background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
          >
            <span className="text-white text-[9px] font-extrabold leading-none">✦</span>
          </div>
          <span className={`text-[12px] font-semibold transition-colors ${
            props.isIntelligenceOpen ? 'text-purple-700' : 'text-slate-600 group-hover:text-purple-700'
          }`}>
            Intelligence
          </span>
        </button>
      )}

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
