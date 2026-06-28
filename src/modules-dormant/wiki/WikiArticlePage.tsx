import React, { useEffect, useState, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWikiPage, useLogWikiRead } from '@/hooks/useWikiData';
import { useWikiRelatedArticles, useSubmitArticleFeedback } from '@/hooks/useWikiHub';
import {
  Star, ThumbsUp, ThumbsDown, ChevronRight, Clock, GitBranch, Sparkles,
  FileText, FileDown, Video, ShieldCheck, BookOpen, ArrowRight, History,
  Printer, Download, Link2, RotateCcw, ExternalLink, ChevronDown, X,
} from '@/lib/atlaskit-icons';
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

/* ── StatusLozenge (V12 3-color guardrail + DARK MODE dark) ── */
function StatusLozenge({ status }: { status: string }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const s = (status || '').toLowerCase();
  const map: Record<string, { bg: [string, string]; color: [string, string]; label: string }> = {
    published:    { bg: ['var(--ds-background-success)', 'var(--ds-background-success-bold, rgba(74,222,128,0.10))'], color: ['var(--ds-text-success, var(--ds-text-success))', 'var(--ds-background-success)'], label: 'PUBLISHED' },
    done:         { bg: ['var(--ds-background-success)', 'var(--ds-background-success-bold, rgba(74,222,128,0.10))'], color: ['var(--ds-text-success, var(--ds-text-success))', 'var(--ds-background-success)'], label: 'DONE' },
    verified:     { bg: ['var(--ds-background-success)', 'var(--ds-background-success-bold, rgba(74,222,128,0.10))'], color: ['var(--ds-text-success, var(--ds-text-success))', 'var(--ds-background-success)'], label: 'VERIFIED' },
    'in progress':{ bg: ['var(--ds-background-information)', 'var(--ds-background-information-bold, rgba(59,130,246,0.10))'], color: ['var(--ds-link-pressed, var(--ds-link-pressed))', 'var(--ds-background-information-bold, var(--ds-link))'], label: 'IN PROGRESS' },
    review:       { bg: ['var(--ds-background-information)', 'var(--ds-background-information-bold, rgba(59,130,246,0.10))'], color: ['var(--ds-link-pressed, var(--ds-link-pressed))', 'var(--ds-background-information-bold, var(--ds-link))'], label: 'IN REVIEW' },
    needs_review: { bg: ['var(--ds-background-information)', 'var(--ds-background-information-bold, rgba(59,130,246,0.10))'], color: ['var(--ds-link-pressed, var(--ds-link-pressed))', 'var(--ds-background-information-bold, var(--ds-link))'], label: 'NEEDS REVIEW' },
    draft:        { bg: ['var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', 'var(--ds-border, var(--cp-ink-1))'],               color: ['var(--ds-text)', 'var(--ds-text-subtlest)'], label: 'DRAFT' },
    archived:     { bg: ['var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', 'var(--ds-border, var(--cp-ink-1))'],               color: ['var(--ds-text)', 'var(--ds-text-subtlest)'], label: 'ARCHIVED' },
  };
  const d = { bg: ['var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', 'var(--ds-border, var(--cp-ink-1))'] as [string, string], color: ['var(--ds-text)', 'var(--ds-text-subtlest)'] as [string, string], label: (status || '—').toUpperCase() };
  const v = map[s] || d;
  return (
    <span style={{
      fontSize: 'var(--ds-font-size-100)', fontWeight: 700, padding: '0px 6px', borderRadius: 3, letterSpacing: '0.03em',
      background: isDark ? v.bg[1] : v.bg[0], color: isDark ? v.color[1] : v.color[0], textTransform: 'uppercase',
    }}>{v.label}</span>
  );
}

/* ── Skeleton ── */
const Sk = ({ w, h, style, isDark }: { w: string | number; h: number; style?: React.CSSProperties; isDark?: boolean }) => (
  <div style={{
    width: w, height: h, borderRadius: 4, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))',
    animation: 'pulse 1.5s ease-in-out infinite', ...style,
  }} />
);

