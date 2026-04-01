import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, SlidersHorizontal, LayoutGrid, Home, Filter, FileEdit, Users2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger,
  DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { useRecentItems, useSearchResults, useTrackView, useSaveSearch } from '@/hooks/useGlobalSearch';
import type { SearchResult, ActiveFilters, SearchHub, WorkItemType } from '@/types/global-search';

const ICONS: Record<string, string> = {
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#E5493A" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,17 C14.761,17 17,14.761 17,12 C17,9.239 14.761,7 12,7 C9.239,7 7,9.239 7,12 C7,14.761 9.239,17 12,17 Z"/></svg>`,
  task: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
  story: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#63BA3C" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M15.647,19.515 L16.937,17.987 L12,13.82 L7.061,17.987 L7,18.153 L7,6.688 C7,6.348 7.412,6 8,6 L16,6 C16.587,6 17,6.349 17,6.688 L17,18.153 Z"/></svg>`,
  epic: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#904EE2" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M18.188,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.803 14.31,3 13.313,3 L5,12.8 C5,13.81 5.819,14.399 6.77,14.56 L9.875,14.574 L9.875,19.2 C9.875,20.197 10.69,21 11.688,21 L20,11.2 C20,10.203 19.185,9.4 18.188,9.4 Z"/></svg>`,
  incident: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#E5493A" fill-rule="evenodd" d="M8.829,12 L7.923,15 L16.077,15 L15.171,12 Z M9.433,10 L14.567,10 L12.957,4.668 C12.289,4 11.043,4.668 9.433,10 Z M17,17 L7,17 L6,17 C5.448,17 5,17.448 5,18 L5,20 L19,20 L19,18 C19,17.448 18.552,17 18,17 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  new_feature: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#63BA3C" fill-rule="evenodd" d="M13,11 L13,5 C13,4.448 12.552,4 12,4 C11.448,4 11,4.448 11,5 L11,11 L5,11 C4.448,11 4,11.448 4,12 C4,12.552 4.448,13 5,13 L11,13 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 L13,13 L19,13 C19.552,13 20,12.552 20,12 C20,11.448 19.552,11 19,11 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  improvement: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#4BADE8" fill-rule="evenodd" d="M13,7.422 L16.284,10.707 C16.674,11.098 17.307,11.098 17.698,10.707 C18.088,10.317 18.088,9.684 17.698,9.293 L12.7,4.293 C12.31,3.902 11.676,3.902 11.286,4.293 L6.288,9.293 C5.897,9.684 5.897,10.317 6.288,10.707 C6.679,11.098 7.312,11.098 7.702,10.707 L11,7.408 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
};

const HUB_COLORS: Record<string, string> = {
  StrategyHub: '#7C3AED', ProductHub: '#3F3F46', ProjectHub: '#2563EB',
  ReleaseHub: '#0D9488', TestHub: '#16A34A', IncidentHub: '#DC2626',
  TaskHub: '#64748B', PlanHub: '#D97706',
};

const HUB_ROUTES: Record<string, string> = {
  StrategyHub: '/strategy-hub', ProductHub: '/product-hub', ProjectHub: '/project-hub',
  ReleaseHub: '/release-hub', TestHub: '/test-hub', IncidentHub: '/incident-hub',
  TaskHub: '/task-hub', PlanHub: '/plan-hub',
};

