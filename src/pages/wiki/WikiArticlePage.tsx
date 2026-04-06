import React, { useEffect, useState, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWikiPage, useLogWikiRead } from '@/hooks/useWikiData';
import { useWikiRelatedArticles, useSubmitArticleFeedback } from '@/hooks/useWikiHub';
import {
  Star, ThumbsUp, ThumbsDown, ChevronRight, Clock, GitBranch, Sparkles,
  FileText, FileDown, Video, ShieldCheck, BookOpen, ArrowRight, History,
  Printer, Download, Link2, RotateCcw, ExternalLink, ChevronDown, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';

/* ── Time helpers ── */
function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── StatusLozenge (V12 3-color guardrail) ── */
function StatusLozenge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const map: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: '#1B7F37', color: '#FFFFFF', label: 'PUBLISHED' },
    done: { bg: '#1B7F37', color: '#FFFFFF', label: 'DONE' },
    verified: { bg: '#1B7F37', color: '#FFFFFF', label: 'VERIFIED' },
    'in progress': { bg: '#0C66E4', color: '#FFFFFF', label: 'IN PROGRESS' },
    review: { bg: '#0C66E4', color: '#FFFFFF', label: 'IN REVIEW' },
    needs_review: { bg: '#0C66E4', color: '#FFFFFF', label: 'NEEDS REVIEW' },
    draft: { bg: '#DFE1E6', color: '#44546F', label: 'DRAFT' },
    archived: { bg: '#DFE1E6', color: '#44546F', label: 'ARCHIVED' },
  };
  const v = map[s] || { bg: '#DFE1E6', color: '#44546F', label: (status || '—').toUpperCase() };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: v.bg, color: v.color, textTransform: 'uppercase',
    }}>{v.label}</span>
  );
}

/* ── Skeleton ── */
const Sk = ({ w, h, style, isDark }: { w: string | number; h: number; style?: React.CSSProperties; isDark?: boolean }) => (
  <div style={{
    width: w, height: h, borderRadius: 4, background: isDark ? '#1A1A1A' : '#E2E8F0',
    animation: 'pulse 1.5s ease-in-out infinite', ...style,
  }} />
);

/* ── Module icon map for cross-links ── */
const MODULE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  task: { bg: 'rgba(59,130,246,0.06)', color: '#2563EB', label: 'TaskHub' },
  product: { bg: '#F5F3FF', color: '#7C3AED', label: 'ProductHub' },
  incident: { bg: 'rgba(248,113,113,0.06)', color: '#DC2626', label: 'IncidentHub' },
  release: { bg: 'rgba(74,222,128,0.06)', color: '#059669', label: 'ReleaseHub' },
  requirement: { bg: '#FFFBEB', color: '#D97706', label: 'Requirements' },
  wiki: { bg: '#F0F9FF', color: '#0284C7', label: 'WikiHub' },
};

