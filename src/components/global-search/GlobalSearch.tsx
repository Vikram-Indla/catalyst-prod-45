import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Clock, SlidersHorizontal, LayoutGrid, Home,
  Filter, FileEdit, Users2, ChevronRight, X
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import {
  useRecentItems, useRecentSearches, useSearchResults,
  useTrackView, useSaveSearch
} from '@/hooks/useGlobalSearch';
import type { SearchResult, ActiveFilters, SearchHub, WorkItemType } from '@/types/global-search';

const HUB_ROUTES: Record<string, string> = {
  StrategyHub: '/strategy-hub',
  ProductHub: '/product-hub',
  ProjectHub: '/project-hub',
  ReleaseHub: '/release-hub',
  TestHub: '/test-hub',
  IncidentHub: '/incident-hub',
  TaskHub: '/task-hub',
  PlanHub: '/plan-hub',
};

const HUB_COLORS: Record<string, string> = {
  StrategyHub: '#7C3AED',
  ProductHub: '#3F3F46',
  ProjectHub: '#2563EB',
  ReleaseHub: '#0D9488',
  TestHub: '#16A34A',
  IncidentHub: '#DC2626',
  TaskHub: '#64748B',
  PlanHub: '#D97706',
};

const WORK_ITEM_ICONS: Record<string, string> = {
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,17 C14.761,17 17,14.761 17,12 C17,9.239 14.761,7 12,7 C9.239,7 7,9.239 7,12 C7,14.761 9.239,17 12,17 Z"/></svg>`,
  task: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
  story: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M15.647,19.515 L16.937,17.987 L12,13.82 L7.061,17.987 L7,18.153 L7,6.688 C7,6.348 7.412,6 8,6 L16,6 C16.587,6 17,6.349 17,6.688 L17,18.153 L15.647,19.515 C16.885,20.56 19,19.821 19,18.153 L19,6.688 C19,5.162 17.623,4 16,4 L8,4 C6.376,4 5,5.161 5,6.688 L5,18.153 C5,19.821 7.113,20.56 8.351,19.515 L12,16.437 Z"/></svg>`,
  epic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#6554C0" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M18.188,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.803 14.31,3 13.313,3 L5,12.8 C5,13.81 5.819,14.399 6.77,14.56 L9.875,14.574 L9.875,19.2 C9.875,20.197 10.69,21 11.688,21 L20,11.2 C20,10.203 19.185,9.4 18.188,9.4 Z"/></svg>`,
  incident: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M8.829,12 L7.923,15 L16.077,15 L15.171,12 Z M9.433,10 L14.567,10 L12.957,4.668 C12.289,4 11.043,4.668 9.433,10 Z M17,17 L7,17 L6,17 C5.448,17 5,17.448 5,18 L5,20 L19,20 L19,18 C19,17.448 18.552,17 18,17 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  new_feature: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M13,11 L13,5 C13,4.448 12.552,4 12,4 C11.448,4 11,4.448 11,5 L11,11 L5,11 C4.448,11 4,11.448 4,12 C4,12.552 4.448,13 5,13 L11,13 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 L13,13 L19,13 C19.552,13 20,12.552 20,12 C20,11.448 19.552,11 19,11 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  improvement: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M13,7.422 L16.284,10.707 C16.674,11.098 17.307,11.098 17.698,10.707 C18.088,10.317 18.088,9.684 17.698,9.293 L12.7,4.293 C12.31,3.902 11.676,3.902 11.286,4.293 L6.288,9.293 C5.897,9.684 5.897,10.317 6.288,10.707 C6.679,11.098 7.312,11.098 7.702,10.707 L11,7.408 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z"/></svg>`,
  subtask: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z"/></svg>`,
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 2, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* FIX 1 — Icon type mapper */
function mapToIconType(raw: string | null | undefined): string {
  if (!raw) return 'task';
  const val = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (val.includes('bug') || val.includes('qa')) return 'bug';
  if (val.includes('story')) return 'story';
  if (val.includes('epic')) return 'epic';
  if (val.includes('incident')) return 'incident';
  if (val.includes('feature')) return 'new_feature';
  if (val.includes('improvement')) return 'improvement';
  if (val.includes('subtask') || val.includes('sub')) return 'subtask';
  if (val.includes('change')) return 'changes';
  if (val.includes('question')) return 'question';
  return 'task';
}

/* Section label style (FIX 6) */
const sectionLabelStyle: React.CSSProperties = {
  textTransform: 'uppercase', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.08em', color: '#5E6C84', padding: '8px 12px 4px',
};

/* Dot separator style (FIX 2) */
const dotStyle: React.CSSProperties = {
  width: 2, height: 2, borderRadius: '50%', background: '#C1C7D0',
  display: 'inline-block', margin: '0 4px', verticalAlign: 'middle',
};

/* ━━━ ResultRow (FIX 2) ━━━ */
function ResultRow({ item, query, onClick }: { item: SearchResult; query: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        height: 44, display: 'flex', alignItems: 'center', padding: '0 12px',
        gap: 10, cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* icon */}
      <span
        style={{ width: 32, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[mapToIconType(item.item_type)] ?? WORK_ITEM_ICONS.task }}
      />
      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: '#172B4D', fontWeight: 400, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#0052CC', marginRight: 6, fontWeight: 500 }}>
            {item.item_key}
          </span>
          {highlightMatch(item.title, query)}
        </div>
        <div style={{ fontSize: 11, color: '#6B778C', lineHeight: 1.3, display: 'flex', alignItems: 'center' }}>
          Catalyst
          <span style={dotStyle} />
          {item.item_type.replace('_', ' ')}
          {item.project_name && (
            <>
              <span style={dotStyle} />
              {item.project_name}
            </>
          )}
          {item.assignee_name && (
            <>
              <span style={dotStyle} />
              {item.assignee_name}
            </>
          )}
        </div>
      </div>
      {/* time */}
      <span style={{ fontSize: 11, color: '#6B778C', flexShrink: 0, whiteSpace: 'nowrap', paddingLeft: 12 }}>
        {relativeTime(item.viewed_at)}
      </span>
    </div>
  );
}