function mapType(raw: string | null | undefined): string {
  if (!raw) return 'task';
  const v = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (v.includes('bug') || v.includes('qa')) return 'bug';
  if (v.includes('story')) return 'story';
  if (v.includes('epic')) return 'epic';
  if (v.includes('incident')) return 'incident';
  if (v.includes('feature')) return 'new_feature';
  if (v.includes('improve')) return 'improvement';
  return 'task';
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function hlText(text: string, q: string) {
  if (!q) return <>{text}</>;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return <>{text.split(re).map((p, i) =>
    re.test(p) ? <mark key={i} style={{ background: '#FFF0B3', color: '#172B4D', borderRadius: 2, padding: '0 1px' }}>{p}</mark> : p
  )}</>;
}

const DOT = <span style={{ margin: '0 4px', color: '#C1C7D0', fontSize: 10 }}>·</span>;

/* ── Row ─────────────────────────────────────────────────── */
function Row({ item, query, onClick }: { item: SearchResult; query: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const icon = ICONS[mapType(item.item_type)] ?? ICONS.task;
  const meta = [
    item.project_name ?? item.hub,
    item.item_type?.replace(/_/g, ' ') ?? 'task',
    item.assignee_name,
    timeAgo(item.viewed_at),
  ].filter(Boolean);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', height: 40,
        padding: '0 14px', gap: 10, cursor: 'pointer',
        background: hov ? '#F4F5F7' : '#fff',
        borderBottom: '1px solid #F4F5F7', flexShrink: 0,
      }}
    >
      <span style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: icon }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, overflow: 'hidden' }}>
          <span style={{
            fontFamily: "'SFMono-Regular',Consolas,monospace",
            fontSize: 11, fontWeight: 600, color: '#0052CC', flexShrink: 0,
          }}>{item.item_key}</span>
          <span style={{
            fontSize: 12, color: '#172B4D', fontWeight: 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>{hlText(item.title, query)}</span>
        </div>
        <div style={{
          fontSize: 11, color: '#6B778C', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {meta.map((seg, i) => (
            <span key={i}>
              {i > 0 && DOT}
              {seg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── SectionLabel ──────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      textTransform: 'uppercase', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.08em', color: '#5E6C84', padding: '6px 14px 3px',
      background: '#fff',
    }}>{text}</div>
  );
}

/* ── SuggestionRow ─────────────────────────────────────── */
function SuggestionRow({ text, onClick }: { text: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', height: 36,
        padding: '0 14px', gap: 10, cursor: 'pointer',
        background: hov ? '#F4F5F7' : '#fff',
        borderBottom: '1px solid #F4F5F7',
      }}
    >
      <Search size={13} color="#94A3B8" />
      <span style={{ flex: 1, fontSize: 13, color: '#172B4D', display: 'flex', alignItems: 'center' }}>
        {text}
        <span style={{
          marginLeft: 6, fontSize: 10, fontWeight: 600,
          color: '#7C3AED', background: '#F5F3FF',
          borderRadius: 3, padding: '1px 5px',
          display: 'inline-flex', alignItems: 'center',
        }}>✦ AI</span>
      </span>
      <span style={{ fontSize: 11, color: '#97A0AF' }}>Suggestion</span>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────── */
export function GlobalSearch() {
  const { isOpen, close } = useGlobalSearchStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout>>();

  const [query, setQuery] = useState('');
  const [dq, setDq] = useState('');
  const [visible, setVisible] = useState(10);
  const [activeTab, setActiveTab] = useState('boards');
  const [filters, setFilters] = useState<ActiveFilters>({
    hub: null, project: null, assignee: null, type: null,
  });

  const { data: recents = [] } = useRecentItems();
  const { data: results = [], isLoading } = useSearchResults(dq, filters);
  const trackView = useTrackView();
  const saveSearch = useSaveSearch();

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 40);
    else { setQuery(''); setDq(''); setVisible(10); setFilters({ hub: null, project: null, assignee: null, type: null }); }
  }, [isOpen]);

  const onInput = useCallback((v: string) => {
    setQuery(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDq(v), 220);
  }, []);

  const onResultClick = useCallback((item: SearchResult) => {
    trackView.mutate(item);
    if (dq) saveSearch.mutate(dq);
    navigate(`${HUB_ROUTES[item.hub] ?? '/'}?openItem=${item.id}`);
    close();
  }, [dq, trackView, saveSearch, navigate, close]);

  const setFilter = useCallback(<K extends keyof ActiveFilters>(k: K, v: ActiveFilters[K]) => {
    setFilters(p => ({ ...p, [k]: p[k] === v ? null : v }));
  }, []);

  const suggestions = useMemo(() => {
    if (!recents.length) return [];
    const bugCount = recents.filter(i => mapType(i.item_type) === 'bug').length;
    const projMap: Record<string, number> = {};
    const asnMap: Record<string, number> = {};
    recents.forEach(i => {
      const p = i.project_name ?? i.hub;
      projMap[p] = (projMap[p] ?? 0) + 1;
      if (i.assignee_name) asnMap[i.assignee_name] = (asnMap[i.assignee_name] ?? 0) + 1;
    });
    const topP = Object.entries(projMap).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topA = Object.entries(asnMap).sort((a, b) => b[1] - a[1])[0]?.[0];
    const s: string[] = [];
    if (bugCount > 0 && topP) s.push(`Open bugs in ${topP}`);
    if (topA && topP) s.push(`Items assigned to ${topA} in ${topP}`);
    return s.slice(0, 2);
  }, [recents]);

  const showSearch = dq.length >= 2;
  const HUBS: SearchHub[] = ['StrategyHub', 'ProductHub', 'ProjectHub', 'ReleaseHub', 'TestHub', 'IncidentHub', 'TaskHub', 'PlanHub'];
  const TYPES: WorkItemType[] = ['bug', 'task', 'story', 'epic', 'incident', 'new_feature', 'improvement'];
  const TABS = [
    { id: 'boards', label: 'Boards', icon: <LayoutGrid size={12} /> },
    { id: 'hubs', label: 'Hubs', icon: <Home size={12} /> },
    { id: 'filters', label: 'Filters', icon: <Filter size={12} /> },
    { id: 'projects', label: 'Projects', icon: <FileEdit size={12} /> },
    { id: 'teams', label: 'Teams', icon: <Users2 size={12} /> },
  ];
  const TAB_ROUTES: Record<string, string> = {
    boards: '/project-hub', hubs: '/', filters: '/project-hub',
    projects: '/project-hub', teams: '/',
  };

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && close()}>
      <DialogContent
        className="!p-0 !bg-white"
        style={{
          padding: 0, width: 680, maxWidth: '92vw', borderRadius: 12,
          border: 'none', display: 'flex', flexDirection: 'column',
          maxHeight: 600, gap: 0, overflow: 'hidden',
          backgroundColor: '#ffffff', color: '#0F172A',
          boxShadow: '0 8px 40px rgba(15,23,42,0.15), 0 2px 8px rgba(15,23,42,0.08)',
          position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        }}
      >
        {/* ROW 1 — Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 44,
          padding: '0 14px', gap: 8, borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#ffffff', flexShrink: 0,
        }}>
          <Search size={15} color="#94A3B8" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => onInput(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && close()}
            placeholder="Search Catalyst..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, fontFamily: 'Inter,sans-serif',
              color: '#172B4D', background: 'transparent',
              caretColor: '#2563EB',
            }}
          />
          {query && (
            <button
              onClick={() => onInput('')}
              style={{
                width: 20, height: 20, borderRadius: 3, border: 'none',
                background: 'transparent', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#97A0AF', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; e.currentTarget.style.color = '#172B4D'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#97A0AF'; }}
            >
              <X size={12} />
            </button>
          )}
          <button
            onClick={close}
            style={{
              width: 24, height: 24, borderRadius: 4, border: 'none',
              background: 'transparent', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#97A0AF', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; e.currentTarget.style.color = '#172B4D'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#97A0AF'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ROW 2 — Filter chips */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 36,
          padding: '0 12px', gap: 6, borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#ffffff', flexShrink: 0,
        }}>
          <button style={{
            width: 22, height: 22, border: '1px solid #DFE1E6', borderRadius: 3,
            background: '#FAFAFA', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
            <SlidersHorizontal size={11} color="#64748B" />
          </button>

          {/* Hub */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{
                height: 22, padding: '0 8px', border: `1px solid ${filters.hub ? '#93C5FD' : '#DFE1E6'}`,
                borderRadius: 3, fontSize: 11, color: filters.hub ? '#1D4ED8' : '#42526E',
                background: filters.hub ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {filters.hub ?? 'Hub'}
                <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ backgroundColor: '#ffffff', zIndex: 9999 }}>
              <DropdownMenuItem onClick={() => setFilter('hub', null as any)}>All Hubs</DropdownMenuItem>
              {HUBS.map(h => (
                <DropdownMenuItem key={h} onClick={() => setFilter('hub', h)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: HUB_COLORS[h] }} />
                    {h}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{
                height: 22, padding: '0 8px', border: `1px solid ${filters.type ? '#93C5FD' : '#DFE1E6'}`,
                borderRadius: 3, fontSize: 11, color: filters.type ? '#1D4ED8' : '#42526E',
                background: filters.type ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {filters.type ? filters.type.replace(/_/g, ' ') : 'Type'}
                <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ backgroundColor: '#ffffff', zIndex: 9999 }}>
              <DropdownMenuItem onClick={() => setFilter('type', null as any)}>All Types</DropdownMenuItem>
              {TYPES.map(t => (
                <DropdownMenuItem key={t} onClick={() => setFilter('type', t)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14 }} dangerouslySetInnerHTML={{ __html: ICONS[t] ?? ICONS.task }} />
                    {t.replace(/_/g, ' ')}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{
                height: 22, padding: '0 8px', border: `1px solid ${filters.project ? '#93C5FD' : '#DFE1E6'}`,
                borderRadius: 3, fontSize: 11, color: filters.project ? '#1D4ED8' : '#42526E',
                background: filters.project ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {filters.project ?? 'Project'}
                <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ backgroundColor: '#ffffff', zIndex: 9999 }}>
              <DropdownMenuItem onClick={() => setFilter('project', null as any)}>All Projects</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{
                height: 22, padding: '0 8px', border: `1px solid ${filters.assignee ? '#93C5FD' : '#DFE1E6'}`,
                borderRadius: 3, fontSize: 11, color: filters.assignee ? '#1D4ED8' : '#42526E',
                background: filters.assignee ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {filters.assignee ?? 'Assignee'}
                <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ backgroundColor: '#ffffff', zIndex: 9999 }}>
              <DropdownMenuItem onClick={() => setFilter('assignee', null as any)}>All Assignees</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ROW 3 — Scroll body */}
        <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#ffffff', maxHeight: 'calc(600px - 44px - 36px - 36px)' }}>

          {!showSearch && (
            <>
              {/* Suggestions */}
              {suggestions.map((s, i) => (
                <SuggestionRow key={`sug-${i}`} text={s} onClick={() => { setQuery(s); setDq(s); }} />
              ))}

              {/* Recent items */}
              {recents.length > 0 && (
                <>
                  <SectionLabel text="Recent" />
                  {recents.slice(0, visible).map(item => (
                    <Row key={item.id} item={item} query="" onClick={() => onResultClick(item)} />
                  ))}
                  {recents.length > visible && (
                    <button
                      onClick={() => setVisible(v => v + 10)}
                      style={{
                        width: '100%', height: 34, border: 'none',
                        borderTop: '1px solid #F4F5F7', background: '#fff',
                        fontSize: 12, color: '#0052CC', fontWeight: 500,
                        fontFamily: 'Inter,sans-serif', cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      Show more results
                    </button>
                  )}
                </>
              )}

              {!recents.length && !suggestions.length && (
                <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Start typing to search across all hubs
                </div>
              )}
            </>
          )}

          {showSearch && (
            <>
              <SectionLabel text="Results" />
              {isLoading && [1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 14px', gap: 10, borderBottom: '1px solid #F4F5F7' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#F1F5F9' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 10, width: '60%', background: '#F1F5F9', borderRadius: 3, marginBottom: 4 }} />
                    <div style={{ height: 8, width: '40%', background: '#F8FAFC', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
              {!isLoading && results.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                  No results for &ldquo;{dq}&rdquo;
                </div>
              )}
              {!isLoading && results.map(item => (
                <Row key={item.id} item={item} query={dq} onClick={() => onResultClick(item)} />
              ))}
            </>
          )}
        </div>

        {/* ROW 4 — Bottom tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 36,
          borderTop: '1px solid #E2E8F0', backgroundColor: '#FAFAFA',
          padding: '0 10px', gap: 0, flexShrink: 0,
        }}>
          <span style={{ flex: 1 }} />
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); navigate(TAB_ROUTES[t.id]); close(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 34, padding: '0 10px', fontSize: 11,
                fontFamily: 'Inter,sans-serif', color: activeTab === t.id ? '#172B4D' : '#6B778C',
                background: 'none', border: 'none',
                borderBottom: activeTab === t.id ? '2px solid #172B4D' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Trigger ───────────────────────────────────────────── */
export function GlobalSearchTrigger() {
  const { open } = useGlobalSearchStore();

  useEffect(() => {
    const kb = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); } };
    const ce = () => open();
    document.addEventListener('keydown', kb);
    window.addEventListener('open-global-search', ce);
    return () => { document.removeEventListener('keydown', kb); window.removeEventListener('open-global-search', ce); };
  }, [open]);

  return (
    <div
      onClick={open}
      style={{
        height: 32, minWidth: 200, padding: '0 10px',
        border: '1px solid #DFE1E6', borderRadius: 6,
        background: '#F4F5F7', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; e.currentTarget.style.borderColor = '#C1C7D0'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
    >
      <Search size={13} color="#94A3B8" />
      <span style={{ flex: 1, fontSize: 12, color: '#94A3B8', fontFamily: 'Inter,sans-serif' }}>Search...</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {['⌘', 'K'].map(k => (
          <kbd key={k} style={{
            fontSize: 10, background: '#E4E7EB', border: '1px solid #D5D9E0',
            borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', color: '#626F86',
          }}>{k}</kbd>
        ))}
      </div>
    </div>
  );
}