/* ═══ VERSION HISTORY PANEL ═══ */
function VersionHistoryPanel({ versions, onRestore, onClose }: {
  versions: any[];
  onRestore: (v: any) => void;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, zIndex: 200,
      background: isDark ? '#1A1A1A' : '#FFFFFF', borderLeft: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)',
      boxShadow: isDark ? '-8px 0 24px rgba(0,0,0,0.3)' : '-8px 0 24px rgba(15,23,42,0.08)',
      display: 'flex', flexDirection: 'column', fontFamily: 'Geist, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} style={{ color: '#2563EB' }} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>Version History</span>
          <span style={{
            fontSize: 10, fontWeight: 650, padding: '2px 6px', borderRadius: 9999,
            background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB',
          }}>{versions.length}</span>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDark ? '#A1A1A1' : '#64748B',
        }}><X size={16} /></button>
      </div>

      {/* Version list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {versions.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <History size={32} style={{ color: isDark ? '#292929' : '#E2E8F0', marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: isDark ? '#878787' : '#94A3B8' }}>No version history yet</div>
          </div>
        ) : versions.map((v: any, i: number) => (
          <div key={v.id || i} style={{
            padding: '12px 20px', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(15,23,42,0.04)',
            transition: 'background 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                  color: i === 0 ? '#2563EB' : isDark ? '#A1A1A1' : '#64748B',
                  padding: '2px 6px', borderRadius: 4,
                  background: i === 0 ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#F1F5F9'),
                }}>v{v.version_number}</span>
                {i === 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', textTransform: 'uppercase' as const }}>CURRENT</span>
                )}
              </div>
              {i > 0 && (
                <button onClick={() => onRestore(v)} style={{
                  fontSize: 10, fontWeight: 650, padding: '4px 10px', borderRadius: 4,
                  border: '1px solid rgba(37,99,235,0.3)', background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <RotateCcw size={10} /> Restore
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 4 }}>{v.title || 'Untitled'}</div>
            {v.change_summary && (
              <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 4, lineHeight: 1.5 }}>{v.change_summary}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: isDark ? '#878787' : '#94A3B8' }}>
              {v.changed_by_name && <span>{v.changed_by_name}</span>}
              {v.changed_at && <span>· {formatDate(v.changed_at)}</span>}
              {!v.changed_at && v.created_at && <span>· {formatDate(v.created_at)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ EXPORT DROPDOWN ═══ */
function ExportDropdown({ onClose }: { onClose: () => void }) {
  const { isDark } = useTheme();
  const handlePrint = () => {
    window.print();
    onClose();
  };
  const handlePdf = () => {
    window.print(); // CSS @media print acts as PDF via browser
    onClose();
    toast.info('Use "Save as PDF" in the print dialog');
  };
  return (
    <div style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
      background: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 6, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(15,23,42,0.08)', minWidth: 160, overflow: 'hidden',
    }}>
      <button onClick={handlePdf} style={{
        width: '100%', padding: '8px 14px', fontSize: 12, fontWeight: 500,
        color: isDark ? '#EDEDED' : '#0F172A', background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
      }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Download size={13} style={{ color: '#DC2626' }} /> Export as PDF
      </button>
      <button onClick={handlePrint} style={{
        width: '100%', padding: '8px 14px', fontSize: 12, fontWeight: 500,
        color: isDark ? '#EDEDED' : '#0F172A', background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
      }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Printer size={13} style={{ color: isDark ? '#A1A1A1' : '#64748B' }} /> Print
      </button>
    </div>
  );
}

/* ═══ CROSS-MODULE LINKS ═══ */
function CrossModuleLinks({ links }: { links: any[] }) {
  const { isDark } = useTheme();
  if (!links || links.length === 0) return null;
  return (
    <div style={{
      marginTop: 32, padding: 16, borderRadius: 6,
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : '#FFFFFF',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
        color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 10, letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Link2 size={12} /> Related Items
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {links.map((link: any) => {
          const mod = MODULE_COLORS[link.target_module] || { bg: '#1A1A1A', color: 'rgba(237,237,237,0.40)', label: link.target_module };
          return (
            <span key={link.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              borderRadius: 4, background: mod.bg, fontSize: 11, fontWeight: 600,
              color: mod.color, cursor: 'default',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4,
                background: `${mod.color}15`, color: mod.color,
              }}>{mod.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700 }}>
                {link.target_id}
              </span>
              {link.target_title && (
                <span style={{ fontWeight: 500, fontSize: 11 }}>{link.target_title}</span>
              )}
              <ExternalLink size={9} style={{ opacity: 0.6 }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ ARTICLE PAGE ═══ */
export default function WikiArticlePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const { data: page, isLoading, error } = useWikiPage(pageSlug);
  const logRead = useLogWikiRead();
  const submitFeedback = useSubmitArticleFeedback();
  const [scrollPct, setScrollPct] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Version history
  const { data: versions } = useQuery({
    queryKey: ['wiki-page-versions', page?.id],
    enabled: !!page?.id && showHistory,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_page_versions')
        .select('*')
        .eq('page_id', page!.id)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Cross-module links
  const { data: crossLinks } = useQuery({
    queryKey: ['wiki-cross-links', page?.id],
    enabled: !!page?.id,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_cross_links')
        .select('*')
        .eq('page_id', page!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRestore = async (version: any) => {
    if (!page?.id) return;
    const { error } = await supabase.from('wiki_pages').update({
      title: version.title,
      lead_content: version.lead_content,
      version: (page.version ?? 1) + 1,
    } as any).eq('id', page.id);
    if (error) { toast.error('Restore failed'); return; }
    toast.success(`Restored to v${version.version_number}`);
    qc.invalidateQueries({ queryKey: ['wiki-page'] });
    setShowHistory(false);
  };

  // Related articles
  const { data: related } = useWikiRelatedArticles(page?.domain_code, page?.id, 3);

  // Log read on mount
  useEffect(() => {
    if (page?.id) logRead.mutate({ pageId: page.id });
  }, [page?.id]);

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const pct = Math.min(100, (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      setScrollPct(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = () => setShowExport(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showExport]);

  const handleFeedback = useCallback((helpful: boolean) => {
    if (!page?.id) return;
    submitFeedback.mutate({ pageId: page.id, helpful });
    toast.success(helpful ? 'Thanks for the feedback!' : 'We\'ll work to improve this article.');
  }, [page?.id, submitFeedback]);

  const handleBookmark = useCallback(async () => {
    setBookmarked(b => !b);
    toast.info(bookmarked ? 'Removed from reading list' : 'Added to reading list');
  }, [bookmarked]);

  /* ── Loading ── */
  if (isLoading) return <ArticleSkeleton />;

  /* ── Not found ── */
  if (error || !page) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', padding: 80, textAlign: 'center', background: isDark ? '#0A0A0A' : undefined, minHeight: '100%' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 8 }}>Article not found</div>
        <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 16 }}>The article you're looking for doesn't exist or has been removed.</div>
        <button onClick={() => navigate('/wiki')} style={{
          fontSize: 12, fontWeight: 650, padding: '8px 20px', borderRadius: 6,
          background: '#2563EB', color: '#FFFFFF', border: 'none', cursor: 'pointer',
        }}>Return to Wiki</button>
      </div>
    );
  }

  const info = (page.infobox as any) || {};
  const sections = page.sections || [];
  const refs = page.references || [];
  const title = page.title || pageSlug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Article';
  const conf = Math.round((page.ai_confidence ?? 0) * 100);
  const confColor = conf >= 90 ? '#FFFFFF' : conf >= 70 ? '#FFFFFF' : '#9A5402';
  const verStatus = (page as any).verification_status || 'unverified';
  const verBadge = verStatus === 'verified'
    ? { bg: '#1B7F37', color: '#FFFFFF', label: 'Verified', icon: <ShieldCheck size={10} /> }
    : verStatus === 'needs_review'
    ? { bg: '#0C66E4', color: '#FFFFFF', label: 'Needs Review', icon: null }
    : { bg: '#DFE1E6', color: '#44546F', label: 'Unverified', icon: null };
  const tags = ((page as any).tags ?? []) as string[];
  const tldr = (page as any).tldr as string | null;
  const authorName = (page as any).author_name as string | null;
  const readTime = (page as any).read_time_minutes as number | null;
  const helpScore = (page as any).helpfulness_score ?? 0;
  const helpVotes = (page as any).helpfulness_votes ?? 0;
  const formatIcon = (page as any).format === 'pdf'
    ? <FileDown size={14} style={{ color: '#DC2626' }} />
    : (page as any).format === 'video'
    ? <Video size={14} style={{ color: '#7C3AED' }} />
    : <FileText size={14} style={{ color: isDark ? '#878787' : '#94A3B8' }} />;

  const domainName = page.domain_code || 'Wiki';

  /* ── Infobox rows (hide null) ── */
  const infoRows = [
    { label: 'Domain', value: domainName, show: true },
    { label: 'Status', value: <StatusLozenge status={info.status || page.status || ''} />, show: true },
    { label: 'Hub', value: info.hub, show: !!info.hub },
    { label: 'Project', value: info.project, show: !!info.project },
    { label: 'Epic', value: info.epicKey ? (
      <span style={{ fontSize: 11, fontWeight: 650, color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>{info.epicKey}</span>
    ) : null, show: !!info.epicKey },
    { label: 'Stories', value: info.totalStories ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{info.doneStories ?? 0}/{info.totalStories} done</span>
        <div style={{ width: 40, height: 3, borderRadius: 4, background: isDark ? '#292929' : '#E2E8F0' }}>
          <div style={{ height: '100%', borderRadius: 4, background: '#2563EB', width: `${info.donePercent ?? 0}%` }} />
        </div>
      </div>
    ) : null, show: !!info.totalStories },
    { label: 'Done %', value: info.donePercent != null ? (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: info.donePercent >= 80 ? '#FFFFFF' : '#FFFFFF' }}>{info.donePercent}%</span>
    ) : null, show: info.donePercent != null },
    { label: 'Open Defects', value: info.openDefects != null ? (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: info.openDefects > 0 ? '#DC2626' : (isDark ? '#A1A1A1' : '#64748B') }}>{info.openDefects}</span>
    ) : null, show: info.openDefects != null },
    { label: 'Sprint', value: info.currentSprint, show: !!info.currentSprint },
    { label: 'Owner', value: info.owner ? <span style={{ fontWeight: 600 }}>{info.owner}</span> : null, show: !!info.owner },
    { label: 'BRD', value: info.brdVersion, show: !!info.brdVersion },
    { label: 'Documents', value: info.documentsCount ? (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{info.documentsCount}</span>
    ) : null, show: !!info.documentsCount },
    { label: 'Last Sync', value: info.lastSync ? timeAgo(info.lastSync) : null, show: !!info.lastSync },
    { label: 'AI Confidence', value: (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: confColor }}>{conf}%</span>
    ), show: true },
  ].filter(r => r.show);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%' }}>
      {/* Scroll progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100,
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
      }}>
        <div style={{
          height: '100%', background: '#2563EB', width: `${scrollPct}%`,
          transition: 'width 60ms linear',
        }} />
      </div>

      <div style={{ padding: '20px 40px 48px' }}>
        {/* ── Breadcrumb ── */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
          <span onClick={() => navigate(`/wiki/category/${DOMAIN_SLUGS[page.domain_code || ''] || ''}`)} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>{domainName}</span>
          <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
          <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>{title}</span>
        </nav>

        {/* ── 2-column ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, alignItems: 'start' }}>
          {/* Main content */}
          <article>
            {/* Title */}
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 12px' }}>{title}</h1>

            {/* Metadata row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B' }}>{page.updated_at ? timeAgo(page.updated_at) : '—'}</span>
              {conf > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 650, padding: '2px 8px', borderRadius: 9999,
                  background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', color: '#7C3AED', display: 'inline-flex', alignItems: 'center', gap: 3,
                }}><Sparkles size={9} /> AI {conf}%</span>
              )}
              {formatIcon}
              <span style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                <GitBranch size={11} /> v{page.version ?? 1}
              </span>
              {readTime && (
                <span style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={11} /> {readTime} min
                </span>
              )}
              <button onClick={handleBookmark} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', background: bookmarked ? (isDark ? 'rgba(217,119,6,0.12)' : '#FEF3C7') : 'transparent',
                color: bookmarked ? '#D97706' : (isDark ? '#A1A1A1' : '#64748B'), display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Star size={12} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save'}
              </button>

              {/* ── History button ── */}
              <button onClick={() => setShowHistory(prev => !prev)} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', background: showHistory ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF') : 'transparent',
                color: showHistory ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'), display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <History size={12} /> History
              </button>

              {/* ── Export dropdown ── */}
              <div style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setShowExport(prev => !prev); }} style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', background: showExport ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF') : 'transparent',
                  color: showExport ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'), display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Download size={12} /> Export <ChevronDown size={10} />
                </button>
                {showExport && <ExportDropdown onClose={() => setShowExport(false)} />}
              </div>
            </div>

            {/* Author + verification */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {authorName ? (
                <>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: isDark ? '#1A1A1A' : '#E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B',
                  }}>{authorName.charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#A1A1A1' : '#334155' }}>{authorName}</span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: isDark ? '#878787' : '#94A3B8' }}>No author</span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: verBadge.bg, color: verBadge.color, display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>{verBadge.icon} {verBadge.label}</span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
                {tags.map(t => (
                  <span key={t} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 500,
                  }}>{t}</span>
                ))}
              </div>
            )}

            {/* ── TL;DR ── */}
            <div style={{
              borderLeft: '3px solid #7C3AED', padding: '12px 16px', marginBottom: 24,
              background: isDark ? 'rgba(124,58,237,0.06)' : '#FAFAFE', borderRadius: '0 6px 6px 0',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', color: '#7C3AED', display: 'inline-flex', alignItems: 'center', gap: 3,
                marginBottom: 8,
              }}><Sparkles size={10} /> TL;DR</span>
              {tldr ? (
                <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#334155', lineHeight: 1.7, marginTop: 8 }}>{tldr}</div>
              ) : (
                <div style={{ fontSize: 12, color: isDark ? '#878787' : '#94A3B8', marginTop: 8, fontStyle: 'italic' }}>AI summary not yet generated</div>
              )}
            </div>

            {/* ── Lead paragraph ── */}
            {page.lead_content && (
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.85,
                color: isDark ? '#A1A1A1' : '#334155', marginBottom: 24, paddingBottom: 20,
                borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
              }}>
                {page.lead_content}
              </div>
            )}

            {/* ── Table of Contents ── */}
            {sections.length > 0 && (
              <nav style={{
                background: isDark ? '#1A1A1A' : '#F8FAFC', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)',
                borderRadius: 6, padding: 16, marginBottom: 28,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                  color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 8, letterSpacing: '0.04em',
                }}>Contents</div>
                {sections.map((s: any, i: number) => (
                  <a key={s.id} href={`#section-${i}`} style={{
                    display: 'block', fontSize: 12, color: '#2563EB', padding: '3px 0',
                    textDecoration: 'none',
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#878787' : '#94A3B8', marginRight: 8 }}>{i + 1}.</span>
                    {s.title}
                  </a>
                ))}
              </nav>
            )}

            {/* ── Article body sections ── */}
            {sections.map((s: any, i: number) => (
              <div key={s.id} id={`section-${i}`} style={{ marginBottom: 32 }}>
                <h2 style={{
                  fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A',
                  margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: isDark ? '#878787' : '#94A3B8' }}>{i + 1}.</span>
                  {s.title}
                  {s.is_live_data && (
                    <span style={{
                      fontSize: 9, fontWeight: 650, padding: '2px 6px', borderRadius: 4,
                      background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB',
                    }}>LIVE DATA</span>
                  )}
                </h2>

                {s.section_type === 'delivery_status' ? (
                  <DeliveryStatusSection content={s.content} />
                ) : s.section_type === 'references' ? (
                  <ReferencesSection refs={refs} />
                ) : (
                  <div style={{
                    fontSize: 15, lineHeight: 1.7, color: isDark ? '#A1A1A1' : '#334155',
                    ...(i === 0 && !page.lead_content ? { fontFamily: 'Georgia, serif' } : {}),
                  }}>{s.content}</div>
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>
                This article has no content sections yet.
              </div>
            )}

            {/* ── Cross-Module Links ── */}
            <CrossModuleLinks links={crossLinks ?? []} />

            {/* ── Feedback footer ── */}
            <div style={{
              marginTop: 32, padding: 20, borderRadius: 6,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 4 }}>Was this helpful?</div>
                <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>
                  {helpVotes > 0 ? `${helpScore}% found this helpful (${helpVotes} votes)` : 'Be the first to rate this article'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => handleFeedback(true)} style={{
                  fontSize: 12, fontWeight: 650, padding: '6px 14px', borderRadius: 6,
                  border: '1px solid rgba(22,163,74,0.3)', background: isDark ? 'rgba(22,163,74,0.12)' : '#F0FDF4', color: '#16A34A',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}><ThumbsUp size={13} /> Yes</button>
                <button onClick={() => handleFeedback(false)} style={{
                  fontSize: 12, fontWeight: 650, padding: '6px 14px', borderRadius: 6,
                  border: '1px solid rgba(220,38,38,0.3)', background: isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2', color: '#DC2626',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}><ThumbsDown size={13} /> No</button>
                <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 650, padding: '2px 8px', borderRadius: 9999,
                    background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', color: '#7C3AED', display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}><Sparkles size={9} /> AI {conf}%</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B' }}>
                    {Math.round((page.source_coverage ?? 0) * 100)}% coverage
                  </span>
                </div>
              </div>
            </div>

            {/* ── Related Articles ── */}
            {(related ?? []).length > 0 && (
              <div style={{ marginTop: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 4, background: '#2563EB' }} />
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A' }}>Related Articles</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {(related ?? []).map((r: any) => (
                    <div key={r.id} onClick={() => navigate(`/wiki/${r.slug}`)} style={{
                      padding: 16, borderRadius: 6, background: isDark ? '#1A1A1A' : '#FFFFFF',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', cursor: 'pointer',
                      transition: 'border-color 120ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>
                        {r.domain_code}
                        {r.read_time_minutes ? ` · ${r.read_time_minutes} min` : ''}
                        {r.ai_confidence ? ` · ${Math.round(r.ai_confidence * 100)}%` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* ── Infobox sidebar ── */}
          <aside style={{
            position: 'sticky', top: 80, borderRadius: 6,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : '#FFFFFF',
            overflow: 'hidden', fontSize: 12,
          }}>
            <div style={{
              background: '#2563EB', color: '#FFFFFF', padding: '10px 14px',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
            }}>Article Info</div>

            {infoRows.map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 14px', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(15,23,42,0.06)',
              }}>
                <span style={{ color: isDark ? '#A1A1A1' : '#64748B', fontSize: 11 }}>{row.label}</span>
                <span style={{ fontSize: 11, color: isDark ? '#EDEDED' : '#0F172A', fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </aside>
        </div>
      </div>

      {/* ── Version History slide-over panel ── */}
      {showHistory && (
        <VersionHistoryPanel
          versions={versions ?? []}
          onRestore={handleRestore}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* ── Print styles ── */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        @media print {
          nav, button, aside, [data-no-print] { display: none !important; }
          div[style*="position: fixed"] { display: none !important; }
          article { max-width: 100% !important; }
          body { background: white !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Delivery Status sub-component ── */
function DeliveryStatusSection({ content }: { content: string | null }) {
  const { isDark } = useTheme();
  if (!content) return <div style={{ fontSize: 13, color: isDark ? '#878787' : '#94A3B8' }}>No delivery data available.</div>;
  return (
    <div style={{
      borderRadius: 6, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#334155', padding: 16, lineHeight: 1.7 }}>{content}</div>
    </div>
  );
}

/* ── References sub-component ── */
function ReferencesSection({ refs }: { refs: any[] }) {
  const { isDark } = useTheme();
  if (refs.length === 0) return <div style={{ fontSize: 12, color: isDark ? '#878787' : '#94A3B8', padding: 8 }}>No references.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {refs.map((r: any) => (
        <div key={r.ref_number ?? r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#878787' : '#94A3B8', minWidth: 24 }}>[{r.ref_number}]</span>
          {r.source_type === 'jira' ? (
            <span style={{ fontSize: 11, fontWeight: 650, color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>{r.source_key}</span>
          ) : r.source_type === 'document' ? (
            <span style={{ fontSize: 11, fontWeight: 650, padding: '2px 6px', borderRadius: 4, background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', color: '#7C3AED' }}>{r.source_key}</span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#A1A1A1' : '#334155' }}>{r.source_key}</span>
          )}
          <span style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B' }}>{r.description || '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton ── */
function ArticleSkeleton() {
  const { isDark } = useTheme();
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%', padding: '20px 40px 48px' }}>
      <Sk w={200} h={14} style={{ marginBottom: 24 }} isDark={isDark} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32 }}>
        <div>
          <Sk w="60%" h={28} style={{ marginBottom: 12 }} isDark={isDark} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <Sk w={80} h={14} isDark={isDark} /><Sk w={60} h={14} isDark={isDark} /><Sk w={40} h={14} isDark={isDark} />
          </div>
          <Sk w="100%" h={60} style={{ marginBottom: 24 }} isDark={isDark} />
          <Sk w="100%" h={16} style={{ marginBottom: 8 }} isDark={isDark} />
          <Sk w="90%" h={16} style={{ marginBottom: 8 }} isDark={isDark} />
          <Sk w="95%" h={16} style={{ marginBottom: 8 }} isDark={isDark} />
          <Sk w="80%" h={16} style={{ marginBottom: 24 }} isDark={isDark} />
          <Sk w="100%" h={16} style={{ marginBottom: 8 }} isDark={isDark} />
          <Sk w="85%" h={16} isDark={isDark} />
        </div>
        <div style={{ borderRadius: 6, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', overflow: 'hidden' }}>
          <Sk w="100%" h={36} style={{ borderRadius: 0 }} isDark={isDark} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(15,23,42,0.06)' }}>
              <Sk w={60} h={12} isDark={isDark} /><Sk w={80} h={12} isDark={isDark} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Domain slug map ── */
const DOMAIN_SLUGS: Record<string, string> = {
  D1: 'industrial-licensing', D2: 'customs-trade', D3: 'chemical-permits',
  D4: 'environmental-compliance', D5: 'industrial-incentives',
  D6: 'fourth-industrial-revolution', D7: 'workforce-support',
  D8: 'senaei-platform', D9: 'mining-minerals',
};
