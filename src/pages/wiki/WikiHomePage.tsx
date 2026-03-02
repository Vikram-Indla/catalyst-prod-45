import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Upload, Zap, Sparkles, FileText, FileDown, Video,
  ShieldCheck, ThumbsUp, GitBranch, HelpCircle, Plus, ArrowRight,
  Share2, BookOpen, ChevronRight, CheckCircle2, Star, GraduationCap,
  Factory, Ship, FlaskConical, Leaf, Landmark, Bot, HardHat, Globe, Pickaxe,
} from 'lucide-react';
import {
  useWikiHomeStats, useWikiDomainCards, useWikiRecentArticles,
  useWikiQuickRefs, useWikiLearningPaths, useWikiKnowledgeRequests,
} from '@/hooks/useWikiHub';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';
import { WikiUploadWizard } from '@/components/wiki/WikiUploadWizard';
import { toast } from 'sonner';

/* ── Constants ── */
const DOMAIN_ICONS: Record<string, React.ComponentType<any>> = {
  D1: Factory, D2: Ship, D3: FlaskConical, D4: Leaf, D5: Landmark,
  D6: Bot, D7: HardHat, D8: Globe, D9: Pickaxe,
};
const DOMAIN_TAGS: Record<string, string> = {
  D1: 'CORE', D2: 'TRADE', D3: 'PERMITS', D4: 'COMPLIANCE', D5: 'INCENTIVES',
  D6: '4IR', D7: 'WORKFORCE', D8: 'PLATFORM', D9: 'MINING',
};
const DOMAIN_SLUGS: Record<string, string> = {
  D1: 'industrial-licensing', D2: 'customs-trade', D3: 'chemical-permits',
  D4: 'environmental-compliance', D5: 'industrial-incentives',
  D6: 'fourth-industrial-revolution', D7: 'workforce-support',
  D8: 'senaei-platform', D9: 'mining-minerals',
};

/* ── Skeleton helpers ── */
const Skeleton = ({ w, h, style }: { w: string | number; h: number; style?: React.CSSProperties }) => (
  <div style={{
    width: w, height: h, borderRadius: 4, background: '#E2E8F0',
    animation: 'pulse 1.5s ease-in-out infinite', ...style,
  }} />
);

/* ── Section Header ── */
const SectionHeader = React.memo(({ icon, iconColor, title, count, rightLabel, rightAction, aiBadge }: {
  icon?: React.ReactNode; iconColor?: string; title: string; count?: number;
  rightLabel?: string; rightAction?: () => void; aiBadge?: boolean;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{ width: 3, height: 16, borderRadius: 2, background: iconColor || '#2563EB' }} />
    {icon}
    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 650, color: '#0F172A' }}>{title}</span>
    {count !== undefined && (
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
        padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#64748B',
      }}>{count}</span>
    )}
    {aiBadge && (
      <span style={{
        fontSize: 10, fontWeight: 650, padding: '2px 8px', borderRadius: 9999,
        background: '#F5F3FF', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', gap: 3,
      }}><Sparkles size={10} /> AI</span>
    )}
    {rightLabel && (
      <span onClick={rightAction} style={{
        marginLeft: 'auto', fontSize: 12, fontWeight: 650, color: '#2563EB', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>{rightLabel} <ChevronRight size={12} /></span>
    )}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

/* ── Format time ago ── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ── Section-level skeleton loaders ── */
const LearningPathsSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} style={{ padding: 20, borderRadius: 6, background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)' }}>
        <Skeleton w={140} h={16} style={{ marginBottom: 12 }} />
        <Skeleton w="100%" h={4} style={{ marginBottom: 8 }} />
        <Skeleton w="60%" h={12} />
      </div>
    ))}
  </div>
);

const RecommendationsSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} style={{ padding: 16, borderRadius: 6, background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderLeft: '3px solid #E2E8F0' }}>
        <Skeleton w={80} h={12} style={{ marginBottom: 10 }} />
        <Skeleton w="80%" h={14} style={{ marginBottom: 8 }} />
        <Skeleton w="60%" h={11} />
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   WIKI HOME PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function WikiHomePage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useWikiHomeStats();
  const { data: domains, isLoading: domainsLoading } = useWikiDomainCards();
  const { data: articles, isLoading: articlesLoading } = useWikiRecentArticles(5);
  const { data: quickRefs, isLoading: qrLoading } = useWikiQuickRefs();
  const { data: paths, isLoading: pathsLoading } = useWikiLearningPaths();
  const { data: requests } = useWikiKnowledgeRequests();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Filter chips state ──
  const [activeChip, setActiveChip] = useState('All Domains');
  const chips = [
    { label: 'All Domains', icon: <Globe size={12} /> },
    { label: 'Articles', icon: <FileText size={12} /> },
    { label: 'PDFs', icon: <FileDown size={12} /> },
    
    { label: 'Verified Only', icon: <ShieldCheck size={12} /> },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A', background: '#F8FAFC', minHeight: '100%' }}>
      {/* ═══ SECTION 1: HERO ═══ */}
      <div style={{
        background: '#FFFFFF', position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid rgba(15,23,42,0.08)',
      }}>
        {/* Gradient accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #2563EB, #7C3AED, #2563EB)',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div style={{
          padding: '48px 40px 40px', display: 'flex', gap: 40, alignItems: 'flex-start',
          position: 'relative', zIndex: 1, flexWrap: 'wrap',
        }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 320, maxWidth: 640 }}>
            {/* Purple chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
              borderRadius: 9999, background: '#F5F3FF', border: '1px solid rgba(124,58,237,0.15)',
              marginBottom: 16,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#7C3AED',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <Sparkles size={12} style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED' }}>RAG-Powered Knowledge Base</span>
            </div>

            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              Catalyst <span style={{ color: '#2563EB' }}>Wiki</span>
            </h1>
            <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 560 }}>
              The definitive knowledge base for the Ministry of Industry &amp; Mineral Resources.
              Explore regulations, permits, programs, and digital services across 9 domains.
            </p>

            {/* Search bar */}
            <div
              onClick={() => setCmdOpen(true)}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setCmdOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                borderRadius: 10, border: '1.5px solid rgba(15,23,42,0.12)', cursor: 'pointer',
                background: '#FFFFFF', transition: 'border-color 150ms, box-shadow 150ms',
                marginBottom: 16,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Search size={16} style={{ color: '#94A3B8' }} />
              <span style={{ flex: 1, fontSize: 14, color: '#94A3B8' }}>Search articles, regulations, permits...</span>
              <span style={{
                fontSize: 10, fontWeight: 650, padding: '2px 8px', borderRadius: 9999,
                background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 3,
                border: '1px solid rgba(124,58,237,0.1)',
              }}><Sparkles size={9} /> AI</span>
              <button style={{
                fontSize: 12, fontWeight: 650, padding: '6px 14px', borderRadius: 6, border: 'none',
                background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              }}>Search</button>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {chips.map(c => {
                const active = activeChip === c.label;
                return (
                  <button key={c.label} onClick={() => setActiveChip(c.label)} style={{
                    fontSize: 11, fontWeight: active ? 650 : 500, padding: '5px 12px',
                    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    border: active ? '1.5px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
                    background: active ? '#EFF6FF' : '#FFFFFF',
                    color: active ? '#2563EB' : '#64748B',
                    transition: 'all 120ms',
                  }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)'; e.currentTarget.style.color = '#64748B'; } }}
                  >{c.icon} {c.label}</button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setUploadOpen(true)} style={{
                fontSize: 12, fontWeight: 650, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', color: '#334155',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 120ms',
              }}><Upload size={14} /> Upload Document</button>
              <button onClick={() => navigate('/wiki/whats-new')} style={{
                fontSize: 12, fontWeight: 650, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', color: '#334155',
                display: 'flex', alignItems: 'center', gap: 6,
              }}><Zap size={14} /> What's New</button>
            </div>
          </div>

          {/* Right column — 2×2 stat cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minWidth: 260,
          }}>
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: 20, borderRadius: 8, background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.12)' }}>
                  <Skeleton w={48} h={28} style={{ marginBottom: 8 }} />
                  <Skeleton w={80} h={12} />
                </div>
              ))
            ) : (
              <>
                <StatCard label="Total Articles" value={stats?.totalArticles ?? 0} />
                <StatCard label="Documents" value={stats?.totalDocuments ?? 0} />
                <StatCard label="Verified" value={`${stats?.verifiedPercent ?? 0}%`} valueColor="#2563EB" />
                <StatCard label="Open Requests" value={stats?.openRequests ?? 0}
                  valueColor={(stats?.openRequests ?? 0) > 0 ? '#D97706' : undefined} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: '24px 40px 48px' }}>

        {/* ═══ SECTION 2: QUICK REFERENCE ═══ */}
        <SectionHeader title="Quick Reference" count={quickRefs?.length ?? 0} rightLabel="View All" rightAction={() => {}} />
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, marginBottom: 40,
          scrollSnapType: 'x mandatory',
        }}>
          {qrLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ minWidth: 220, padding: 16, borderRadius: 6, border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF' }}>
                <Skeleton w="80%" h={14} style={{ marginBottom: 12 }} />
                <Skeleton w="60%" h={12} />
              </div>
            ))
          ) : (quickRefs ?? []).length > 0 ? (quickRefs ?? []).map((qr: any) => (
            <QuickRefCard key={qr.id} qr={qr} />
          )) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12, width: '100%' }}>
              No quick reference cards yet — add guides to help users navigate common workflows.
            </div>
          )}
        </div>

        {/* ═══ SECTION 3: BROWSE BY DOMAIN ═══ */}
        <SectionHeader title="Browse by Domain" count={9} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 40,
        }}>
          {domainsLoading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 6, background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)' }}>
                <Skeleton w={160} h={16} style={{ marginBottom: 12 }} />
                <Skeleton w="100%" h={12} style={{ marginBottom: 8 }} />
                <Skeleton w="80%" h={3} style={{ marginBottom: 8 }} />
                <Skeleton w="60%" h={12} />
              </div>
            ))
          ) : (domains ?? []).length > 0 ? (domains ?? []).map((d) => {
            const Icon = DOMAIN_ICONS[d.domain_code] || Globe;
            return <DomainCard key={d.domain_code} d={d} Icon={Icon} navigate={navigate} />;
          }) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 12, gridColumn: '1 / -1' }}>
              No domain data available — run a sync to populate domains.
            </div>
          )}
        </div>

        {/* ═══ SECTION 4: LEARNING PATHS ═══ */}
        <SectionHeader title="Learning Paths" count={paths?.length ?? 0} icon={<GraduationCap size={16} style={{ color: '#2563EB' }} />} />
        {pathsLoading ? <LearningPathsSkeleton /> : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 40,
          }}>
            {(paths ?? []).length > 0 ? (paths ?? []).map((p: any) => {
              const pct = p.article_count > 0 ? Math.round((p.completedCount / p.article_count) * 100) : 0;
              const isDone = pct === 100;
              return (
                <div key={p.id} style={{
                  padding: 20, borderRadius: 6, background: '#FFFFFF', position: 'relative',
                  border: '1px solid rgba(15,23,42,0.12)', transition: 'border-color 120ms',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)'}
                >
                  {/* Completion badge */}
                  <span style={{
                    position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 3,
                    background: isDone ? '#E3FCEF' : '#DEEBFF',
                    color: isDone ? '#006644' : '#0747A6',
                    textTransform: 'uppercase',
                  }}>{isDone ? 'Complete' : `${pct}%`}</span>

                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#2563EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                  }}>
                    <GraduationCap size={18} style={{ color: '#FFFFFF' }} />
                  </div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 650, color: '#0F172A', marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{p.description}</div>

                  {/* Progress bar */}
                  <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', marginBottom: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: '#2563EB',
                      width: `${pct}%`, transition: 'width 600ms ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#64748B' }}>{p.completedCount}/{p.article_count} articles</span>
                    {isDone && <span style={{ color: '#006644', display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={11} /> Completed</span>}
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12, gridColumn: '1 / -1' }}>
                No learning paths configured yet.
              </div>
            )}
          </div>
        )}


        {/* ═══ SECTION 6: KNOWLEDGE REQUEST CTA ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
          borderRadius: 8, background: '#EFF6FF', border: '1px solid #DBEAFE',
          marginBottom: 40, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#DBEAFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <HelpCircle size={20} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 650, color: '#0F172A', marginBottom: 2 }}>
              Can't find what you need?
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Submit a knowledge request and our domain experts will create the article.</div>
          </div>
          <button style={{
            fontSize: 12, fontWeight: 650, padding: '8px 16px', borderRadius: 6, border: 'none',
            background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={14} /> Request Knowledge
            {(stats?.openRequests ?? 0) > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9999,
                background: 'rgba(255,255,255,0.25)', color: '#FFFFFF',
              }}>{stats?.openRequests}</span>
            )}
          </button>
        </div>

        {/* ═══ SECTION 7: RECENTLY UPDATED TABLE ═══ */}
        <SectionHeader title="Recently Updated" count={articles?.length ?? 0} rightLabel="View All" rightAction={() => navigate('/wiki/whats-new')} />
        <div style={{
          borderRadius: 6, border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF',
          overflow: 'hidden', marginBottom: 40,
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 110px 100px 80px 70px 80px 90px',
            background: '#F1F5F9', padding: '0 12px', height: 36, alignItems: 'center',
            borderBottom: '0.75px solid rgba(15,23,42,0.12)',
            fontSize: 10, fontWeight: 650, textTransform: 'uppercase' as const, color: '#64748B',
            letterSpacing: '0.04em',
          }}>
            <span></span>
            <span>Article</span>
            <span>Author</span>
            <span>Verification</span>
            <span>Confidence</span>
            <span>Helpful</span>
            <span>Updated</span>
            <span>Status</span>
          </div>

          {/* Table body */}
          {articlesLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 110px 100px 80px 70px 80px 90px',
                padding: '0 12px', height: 36, alignItems: 'center',
                borderBottom: '0.75px solid rgba(15,23,42,0.12)',
              }}>
                <span /><Skeleton w="80%" h={12} /><Skeleton w={60} h={12} /><Skeleton w={60} h={12} />
                <Skeleton w={40} h={12} /><Skeleton w={30} h={12} /><Skeleton w={50} h={12} /><Skeleton w={60} h={12} />
              </div>
            ))
          ) : (articles ?? []).length > 0 ? (articles ?? []).map((a: any) => (
            <ArticleRow key={a.id} a={a} navigate={navigate} />
          )) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
              No articles yet — upload a document or run a sync to get started
            </div>
          )}
        </div>

        {/* ═══ SECTION 8: KNOWLEDGE GRAPH ═══ */}
        <SectionHeader
          title="Knowledge Graph"
          icon={<Share2 size={16} style={{ color: '#7C3AED' }} />}
          iconColor="#7C3AED"
          aiBadge
          rightLabel="Explore"
          rightAction={() => {}}
        />
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24, padding: '24px 0 16px',
          marginBottom: 40, flexWrap: 'wrap',
        }}>
          {Object.entries(DOMAIN_ICONS).slice(0, 7).map(([code, Icon], i) => (
            <div key={code} style={{ textAlign: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`/wiki/category/${DOMAIN_SLUGS[code]}`)}
            >
              <div style={{
                width: i === 3 ? 52 : 42, height: i === 3 ? 52 : 42, borderRadius: '50%',
                border: '2px solid rgba(15,23,42,0.12)', background: '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms', margin: '0 auto 6px',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.background = '#EFF6FF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              >
                <Icon size={i === 3 ? 22 : 18} style={{ color: '#334155' }} />
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>{code}</div>
            </div>
          ))}
        </div>

        {/* ═══ SECTION 9: SUBSCRIPTION FOOTER ═══ */}
      </div>


      <WikiCommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <WikiUploadWizard open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/* ── Stat Card (memoized) ── */
const StatCard = React.memo(({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) => (
  <div style={{
    padding: 20, borderRadius: 8, background: '#F8FAFC', textAlign: 'center',
    border: '1px solid rgba(15,23,42,0.12)', transition: 'all 150ms', cursor: 'default',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = '#2563EB';
      e.currentTarget.style.background = '#EFF6FF';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)';
      e.currentTarget.style.background = '#F8FAFC';
    }}
  >
    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: valueColor || '#0F172A' }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em', marginTop: 4 }}>{label}</div>
  </div>
));
StatCard.displayName = 'StatCard';

/* ── Quick Ref Card (memoized) ── */
const QuickRefCard = React.memo(({ qr }: { qr: any }) => (
  <div style={{
    minWidth: 220, padding: 16, borderRadius: 6, background: '#FFFFFF',
    border: '1px solid rgba(15,23,42,0.12)', cursor: 'pointer', scrollSnapAlign: 'start',
    transition: 'border-color 120ms, box-shadow 120ms',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = '#2563EB';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 650, color: '#0F172A', marginBottom: 8 }}>{qr.title}</div>
    <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#2563EB', fontWeight: 500 }}>{qr.steps} steps</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B', fontWeight: 500 }}>{formatK(qr.views)} views</span>
    </div>
  </div>
));
QuickRefCard.displayName = 'QuickRefCard';

/* ── Domain Card (memoized) ── */
const DomainCard = React.memo(({ d, Icon, navigate }: { d: any; Icon: React.ComponentType<any>; navigate: any }) => {
  const [hovered, setHovered] = useState(false);
  const freshnessColor = d.freshness_percent >= 90 ? '#006644' : d.freshness_percent >= 75 ? '#0747A6' : '#9A5402';
  const freshnessBg = d.freshness_percent >= 90 ? '#E3FCEF' : d.freshness_percent >= 75 ? '#DEEBFF' : '#FEF3C7';

  return (
    <div
      onClick={() => navigate(`/wiki/category/${DOMAIN_SLUGS[d.domain_code] || d.domain_code.toLowerCase()}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', borderRadius: 6, background: '#FFFFFF', cursor: 'pointer',
        border: '1px solid rgba(15,23,42,0.12)', overflow: 'hidden',
        transition: 'border-color 120ms',
        borderColor: hovered ? '#2563EB' : 'rgba(15,23,42,0.12)',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: 4, background: hovered ? 'linear-gradient(180deg, #2563EB, #7C3AED)' : 'transparent',
        transition: 'background 200ms',
      }} />

      <div style={{ flex: 1, padding: '16px 16px 14px' }}>
        {/* Top row: icon + name + tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: hovered ? '#EFF6FF' : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 150ms',
          }}>
            <Icon size={16} style={{ color: hovered ? '#2563EB' : '#64748B', transition: 'color 150ms' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 650, color: '#0F172A' }}>{d.name}</div>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px',
            borderRadius: 3, background: '#F1F5F9', color: '#64748B', letterSpacing: '0.04em',
          }}>{DOMAIN_TAGS[d.domain_code] || d.domain_code}</span>
        </div>

        {/* Description */}
        <div style={{
          fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
        }}>{d.description || '—'}</div>

        {/* Coverage bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 650, color: '#64748B' }}>Coverage</span>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#E2E8F0' }}>
            <div style={{
              height: '100%', borderRadius: 2, background: '#2563EB',
              width: `${d.coverage_percent}%`, transition: 'width 600ms',
            }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: '#0F172A' }}>
            {d.coverage_percent}%
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748B', marginBottom: 8 }}>
          <span>{d.article_count} articles</span>
          <span>{d.document_count} docs</span>
          <span>{formatK(d.view_count)} views</span>
          {d.knowledge_gaps > 0 && (
            <span style={{ color: '#9A5402', display: 'flex', alignItems: 'center', gap: 2 }}>
              <HelpCircle size={10} /> {d.knowledge_gaps} gaps
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            background: freshnessBg, color: freshnessColor, textTransform: 'uppercase',
          }}>{d.freshness_percent}% fresh</span>
          <span style={{
            fontSize: 11, fontWeight: 650, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 3,
            opacity: hovered ? 1 : 0, transition: 'opacity 200ms',
          }}>Explore <ArrowRight size={12} /></span>
        </div>
      </div>
    </div>
  );
});
DomainCard.displayName = 'DomainCard';

/* ── Article Row (memoized) ── */
const ArticleRow = React.memo(({ a, navigate }: { a: any; navigate: any }) => {
  const formatIcon = a.format === 'pdf'
    ? <FileDown size={14} style={{ color: '#DC2626' }} />
    : a.format === 'video'
    ? <Video size={14} style={{ color: '#7C3AED' }} />
    : <FileText size={14} style={{ color: '#94A3B8' }} />;

  const verStatus = a.verification_status || 'unverified';
  const verBadge = verStatus === 'verified'
    ? { bg: '#E3FCEF', color: '#006644', label: 'Verified', icon: <ShieldCheck size={10} /> }
    : verStatus === 'needs_review'
    ? { bg: '#DEEBFF', color: '#0747A6', label: 'Review', icon: null }
    : { bg: '#DFE1E6', color: '#44546F', label: 'Unverified', icon: null };

  const conf = Math.round((a.ai_confidence ?? 0) * 100);
  const confColor = conf >= 90 ? '#006644' : conf >= 70 ? '#0747A6' : '#9A5402';

  const helpful = a.helpfulness_score ?? 0;

  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: '#E3FCEF', color: '#006644', label: 'PUBLISHED' },
    review: { bg: '#DEEBFF', color: '#0747A6', label: 'IN REVIEW' },
    draft: { bg: '#DFE1E6', color: '#44546F', label: 'DRAFT' },
    archived: { bg: '#DFE1E6', color: '#44546F', label: 'ARCHIVED' },
  };
  const st = statusMap[a.status] || statusMap.draft;

  const tags = (a.tags ?? []).slice(0, 3);

  return (
    <div
      onClick={() => navigate(`/wiki/${a.slug}`)}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 110px 100px 80px 70px 80px 90px',
        padding: '0 12px', minHeight: 36, alignItems: 'center', cursor: 'pointer',
        borderBottom: '0.75px solid rgba(15,23,42,0.12)', fontSize: 12,
        transition: 'background 80ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Bookmark */}
      <span onClick={e => { e.stopPropagation(); toast.info('Bookmarked'); }} style={{ cursor: 'pointer' }}>
        <Star size={13} style={{ color: '#CBD5E1' }} />
      </span>

      {/* Article */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingRight: 8 }}>
        {formatIcon}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontWeight: 650, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{a.title}</span>
            {a.tldr && (
              <span title={a.tldr} style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                background: '#F5F3FF', color: '#7C3AED', cursor: 'help', flexShrink: 0,
              }}>TL;DR</span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 650, padding: '1px 5px', borderRadius: 3,
              background: '#F1F5F9', color: '#64748B', flexShrink: 0,
            }}>{a.domain_code}</span>
            {a.read_time_minutes && (
              <span style={{ fontSize: 10, color: '#64748B', flexShrink: 0 }}>{a.read_time_minutes}m</span>
            )}
            <span style={{
              fontSize: 9, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
              fontFamily: 'JetBrains Mono, monospace',
            }}><GitBranch size={9} /> v{a.version ?? 1}</span>
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              {tags.map((t: string) => (
                <span key={t} style={{
                  fontSize: 9, padding: '0px 5px', borderRadius: 3, background: '#F1F5F9', color: '#64748B',
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
        {a.author_name ? (
          <>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0,
            }}>{a.author_name.charAt(0).toUpperCase()}</div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author_name}</span>
          </>
        ) : <span style={{ color: '#94A3B8' }}>—</span>}
      </div>

      {/* Verification */}
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
        background: verBadge.bg, color: verBadge.color, textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content',
      }}>{verBadge.icon} {verBadge.label}</span>

      {/* Confidence */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: confColor }}>
        {conf}%
      </span>

      {/* Helpful */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#64748B', fontSize: 11 }}>
        <ThumbsUp size={11} /> {helpful}%
      </span>

      {/* Updated */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B' }}>
        {timeAgo(a.updated_at)}
      </span>

      {/* Status */}
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
        background: st.bg, color: st.color, textTransform: 'uppercase', width: 'fit-content',
      }}>{st.label}</span>
    </div>
  );
});
ArticleRow.displayName = 'ArticleRow';