/* ━━━ GlobalSearch ━━━ */
export function GlobalSearch() {
  const { isOpen, open, close } = useGlobalSearchStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<ActiveFilters>({ hub: null, project: null, assignee: null, type: null });

  const recentItems = useRecentItems();
  const recentSearches = useRecentSearches();
  const { data: results = [], isLoading } = useSearchResults(debouncedQuery, filters);
  const trackView = useTrackView();
  const saveSearch = useSaveSearch();

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setFilters({ hub: null, project: null, assignee: null, type: null });
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 250);
  }, []);

  const onResultClick = useCallback((item: SearchResult) => {
    trackView.mutate(item);
    if (debouncedQuery) saveSearch.mutate(debouncedQuery);
    navigate(HUB_ROUTES[item.hub] + '?openItem=' + item.id);
    close();
  }, [debouncedQuery, navigate, close, trackView, saveSearch]);

  /* FIX 5 — chip style */
  const chipStyle = (active: boolean): React.CSSProperties => ({
    height: 24, padding: '0 8px', border: `1px solid ${active ? '#93C5FD' : '#DFE1E6'}`,
    borderRadius: 4, fontSize: 11, color: active ? '#1D4ED8' : '#42526E',
    background: active ? '#EFF6FF' : '#FAFAFA', cursor: 'pointer', gap: 4,
    flexShrink: 0, display: 'flex', alignItems: 'center',
  });

  const HUB_OPTIONS = ['All Hubs', 'StrategyHub', 'ProductHub', 'ProjectHub', 'ReleaseHub', 'TestHub', 'IncidentHub', 'TaskHub', 'PlanHub'];
  const TYPE_OPTIONS = ['All Types', 'bug', 'task', 'story', 'epic', 'incident', 'new_feature', 'improvement'];

  const recents = recentItems.data ?? [];
  const searches = recentSearches.data ?? [];
  const hasQuery = debouncedQuery.length >= 2;

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent
        style={{
          padding: 0, width: 640, maxWidth: '95vw', borderRadius: 8,
          border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column',
          maxHeight: '80vh', gap: 0, overflow: 'hidden',
          backgroundColor: '#ffffff', color: '#0F172A',
        }}
        className="!p-0 !bg-white"
      >
        {/* LAYER 1 — Search row (FIX 4) */}
        <div style={{
          height: 44, borderBottom: '1px solid #E2E8F0', padding: '0 14px',
          gap: 10, display: 'flex', alignItems: 'center', flexShrink: 0,
          backgroundColor: '#ffffff',
        }}>
          <Search size={15} color="#94A3B8" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') close(); }}
            placeholder="Search Catalyst..."
            style={{
              border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif',
              fontSize: 14, color: '#172B4D', flex: 1, background: 'transparent',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setDebouncedQuery(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} color="#94A3B8" />
            </button>
          )}
          <kbd style={{
            fontSize: 10, background: '#F1F5F9', border: '1px solid #E2E8F0',
            borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', color: '#64748B',
          }}>ESC</kbd>
        </div>

        {/* LAYER 2 — Filter row (FIX 5) */}
        <div style={{
          height: 36, padding: '0 12px', borderBottom: '1px solid #F1F5F9', flexShrink: 0,
          gap: 6, display: 'flex', alignItems: 'center',
          backgroundColor: '#ffffff',
        }}>
          <button style={{
            width: 24, height: 24, border: '1px solid #DFE1E6', borderRadius: 4,
            background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 0,
          }}>
            <SlidersHorizontal size={12} color="#64748B" />
          </button>

          {/* Hub filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={chipStyle(!!filters.hub)}>
                {filters.hub ?? 'Hub'}
                <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ backgroundColor: '#ffffff', zIndex: 9999 }}>
              {HUB_OPTIONS.map(h => (
                <DropdownMenuItem key={h} onClick={() => setFilters(f => ({ ...f, hub: h === 'All Hubs' ? null : h as SearchHub }))}>
                  {h}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Project filter (clear only) */}
          <button style={chipStyle(!!filters.project)} onClick={() => setFilters(f => ({ ...f, project: null }))}>
            {filters.project ?? 'Project'}
            <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
          </button>

          {/* Assignee filter (clear only) */}
          <button style={chipStyle(!!filters.assignee)} onClick={() => setFilters(f => ({ ...f, assignee: null }))}>
            {filters.assignee ?? 'Assignee'}
            <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
          </button>

          {/* Type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={chipStyle(!!filters.type)}>
                {filters.type ? filters.type.replace('_', ' ') : 'Type'}
                <ChevronRight size={8} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ backgroundColor: '#ffffff', zIndex: 9999 }}>
              {TYPE_OPTIONS.map(t => (
                <DropdownMenuItem key={t} onClick={() => setFilters(f => ({ ...f, type: t === 'All Types' ? null : t as WorkItemType }))}>
                  {t === 'All Types' ? t : t.replace('_', ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* LAYER 3 — Scroll body */}
        <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {isLoading && hasQuery ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F1F5F9' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, width: '60%', background: '#F1F5F9', borderRadius: 3, marginBottom: 6 }} />
                  <div style={{ height: 9, width: '40%', background: '#F8FAFC', borderRadius: 3 }} />
                </div>
              </div>
            ))
          ) : !hasQuery ? (
            <>
              {/* Suggestions (FIX 3) */}
              {recents.slice(0, 2).map(item => (
                <div
                  key={`sug-${item.id}`}
                  onClick={() => onResultClick(item)}
                  style={{ height: 42, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Search size={14} color="#64748B" />
                  <div style={{ flex: 1, fontSize: 13, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 14, height: 14, borderRadius: 3,
                      background: HUB_COLORS[item.hub] ?? '#64748B', color: '#ffffff',
                      fontSize: 8, fontWeight: 700, flexShrink: 0,
                      verticalAlign: 'middle', marginRight: 2,
                    }}>
                      {item.hub?.[0] ?? 'C'}
                    </span>
                    {item.hub} items in {item.project_name ?? item.hub}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF',
                      borderRadius: 3, padding: '1px 5px', marginLeft: 6,
                    }}>★ AI</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#6B778C' }}>Suggestion</span>
                </div>
              ))}

              {/* Recent searches */}
              {searches.map(s => (
                <div
                  key={s.id}
                  onClick={() => { setQuery(s.query); setDebouncedQuery(s.query); }}
                  style={{ height: 42, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Clock size={14} color="#94A3B8" />
                  <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>{s.query}</span>
                  <span style={{ fontSize: 11, color: '#6B778C' }}>Recent search</span>
                </div>
              ))}

              {/* Recent items (FIX 6 label) */}
              {recents.length > 0 && (
                <>
                  <div style={sectionLabelStyle}>Recent</div>
                  {recents.map(item => (
                    <ResultRow key={item.id} item={item} query="" onClick={() => onResultClick(item)} />
                  ))}
                </>
              )}
              {recents.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  Start typing to search across all hubs
                </div>
              )}
            </>
          ) : (
            <>
              <div style={sectionLabelStyle}>Results</div>
              {results.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </div>
              ) : (
                results.map(item => (
                  <ResultRow key={item.id} item={item} query={debouncedQuery} onClick={() => onResultClick(item)} />
                ))
              )}
            </>
          )}
        </div>

        {/* LAYER 4 — Bottom tab bar (FIX 7) */}
        <div style={{
          height: 36, borderTop: '1px solid #E2E8F0', background: '#FAFAFA',
          padding: '0 8px', display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0,
        }}>
          <ChevronRight size={12} color="#94A3B8" style={{ marginRight: 4 }} />
          <div style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 4px' }} />
          {[
            { label: 'Boards', icon: LayoutGrid, path: '/project-hub' },
            { label: 'Hubs', icon: Home, path: '/' },
            { label: 'Filters', icon: Filter, path: '/project-hub' },
            { label: 'Projects', icon: FileEdit, path: '/project-hub' },
            { label: 'Teams', icon: Users2, path: '/' },
          ].map(tab => (
            <button
              key={tab.label}
              onClick={() => { navigate(tab.path); close(); }}
              style={{
                height: 36, padding: '0 10px', fontSize: 11, color: '#6B778C',
                background: 'none', border: 'none', borderBottom: '2px solid transparent',
                cursor: 'pointer', gap: 5, display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F4F5F7';
                e.currentTarget.style.color = '#172B4D';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#6B778C';
              }}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ━━━ GlobalSearchTrigger ━━━ */
export function GlobalSearchTrigger() {
  const { open } = useGlobalSearchStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
    };
    const onCustom = () => open();
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-global-search', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-global-search', onCustom);
    };
  }, [open]);

  return (
    <div
      onClick={open}
      style={{
        height: 32, minWidth: 200, padding: '0 10px',
        border: '1px solid #E2E8F0', borderRadius: 6, background: '#F8FAFC',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#CBD5E1';
        e.currentTarget.style.background = 'white';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E2E8F0';
        e.currentTarget.style.background = '#F8FAFC';
      }}
    >
      <Search size={13} color="#94A3B8" />
      <span style={{ flex: 1, fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Search...</span>
      <kbd style={{ fontSize: 10, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', color: '#64748B' }}>⌘</kbd>
      <kbd style={{ fontSize: 10, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', color: '#64748B' }}>K</kbd>
    </div>
  );
}