/* ── Module icon map for cross-links ── */
const MODULE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  task: { bg: 'var(--ds-background-selected)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', label: 'Tasks' },
  product: { bg: 'var(--ds-background-discovery)', color: 'var(--cp-purple-60, var(--ds-background-discovery-bold))', label: 'ProductHub' },
  incident: { bg: 'var(--ds-background-danger)', color: 'var(--ds-text-danger, var(--cp-danger))', label: 'IncidentHub' },
  release: { bg: 'var(--ds-background-success)', color: 'var(--quality-high, var(--ds-background-success-bold))', label: 'ReleaseHub' },
  requirement: { bg: 'var(--ds-background-warning)', color: 'var(--ds-text-warning, var(--cp-warning))', label: 'Requirements' },
  wiki: { bg: '#F0F9FF', color: 'var(--ds-link)', label: 'WikiHub' },
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
      background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', borderLeft: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))',
      boxShadow: isDark ? '-8px 0 24px var(--ds-shadow-raised, rgba(0,0,0,0.3))' : '-8px 0 24px var(--ds-shadow-overlay, rgba(15,23,42,0.08))',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--cp-font-body)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: isDark ? '0.75px solid var(--ds-background-neutral)' : '0.75px solid var(--ds-shadow-overlay, rgba(15,23,42,0.08))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />
          <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>Version History</span>
          <span style={{
            fontSize: 'var(--ds-font-size-50)', fontWeight: 650, padding: '0px 6px', borderRadius: 9999,
            background: isDark ? 'var(--ds-background-information, rgba(37,99,235,0.12))' : 'var(--ds-background-selected)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
          }}>{versions.length}</span>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
        }}><X size={16} /></button>
      </div>

      {/* Version list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {versions.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <History size={32} style={{ color: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', marginBottom: 12 }} />
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>No version history yet</div>
          </div>
        ) : versions.map((v: any, i: number) => (
          <div key={v.id || i} style={{
            padding: '12px 20px', borderBottom: isDark ? '0.75px solid var(--ds-text)' : '0.75px solid var(--ds-shadow-overlay, rgba(15,23,42,0.04))',
            transition: 'background 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'var(--ds-surface-overlay)' : 'var(--ds-surface-sunken)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                  color: i === 0 ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
                  padding: '0px 6px', borderRadius: 4,
                  background: i === 0 ? (isDark ? 'var(--ds-background-information, rgba(37,99,235,0.12))' : 'var(--ds-background-selected)') : (isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))'),
                }}>v{v.version_number}</span>
                {i === 0 && (
                  <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--quality-high, var(--ds-background-success-bold))', textTransform: 'uppercase' as const }}>CURRENT</span>
                )}
              </div>
              {i > 0 && (
                <button onClick={() => onRestore(v)} style={{
                  fontSize: 'var(--ds-font-size-50)', fontWeight: 650, padding: '4px 10px', borderRadius: 4,
                  border: '1px solid var(--ds-background-information, rgba(37,99,235,0.3))', background: isDark ? 'var(--ds-background-information, rgba(37,99,235,0.12))' : 'var(--ds-background-selected)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <RotateCcw size={10} /> Restore
                </button>
              )}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 4 }}>{v.title || 'Untitled'}</div>
            {v.change_summary && (
              <div style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 4, lineHeight: 1.5 }}>{v.change_summary}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>
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
      position: 'absolute', top: '48%', right: 0, marginTop: 4, zIndex: 50,
      background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', borderRadius: 6, border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))',
      boxShadow: isDark ? '0 4px 12px var(--ds-shadow-raised, rgba(0,0,0,0.3))' : '0 4px 12px var(--ds-shadow-overlay, rgba(15,23,42,0.08))', minWidth: 160, overflow: 'hidden',
    }}>
      <button onClick={handlePdf} style={{
        width: '100%', padding: '8px 14px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
        color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
      }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'var(--ds-surface-overlay)' : 'var(--ds-surface-sunken)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Download size={13} style={{ color: 'var(--ds-text-danger, var(--cp-danger))' }} /> Export as PDF
      </button>
      <button onClick={handlePrint} style={{
        width: '100%', padding: '8px 14px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
        color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
      }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'var(--ds-surface-overlay)' : 'var(--ds-surface-sunken)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Printer size={13} style={{ color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }} /> Print
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
      border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
    }}>
      <div style={{
        fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase' as const,
        color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 8, letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Link2 size={12} /> Related Items
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {links.map((link: any) => {
          const mod = MODULE_COLORS[link.target_module] || { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', label: link.target_module };
          return (
            <span key={link.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 4, background: mod.bg, fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
              color: mod.color, cursor: 'default',
            }}>
              <span style={{
                fontSize: 'var(--ds-font-size-100)', fontWeight: 700, padding: '0px 4px', borderRadius: 4,
                background: `${mod.color}15`, color: mod.color,
              }}>{mod.label}</span>
              <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', fontWeight: 700 }}>
                {link.target_id}
              </span>
              {link.target_title && (
                <span style={{ fontWeight: 500, fontSize: 'var(--ds-font-size-100)' }}>{link.target_title}</span>
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
      <div style={{ fontFamily: 'var(--cp-font-body)', padding: 48, textAlign: 'center', background: isDark ? 'var(--cp-bg-page, var(--ds-surface))' : undefined, minHeight: '100%' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
        <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 8 }}>Article not found</div>
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 16 }}>The article you're looking for doesn't exist or has been removed.</div>
        <button onClick={() => navigate('/wiki')} style={{
          fontSize: 'var(--ds-font-size-200)', fontWeight: 650, padding: '8px 20px', borderRadius: 6,
          background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', border: 'none', cursor: 'pointer',
        }}>Return to Wiki</button>
      </div>
    );
  }

  const info = (page.infobox as any) || {};
  const sections = page.sections || [];
  const refs = page.references || [];
  const title = page.title || pageSlug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Article';
  const conf = Math.round((page.ai_confidence ?? 0) * 100);
  const confColor = conf >= 90 ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' : conf >= 70 ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' : '#9A5402';
  const verStatus = (page as any).verification_status || 'unverified';
  const verBadge = verStatus === 'verified'
    ? { bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', label: 'Verified', icon: <ShieldCheck size={10} /> }
    : verStatus === 'needs_review'
    ? { bg: 'var(--ds-link)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', label: 'Needs Review', icon: null }
    : { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--cp-text-secondary, var(--cp-text-secondary, var(--ds-icon)))', label: 'Unverified', icon: null };
  const tags = ((page as any).tags ?? []) as string[];
  const tldr = (page as any).tldr as string | null;
  const authorName = (page as any).author_name as string | null;
  const readTime = (page as any).read_time_minutes as number | null;
  const helpScore = (page as any).helpfulness_score ?? 0;
  const helpVotes = (page as any).helpfulness_votes ?? 0;
  const formatIcon = (page as any).format === 'pdf'
    ? <FileDown size={14} style={{ color: 'var(--ds-text-danger, var(--cp-danger))' }} />
    : (page as any).format === 'video'
    ? <Video size={14} style={{ color: 'var(--cp-purple-60, var(--ds-background-discovery-bold))' }} />
    : <FileText size={14} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />;

  const domainName = page.domain_code || 'Wiki';

  /* ── Infobox rows (hide null) ── */
  const infoRows = [
    { label: 'Domain', value: domainName, show: true },
    { label: 'Status', value: <StatusLozenge status={info.status || page.status || ''} />, show: true },
    { label: 'Hub', value: info.hub, show: !!info.hub },
    { label: 'Project', value: info.project, show: !!info.project },
    { label: 'Epic', value: info.epicKey ? (
      <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 650, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', fontFamily: 'var(--cp-font-mono)' }}>{info.epicKey}</span>
    ) : null, show: !!info.epicKey },
    { label: 'Stories', value: info.totalStories ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)' }}>{info.doneStories ?? 0}/{info.totalStories} done</span>
        <div style={{ width: 40, height: 3, borderRadius: 4, background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))' }}>
          <div style={{ height: '100%', borderRadius: 4, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', width: `${info.donePercent ?? 0}%` }} />
        </div>
      </div>
    ) : null, show: !!info.totalStories },
    { label: 'Done %', value: info.donePercent != null ? (
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: info.donePercent >= 80 ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' }}>{info.donePercent}%</span>
    ) : null, show: info.donePercent != null },
    { label: 'Open Defects', value: info.openDefects != null ? (
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: info.openDefects > 0 ? 'var(--ds-text-danger, var(--cp-danger))' : (isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))') }}>{info.openDefects}</span>
    ) : null, show: info.openDefects != null },
    { label: 'Sprint', value: info.currentSprint, show: !!info.currentSprint },
    { label: 'Owner', value: info.owner ? <span style={{ fontWeight: 600 }}>{info.owner}</span> : null, show: !!info.owner },
    { label: 'BRD', value: info.brdVersion, show: !!info.brdVersion },
    { label: 'Documents', value: info.documentsCount ? (
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)' }}>{info.documentsCount}</span>
    ) : null, show: !!info.documentsCount },
    { label: 'Last Sync', value: info.lastSync ? timeAgo(info.lastSync) : null, show: !!info.lastSync },
    { label: 'AI Confidence', value: (
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: confColor }}>{conf}%</span>
    ), show: true },
  ].filter(r => r.show);

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: isDark ? 'var(--cp-bg-page, var(--ds-surface))' : 'var(--ds-surface-sunken)', minHeight: '100%' }}>
      {/* Scroll progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100,
        background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.04))',
      }}>
        <div style={{
          height: '100%', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', width: `${scrollPct}%`,
          transition: 'width 60ms linear',
        }} />
      </div>

      <div style={{ padding: '16px 40px 48px' }}>
        {/* ── Breadcrumb ── */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
          <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
          <span onClick={() => navigate(`/wiki/category/${DOMAIN_SLUGS[page.domain_code || ''] || ''}`)} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>{domainName}</span>
          <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>{title}</span>
        </nav>

        {/* ── 2-column ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, alignItems: 'start' }}>
          {/* Main content */}
          <article>
            {/* Title */}
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', margin: '0 0 12px' }}>{title}</h1>

            {/* Metadata row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{page.updated_at ? timeAgo(page.updated_at) : '—'}</span>
              {conf > 0 && (
                <span style={{
                  fontSize: 'var(--ds-font-size-50)', fontWeight: 650, padding: '0px 8px', borderRadius: 9999,
                  background: isDark ? 'var(--ds-background-discovery-bold, rgba(124,58,237,0.12))' : 'var(--ds-background-discovery)', color: 'var(--cp-purple-60, var(--ds-background-discovery-bold))', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}><Sparkles size={9} /> AI {conf}%</span>
              )}
              {formatIcon}
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--cp-font-mono)' }}>
                <GitBranch size={11} /> v{page.version ?? 1}
              </span>
              {readTime && (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {readTime} min
                </span>
              )}
              <button onClick={handleBookmark} style={{
                fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', background: bookmarked ? (isDark ? 'var(--ds-background-warning, rgba(217,119,6,0.12))' : 'var(--ds-background-warning, var(--ds-background-warning))') : 'transparent',
                color: bookmarked ? 'var(--ds-text-warning, var(--cp-warning))' : (isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))'), display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Star size={12} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save'}
              </button>

              {/* ── History button ── */}
              <button onClick={() => setShowHistory(prev => !prev)} style={{
                fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', background: showHistory ? (isDark ? 'var(--ds-background-information, rgba(37,99,235,0.12))' : 'var(--ds-background-selected)') : 'transparent',
                color: showHistory ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : (isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))'), display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <History size={12} /> History
              </button>

              {/* ── Export dropdown ── */}
              <div style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setShowExport(prev => !prev); }} style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                  border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', background: showExport ? (isDark ? 'var(--ds-background-information, rgba(37,99,235,0.12))' : 'var(--ds-background-selected)') : 'transparent',
                  color: showExport ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : (isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))'), display: 'flex', alignItems: 'center', gap: 4,
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
                    width: 24, height: 24, borderRadius: '50%', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
                  }}>{authorName.charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))' }}>{authorName}</span>
                </>
              ) : (
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>No author</span>
              )}
              <span style={{
                fontSize: 'var(--ds-font-size-50)', fontWeight: 700, padding: '0px 6px', borderRadius: 4,
                background: verBadge.bg, color: verBadge.color, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>{verBadge.icon} {verBadge.label}</span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
                {tags.map(t => (
                  <span key={t} style={{
                    fontSize: 'var(--ds-font-size-50)', padding: '0px 8px', borderRadius: 4,
                    background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 500,
                  }}>{t}</span>
                ))}
              </div>
            )}

            {/* ── TL;DR ── */}
            <div style={{
              borderLeft: '3px solid var(--cp-purple-60, var(--ds-background-discovery-bold))', padding: '12px 16px', marginBottom: 24,
              background: isDark ? 'var(--ds-background-discovery-bold, rgba(124,58,237,0.06))' : '#FAFAFE', borderRadius: '0 6px 6px 0',
            }}>
              <span style={{
                fontSize: 'var(--ds-font-size-50)', fontWeight: 700, padding: '0px 8px', borderRadius: 4,
                background: isDark ? 'var(--ds-background-discovery-bold, rgba(124,58,237,0.12))' : 'var(--ds-background-discovery)', color: 'var(--cp-purple-60, var(--ds-background-discovery-bold))', display: 'inline-flex', alignItems: 'center', gap: 4,
                marginBottom: 8,
              }}><Sparkles size={10} /> TL;DR</span>
              {tldr ? (
                <div style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', lineHeight: 1.7, marginTop: 8 }}>{tldr}</div>
              ) : (
                <div style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', marginTop: 8, fontStyle: 'italic' }}>AI summary not yet generated</div>
              )}
            </div>

            {/* ── Lead paragraph ── */}
            {page.lead_content && (
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 'var(--ds-font-size-400)', lineHeight: 1.85,
                color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', marginBottom: 24, paddingBottom: 16,
                borderBottom: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.08))',
              }}>
                {page.lead_content}
              </div>
            )}

            {/* ── Table of Contents ── */}
            {sections.length > 0 && (
              <nav style={{
                background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-surface-sunken)', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))',
                borderRadius: 6, padding: 16, marginBottom: 24,
              }}>
                <div style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase' as const,
                  color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 8, letterSpacing: '0.04em',
                }}>Contents</div>
                {sections.map((s: any, i: number) => (
                  <a key={s.id} href={`#section-${i}`} style={{
                    display: 'block', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', padding: '4px 0',
                    textDecoration: 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', marginRight: 8 }}>{i + 1}.</span>
                    {s.title}
                  </a>
                ))}
              </nav>
            )}

            {/* ── Article body sections ── */}
            {sections.map((s: any, i: number) => (
              <div key={s.id} id={`section-${i}`} style={{ marginBottom: 32 }}>
                <h2 style={{
                  fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 650, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))',
                  margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-400)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>{i + 1}.</span>
                  {s.title}
                  {s.is_live_data && (
                    <span style={{
                      fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '0px 6px', borderRadius: 4,
                      background: isDark ? 'var(--ds-background-information, rgba(37,99,235,0.12))' : 'var(--ds-background-selected)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                    }}>LIVE DATA</span>
                  )}
                </h2>

                {s.section_type === 'delivery_status' ? (
                  <DeliveryStatusSection content={s.content} />
                ) : s.section_type === 'references' ? (
                  <ReferencesSection refs={refs} />
                ) : (
                  <div style={{
                    fontSize: 'var(--ds-font-size-400)', lineHeight: 1.7, color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))',
                    ...(i === 0 && !page.lead_content ? { fontFamily: 'Georgia, serif' } : {}),
                  }}>{s.content}</div>
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontSize: 'var(--ds-font-size-300)' }}>
                This article has no content sections yet.
              </div>
            )}

            {/* ── Cross-Module Links ── */}
            <CrossModuleLinks links={crossLinks ?? []} />

            {/* ── Feedback footer ── */}
            <div style={{
              marginTop: 32, padding: 16, borderRadius: 6,
              border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 650, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 4 }}>Was this helpful?</div>
                <div style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>
                  {helpVotes > 0 ? `${helpScore}% found this helpful (${helpVotes} votes)` : 'Be the first to rate this article'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => handleFeedback(true)} style={{
                  fontSize: 'var(--ds-font-size-200)', fontWeight: 650, padding: '4px 14px', borderRadius: 6,
                  border: '1px solid var(--ds-background-success-bold, rgba(22,163,74,0.3))', background: isDark ? 'var(--ds-background-success-bold, rgba(22,163,74,0.12))' : 'var(--ds-background-success)', color: 'var(--ds-text-success, var(--cp-success))',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}><ThumbsUp size={13} /> Yes</button>
                <button onClick={() => handleFeedback(false)} style={{
                  fontSize: 'var(--ds-font-size-200)', fontWeight: 650, padding: '4px 14px', borderRadius: 6,
                  border: '1px solid var(--ds-background-danger-bold, rgba(220,38,38,0.3))', background: isDark ? 'var(--ds-background-danger-bold, rgba(220,38,38,0.12))' : 'var(--ds-background-danger)', color: 'var(--ds-text-danger, var(--cp-danger))',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}><ThumbsDown size={13} /> No</button>
                <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    fontSize: 'var(--ds-font-size-50)', fontWeight: 650, padding: '0px 8px', borderRadius: 9999,
                    background: isDark ? 'var(--ds-background-discovery-bold, rgba(124,58,237,0.12))' : 'var(--ds-background-discovery)', color: 'var(--cp-purple-60, var(--ds-background-discovery-bold))', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}><Sparkles size={9} /> AI {conf}%</span>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>
                    {Math.round((page.source_coverage ?? 0) * 100)}% coverage
                  </span>
                </div>
              </div>
            </div>

            {/* ── Related Articles ── */}
            {(related ?? []).length > 0 && (
              <div style={{ marginTop: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 4, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />
                  <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-500)', fontWeight: 650, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>Related Articles</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {(related ?? []).map((r: any) => (
                    <div key={r.id} onClick={() => navigate(`/wiki/${r.slug}`)} style={{
                      padding: 16, borderRadius: 6, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
                      border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', cursor: 'pointer',
                      transition: 'border-color 120ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.12))'}
                    >
                      <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>
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
            position: 'sticky', top: 48, borderRadius: 6,
            border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
            overflow: 'hidden', fontSize: 'var(--ds-font-size-200)',
          }}>
            <div style={{
              background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', padding: '8px 14px',
              fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
            }}>Article Info</div>

            {infoRows.map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 14px', borderBottom: isDark ? '0.75px solid var(--ds-text)' : '0.75px solid var(--ds-shadow-overlay, rgba(15,23,42,0.06))',
              }}>
                <span style={{ color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-100)' }}>{row.label}</span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', fontWeight: 500 }}>{row.value}</span>
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
  if (!content) return <div style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>No delivery data available.</div>;
  return (
    <div style={{
      borderRadius: 6, border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', padding: 16, lineHeight: 1.7 }}>{content}</div>
    </div>
  );
}

/* ── References sub-component ── */
function ReferencesSection({ refs }: { refs: any[] }) {
  const { isDark } = useTheme();
  if (refs.length === 0) return <div style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', padding: 8 }}>No references.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {refs.map((r: any) => (
        <div key={r.ref_number ?? r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', minWidth: 24 }}>[{r.ref_number}]</span>
          {r.source_type === 'jira' ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 650, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', fontFamily: 'var(--cp-font-mono)' }}>{r.source_key}</span>
          ) : r.source_type === 'document' ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '0px 6px', borderRadius: 4, background: isDark ? 'var(--ds-background-discovery-bold, rgba(124,58,237,0.12))' : 'var(--ds-background-discovery)', color: 'var(--cp-purple-60, var(--ds-background-discovery-bold))' }}>{r.source_key}</span>
          ) : (
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))' }}>{r.source_key}</span>
          )}
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{r.description || '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton ── */
function ArticleSkeleton() {
  const { isDark } = useTheme();
  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', background: isDark ? 'var(--cp-bg-page, var(--ds-surface))' : 'var(--ds-surface-sunken)', minHeight: '100%', padding: '16px 40px 48px' }}>
      <Sk w={200} h={14} style={{ marginBottom: 24 }} isDark={isDark} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32 }}>
        <div>
          <Sk w="60%" h={28} style={{ marginBottom: 12 }} isDark={isDark} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
        <div style={{ borderRadius: 6, border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', overflow: 'hidden' }}>
          <Sk w="100%" h={36} style={{ borderRadius: 0 }} isDark={isDark} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '0.75px solid var(--ds-text)' : '0.75px solid var(--ds-shadow-overlay, rgba(15,23,42,0.06))' }}>
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
