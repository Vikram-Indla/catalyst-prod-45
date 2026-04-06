import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, ChevronRight, Sparkles, FileText, FileDown, Video,
  ShieldCheck, Filter, Clock, Zap, BookOpen,
} from 'lucide-react';
import { useWikiKeywordSearch, useWikiAISearch } from '@/hooks/useWikiHub';
import { useDebouncedValue } from '@/hooks/useWikiData';
import { useTheme } from '@/hooks/useTheme';

/* ── Time helper ── */
function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Skeleton ── */
const Sk = ({ w, h, style, isDark }: { w: string | number; h: number; style?: React.CSSProperties; isDark?: boolean }) => (
  <div style={{
    width: w, height: h, borderRadius: 4, background: isDark ? '#1A1A1A' : '#E2E8F0',
    animation: 'pulse 1.5s ease-in-out infinite', ...style,
  }} />
);

/* ── Highlight helper ── */
function highlightText(text: string, query: string, isDark: boolean) {
  if (!query || query.length < 2 || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ background: isDark ? 'rgba(251,191,36,0.2)' : '#FEF9C3', padding: '0 1px', borderRadius: 4, color: isDark ? '#EDEDED' : undefined }}>{part}</mark>
    ) : part
  );
}

const FILTERS = [
  { key: 'all', label: 'All Domains', icon: <BookOpen size={12} /> },
  { key: 'article', label: 'Articles', icon: <FileText size={12} /> },
  { key: 'pdf', label: 'PDFs', icon: <FileDown size={12} /> },
  { key: 'video', label: 'Videos', icon: <Video size={12} /> },
  { key: 'verified', label: 'Verified Only', icon: <ShieldCheck size={12} /> },
] as const;

export default function WikiSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<'keyword' | 'ai'>('keyword');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(0);

  const debouncedQuery = useDebouncedValue(query, 300);

  const isVerifiedOnly = activeFilter === 'verified';
  const formatFilter = ['article', 'pdf', 'video'].includes(activeFilter) ? activeFilter : undefined;

  const {
    data: keywordResults,
    isLoading: kwLoading,
  } = useWikiKeywordSearch(
    mode === 'keyword' ? debouncedQuery : '',
    { format: formatFilter, verifiedOnly: isVerifiedOnly }
  );

  const {
    data: aiResults,
    isLoading: aiLoading,
  } = useWikiAISearch(mode === 'ai' ? debouncedQuery : '');

  const isLoading = mode === 'keyword' ? kwLoading : aiLoading;

  // Paginate keyword results
  const PER_PAGE = 10;
  const paginatedResults = useMemo(() => {
    if (!keywordResults) return [];
    return keywordResults.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  }, [keywordResults, page]);
  const totalPages = Math.ceil((keywordResults?.length ?? 0) / PER_PAGE);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setPage(0);
    if (val) setSearchParams({ q: val }, { replace: true });
  }, [setSearchParams]);

  const aiAnswer = aiResults?.answer;
  const aiSources = aiResults?.sources ?? [];

  const confColor = (c: number) => c >= 90 ? '#FFFFFF' : c >= 70 ? '#FFFFFF' : isDark ? '#FCD34D' : '#9A5402';
  const confBg = (c: number) => c >= 90 ? '#1B7F37' : c >= 70 ? '#0C66E4' : isDark ? 'rgba(251,191,36,0.12)' : '#FEF3C7';

  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%' }}>
      <div style={{ maxWidth: 840, marginInline: 'auto', padding: '24px 28px 48px' }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
          <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>Search</span>
        </nav>

        {/* ── Search Input ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 12, border: `1.5px solid ${borderColor}`,
          background: isDark ? '#1A1A1A' : '#FFFFFF', marginBottom: 16,
          transition: 'border-color 150ms, box-shadow 150ms',
        }}
          onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Search size={18} style={{ color: isDark ? '#878787' : '#94A3B8', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search wiki articles, documents, and more..."
            aria-label="Search wiki"
            autoFocus
            style={{
              flex: 1, fontSize: 15, fontFamily: 'Geist, -apple-system, sans-serif',
              background: 'transparent', border: 'none', outline: 'none',
              color: isDark ? '#EDEDED' : '#0F172A',
            }}
          />
          {mode === 'ai' && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999,
              background: isDark ? 'rgba(124,58,237,0.15)' : '#F5F3FF', color: '#7C3AED', display: 'inline-flex', alignItems: 'center', gap: 3,
              flexShrink: 0,
            }}><Sparkles size={10} /> AI</span>
          )}
        </div>

        {/* ── Mode toggle + filters ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex', borderRadius: 6, overflow: 'hidden',
            border: `1px solid ${borderColor}`,
          }}>
            <button onClick={() => { setMode('keyword'); setPage(0); }} style={{
              fontSize: 11, fontWeight: 650, padding: '6px 14px', cursor: 'pointer',
              border: 'none', display: 'flex', alignItems: 'center', gap: 4,
              background: mode === 'keyword' ? '#2563EB' : (isDark ? '#1A1A1A' : '#FFFFFF'),
              color: mode === 'keyword' ? '#FFFFFF' : (isDark ? '#A1A1A1' : '#64748B'),
              transition: 'all 120ms',
            }}><Zap size={11} /> Keyword</button>
            <button onClick={() => { setMode('ai'); setPage(0); }} style={{
              fontSize: 11, fontWeight: 650, padding: '6px 14px', cursor: 'pointer',
              border: 'none', borderLeft: `1px solid ${borderColor}`,
              display: 'flex', alignItems: 'center', gap: 4,
              background: mode === 'ai' ? '#7C3AED' : (isDark ? '#1A1A1A' : '#FFFFFF'),
              color: mode === 'ai' ? '#FFFFFF' : (isDark ? '#A1A1A1' : '#64748B'),
              transition: 'all 120ms',
            }}><Sparkles size={11} /> AI Search</button>
          </div>

          <div style={{ width: 1, height: 20, background: borderColor }} />

          {/* Filter chips */}
          {FILTERS.map(f => {
            const active = activeFilter === f.key;
            return (
              <button key={f.key} onClick={() => { setActiveFilter(f.key); setPage(0); }} style={{
                fontSize: 11, fontWeight: active ? 650 : 500, padding: '5px 12px',
                borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                border: active ? '1.5px solid #2563EB' : `1px solid ${borderColor}`,
                background: active ? (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF') : 'transparent',
                color: active ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'),
                transition: 'all 100ms',
              }}>{f.icon} {f.label}</button>
            );
          })}
        </div>

        {/* ── Results count ── */}
        {debouncedQuery.length >= 2 && !isLoading && (
          <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 16 }}>
            {mode === 'keyword'
              ? `${keywordResults?.length ?? 0} results for '${debouncedQuery}'`
              : aiSources.length > 0
                ? `AI answer with ${aiSources.length} sources for '${debouncedQuery}'`
                : `Searching for '${debouncedQuery}'...`
            }
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {isLoading && debouncedQuery.length >= 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
            {mode === 'ai' && (
              <div style={{ borderLeft: '3px solid #7C3AED', padding: '16px 20px', background: isDark ? '#1A1A1A' : '#FAFAFE', borderRadius: '0 6px 6px 0', marginBottom: 8 }}>
                <Sk w={120} h={14} style={{ marginBottom: 12 }} isDark={isDark} />
                <Sk w="100%" h={14} style={{ marginBottom: 6 }} isDark={isDark} />
                <Sk w="90%" h={14} style={{ marginBottom: 6 }} isDark={isDark} />
                <Sk w="70%" h={14} isDark={isDark} />
              </div>
            )}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: `0.75px solid ${borderColor}` }}>
                <Sk w="55%" h={16} style={{ marginBottom: 6 }} isDark={isDark} />
                <Sk w="30%" h={11} style={{ marginBottom: 8 }} isDark={isDark} />
                <Sk w="90%" h={13} isDark={isDark} />
              </div>
            ))}
          </div>
        )}

        {/* ── AI Search Results ── */}
        {mode === 'ai' && !aiLoading && debouncedQuery.length >= 2 && (
          <div>
            {/* AI Answer box */}
            {aiAnswer && (
              <div style={{
                borderLeft: '3px solid #7C3AED', padding: '16px 20px', marginBottom: 24,
                background: isDark ? '#1A1A1A' : '#FAFAFE', borderRadius: '0 6px 6px 0',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: isDark ? 'rgba(124,58,237,0.15)' : '#F5F3FF', color: '#7C3AED', display: 'inline-flex', alignItems: 'center', gap: 3,
                  marginBottom: 10,
                }}><Sparkles size={10} /> AI Answer</span>
                <div style={{ fontSize: 14, color: isDark ? '#A1A1A1' : '#334155', lineHeight: 1.75, marginTop: 10 }}>
                  {aiAnswer}
                </div>
                {aiSources.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `0.75px solid ${borderColor}` }}>
                    <div style={{ fontSize: 11, color: isDark ? '#878787' : '#64748B', marginBottom: 8 }}>
                      Sources used: {aiSources.length} article{aiSources.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiSources.map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#878787' : '#94A3B8',
                            minWidth: 20, textAlign: 'right' as const,
                          }}>[{i + 1}]</span>
                          <span
                            onClick={() => {
                              const slug = s.source_key || s.title?.toLowerCase().replace(/\s+/g, '-');
                              if (slug) navigate(`/wiki/${slug}`);
                            }}
                            style={{
                              fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer',
                            }}
                          >{s.title || s.source_key || 'Source'}</span>
                          {s.similarity != null && (
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
                              padding: '1px 5px', borderRadius: 4,
                              background: confBg(Math.round(s.similarity * 100)),
                              color: confColor(Math.round(s.similarity * 100)),
                            }}>{Math.round(s.similarity * 100)}%</span>
                          )}
                          <span style={{ fontSize: 11, color: isDark ? '#878787' : '#94A3B8' }}>{s.entity_type || 'wiki'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No AI results */}
            {!aiAnswer && aiSources.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>
                No AI results for '{debouncedQuery}'. Try rephrasing your question or switch to keyword search.
              </div>
            )}
          </div>
        )}

        {/* ── Keyword Search Results ── */}
        {mode === 'keyword' && !kwLoading && debouncedQuery.length >= 2 && (
          <div>
            {(keywordResults?.length ?? 0) > 0 ? (
              <>
                {paginatedResults.map((r: any) => {
                  const conf = Math.round((r.ai_confidence ?? 0) * 100);
                  const fmtIcon = r.format === 'pdf'
                    ? <FileDown size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                    : r.format === 'video'
                    ? <Video size={14} style={{ color: '#7C3AED', flexShrink: 0 }} />
                    : <FileText size={14} style={{ color: isDark ? '#878787' : '#94A3B8', flexShrink: 0 }} />;
                  const verBadge = r.verification_status === 'verified'
                    ? { bg: '#1B7F37', color: '#FFFFFF', label: 'Verified' }
                    : r.verification_status === 'needs_review'
                    ? { bg: '#0C66E4', color: '#FFFFFF', label: 'Review' }
                    : null;

                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/wiki/${r.slug}`)}
                      style={{
                        padding: '14px 0', borderBottom: `0.75px solid ${borderColor}`,
                        cursor: 'pointer', transition: 'background 80ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(37,99,235,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {fmtIcon}
                        <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>
                          {highlightText(r.title || '—', debouncedQuery, isDark)}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 650, padding: '1px 6px', borderRadius: 4,
                          background: '#0C66E4', color: '#FFFFFF',
                        }}>{r.domain_code || '—'}</span>
                        {r.read_time_minutes && (
                          <span style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} /> {r.read_time_minutes} min
                          </span>
                        )}
                        {conf > 0 && (
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
                            padding: '1px 5px', borderRadius: 4,
                            background: confBg(conf), color: confColor(conf),
                          }}>{conf}%</span>
                        )}
                        {verBadge && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: verBadge.bg, color: verBadge.color,
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}>{r.verification_status === 'verified' && <ShieldCheck size={9} />} {verBadge.label}</span>
                        )}
                        <span style={{ fontSize: 11, color: isDark ? '#878787' : '#94A3B8' }}>{r.updated_at ? timeAgo(r.updated_at) : '—'}</span>
                      </div>

                      {/* Snippet */}
                      {r.lead_content && (
                        <div style={{
                          fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', lineHeight: 1.6,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                        }}>
                          {highlightText(r.lead_content.substring(0, 200), debouncedQuery, isDark)}
                        </div>
                      )}

                      {/* Tags */}
                      {(r.tags ?? []).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {(r.tags as string[]).slice(0, 4).map(t => (
                            <span key={t} style={{
                              fontSize: 9, padding: '1px 6px', borderRadius: 4,
                              background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 500,
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '20px 0', marginTop: 8,
                  }}>
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                      style={{
                        fontSize: 12, fontWeight: 650, padding: '6px 14px', borderRadius: 4,
                        border: `1px solid ${borderColor}`, background: isDark ? '#1A1A1A' : '#FFFFFF',
                        color: page === 0 ? (isDark ? '#292929' : '#CBD5E1') : (isDark ? '#A1A1A1' : '#334155'), cursor: page === 0 ? 'default' : 'pointer',
                      }}
                    >← Previous</button>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                      style={{
                        fontSize: 12, fontWeight: 650, padding: '6px 14px', borderRadius: 4,
                        border: `1px solid ${borderColor}`, background: isDark ? '#1A1A1A' : '#FFFFFF',
                        color: page >= totalPages - 1 ? (isDark ? '#292929' : '#CBD5E1') : (isDark ? '#A1A1A1' : '#334155'), cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                      }}
                    >Next →</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>
                No results for '{debouncedQuery}'. Try a different search term or browse by domain.
              </div>
            )}
          </div>
        )}

        {/* ── Minimum character prompt ── */}
        {debouncedQuery.length < 2 && (
          <div style={{ padding: 48, textAlign: 'center', color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>
            Enter at least 2 characters to search
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }`}</style>
    </div>
  );
}
