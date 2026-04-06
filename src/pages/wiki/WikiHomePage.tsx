import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Upload, Zap, FileText, FileDown,
  ShieldCheck, ThumbsUp, HelpCircle, Plus, ArrowRight,
  BookOpen, ChevronRight, CheckCircle2, Star, GraduationCap,
  Factory, Ship, FlaskConical, Leaf, Flag, Cpu, Users, Globe, Mountain,
  MessageCircle,
} from 'lucide-react';
import {
  useWikiHomeStats, useWikiDomainCards, useWikiRecentArticles,
  useWikiQuickRefs, useWikiLearningPaths, useWikiKnowledgeRequests,
  useToggleBookmark, useWikiUserBookmarks, useWikiUserPrefs,
  useWikiPendingAcknowledgments,
} from '@/hooks/useWikiHub';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';
import { WikiUploadWizard } from '@/components/wiki/WikiUploadWizard';
import { WikiChatPanel } from '@/components/wiki/WikiChatPanel';
import { WikiQuickRefDrawer } from '@/components/wiki/WikiQuickRefDrawer';
import { WikiKnowledgeRequestForm } from '@/components/wiki/WikiKnowledgeRequestForm';
import { WikiOnboardingWizard } from '@/components/wiki/WikiOnboardingWizard';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import wikiHubIcon from '@/assets/catalyst-logo-white.svg';

/* ── Constants ── */
const DOMAIN_ICONS: Record<string, React.ComponentType<any>> = {
  D1: Factory, D2: Ship, D3: FlaskConical, D4: Leaf, D5: Flag,
  D6: Cpu, D7: Users, D8: Globe, D9: Mountain,
};

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  CORE: { bg: '#DBEAFE', color: '#7DB8FC' },
  REGULATORY: { bg: 'rgba(251,191,36,0.10)', color: '#FBBF24' },
  SUPPORT: { bg: '#E0E7FF', color: '#3730A3' },
};

/* ── Skeleton ── */
const Skeleton = ({ w, h, style, isDark }: { w: string | number; h: number; style?: React.CSSProperties; isDark?: boolean }) => (
  <div style={{ width: w, height: h, borderRadius: 4, background: isDark ? '#1A1A1A' : 'rgba(255,255,255,0.10)', animation: 'pulse 1.5s ease-in-out infinite', ...style }} />
);

/* ── Section Header ── */
const SectionHeader = React.memo(({ title, count, rightLabel, rightAction, isDark }: {
  title: string; count?: number; rightLabel?: string; rightAction?: () => void; isDark?: boolean;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{ width: 3, height: 16, borderRadius: 4, background: '#2563EB' }} />
    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{title}</span>
    {count !== undefined && (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#1A1A1A', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>{count}</span>
    )}
    {rightLabel && (
      <span onClick={rightAction} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 650, color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
        {rightLabel} <ChevronRight size={12} />
      </span>
    )}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ═══ WIKI HOME PAGE ═══ */
export default function WikiHomePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: stats, isLoading: statsLoading } = useWikiHomeStats();
  const { data: domains, isLoading: domainsLoading } = useWikiDomainCards();
  const { data: articles, isLoading: articlesLoading } = useWikiRecentArticles(8);
  const { data: quickRefs, isLoading: qrLoading } = useWikiQuickRefs();
  const { data: paths, isLoading: pathsLoading } = useWikiLearningPaths();
  const { data: requests } = useWikiKnowledgeRequests();
  const { data: bookmarkedIds } = useWikiUserBookmarks();
  const toggleBookmark = useToggleBookmark();
  const { data: userPrefs } = useWikiUserPrefs();
  const { data: pendingAcks = [] } = useWikiPendingAcknowledgments();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [krFormOpen, setKrFormOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = userPrefs !== undefined && userPrefs !== null ? !userPrefs.onboarding_completed && !onboardingDismissed : false;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const [activeChip, setActiveChip] = useState('All Domains');
  const chips = [
    { label: 'All Domains', icon: <Globe size={12} /> },
    { label: 'Articles', icon: <FileText size={12} /> },
    { label: 'PDFs', icon: <FileDown size={12} /> },
    { label: 'Verified Only', icon: <ShieldCheck size={12} /> },
  ];

  const bookmarkSet = new Set(bookmarkedIds ?? []);

  return (
    <div style={{ fontFamily: 'Geist, -apple-system, sans-serif', color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', background: isDark ? '#0A0A0A' : '#1A1A1A', minHeight: '100%' }}>
      {/* Onboarding Wizard */}
      {showOnboarding && <WikiOnboardingWizard onComplete={() => setOnboardingDismissed(true)} />}

      {/* Pending Acknowledgments Banner */}
      {pendingAcks.length > 0 && (
        <div style={{ margin: '0 28px', padding: '10px 16px', background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.10)', border: isDark ? '0.75px solid rgba(251,191,36,0.2)' : '0.75px solid #FDE68A', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: isDark ? '#FBBF24' : '#FBBF24', fontWeight: 500 }}>
          <ShieldCheck size={14} />
          <span>{pendingAcks.length} article{pendingAcks.length !== 1 ? 's' : ''} require your acknowledgment</span>
        </div>
      )}
      {/* ═══ HERO ═══ */}
      <div style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', position: 'relative', overflow: 'hidden', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(15,23,42,0.08)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563EB, #7C3AED, #2563EB)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: isDark ? 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)' : 'linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div style={{ padding: '48px 40px 40px', display: 'flex', gap: 40, alignItems: 'flex-start', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320, maxWidth: 640 }}>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>WikiHub</h1>
            <p style={{ fontSize: 12, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', margin: '0 0 20px' }}>
              Ministry of Industry Knowledge Platform — 9 Domains · {stats?.totalArticles ?? 0} Articles · {stats?.totalDocuments ?? 0} Documents
            </p>

            {/* Search bar */}
            <div onClick={() => setCmdOpen(true)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setCmdOpen(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', cursor: 'pointer',
              background: isDark ? '#1A1A1A' : '#FFFFFF', transition: 'border-color 150ms, box-shadow 150ms', marginBottom: 12, height: 40,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Search size={15} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }} />
              <span style={{ flex: 1, fontSize: 13, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>Search articles, regulations, permits...</span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, background: 'rgba(124,58,237,0.06)', color: '#7C3AED' }}>AI-powered</span>
              <button style={{ fontSize: 12, fontWeight: 650, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer' }}>Search</button>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {chips.map(c => {
                const active = activeChip === c.label;
                return (
                  <button key={c.label} onClick={() => setActiveChip(c.label)} style={{
                    fontSize: 11, fontWeight: active ? 650 : 500, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    border: active ? '1.5px solid #2563EB' : isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', background: active ? (isDark ? 'rgba(37,99,235,0.12)' : 'rgba(59,130,246,0.06)') : (isDark ? '#1A1A1A' : '#FFFFFF'), color: active ? '#2563EB' : (isDark ? '#878787' : 'rgba(237,237,237,0.40)'), transition: 'all 120ms',
                  }}>{c.icon} {c.label}</button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setUploadOpen(true)} style={{ fontSize: 12, fontWeight: 650, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} /> Upload Document
              </button>
            </div>
          </div>

          {/* 2×2 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minWidth: 260 }}>
            {statsLoading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#1A1A1A', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)' }}>
                <Skeleton w={48} h={28} style={{ marginBottom: 8 }} isDark={isDark} /><Skeleton w={80} h={12} isDark={isDark} />
              </div>
            )) : (
              <>
                <StatCard label="Total Articles" value={stats?.totalArticles ?? 0} isDark={isDark} />
                <StatCard label="Documents" value={stats?.totalDocuments ?? 0} isDark={isDark} />
                <StatCard label="Verified" value={`${stats?.verifiedPercent ?? 0}%`} valueColor="#2563EB" isDark={isDark} />
                <StatCard label="Open Requests" value={stats?.openRequests ?? 0} valueColor={(stats?.openRequests ?? 0) > 0 ? '#D97706' : undefined} isDark={isDark} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 40px 48px' }}>
        {/* ═══ QUICK REFERENCE ═══ */}
        <SectionHeader title="Quick Reference" count={quickRefs?.length ?? 0} rightLabel="View All" rightAction={() => {}} isDark={isDark} />
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginBottom: 40, scrollSnapType: 'x mandatory' }}>
          {qrLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ minWidth: 190, maxWidth: 190, padding: 16, borderRadius: 8, border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', background: isDark ? '#1A1A1A' : '#FFFFFF' }}>
              <Skeleton w="80%" h={14} style={{ marginBottom: 12 }} isDark={isDark} /><Skeleton w="60%" h={12} isDark={isDark} />
            </div>
          )) : (quickRefs ?? []).length > 0 ? (quickRefs ?? []).map((qr: any) => (
            <QuickRefCard key={qr.id} qr={qr} onClick={() => setSelectedQR(qr)} isDark={isDark} />
          )) : (
            <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontSize: 12, width: '100%' }}>No quick reference cards yet.</div>
          )}
        </div>

        {/* ═══ KNOWLEDGE REQUEST BANNER ═══ */}
        <div onClick={() => setKrFormOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 8,
          background: isDark ? '#1A1A1A' : '#FFFFFF', border: '0.75px solid rgba(37,99,235,0.2)', marginBottom: 40, flexWrap: 'wrap',
          cursor: 'pointer', transition: 'border-color 150ms, background 150ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = isDark ? '#1A1A1A' : '#F0F5FF'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'; e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFFFFF'; }}
        >
          <HelpCircle size={16} style={{ color: '#2563EB' }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 12, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)' }}>Can't find what you need? </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', cursor: 'pointer' }} onClick={() => setKrFormOpen(true)}>Submit a Knowledge Request</span>
            <span style={{ fontSize: 12, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)' }}> — route to domain experts</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(59,130,246,0.06)', color: '#2563EB' }}>
            {requests?.length ?? 0} open
          </span>
        </div>

        {/* ═══ DOMAIN KNOWLEDGE HUB ═══ */}
        <SectionHeader title="Domain Knowledge Hub" count={9} rightLabel="All 9 Domains" rightAction={() => navigate('/wiki/domains')} isDark={isDark} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10, marginBottom: 40 }}>
          {domainsLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)' }}>
              <Skeleton w={160} h={16} style={{ marginBottom: 12 }} isDark={isDark} /><Skeleton w="100%" h={3} style={{ marginBottom: 8 }} isDark={isDark} /><Skeleton w="60%" h={12} isDark={isDark} />
            </div>
          )) : (domains ?? []).slice(0, 6).map((d: any) => {
            const Icon = DOMAIN_ICONS[d.domain_code] || Globe;
            return <DomainCard key={d.domain_code} d={d} Icon={Icon} navigate={navigate} isDark={isDark} />;
          })}
        </div>

        {/* ═══ LEARNING PATHS ═══ */}
        <SectionHeader title="Learning Paths" count={paths?.length ?? 0} rightLabel="View All" rightAction={() => navigate('/wiki/learning-paths')} isDark={isDark} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 40 }}>
          {pathsLoading ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)' }}>
              <Skeleton w={140} h={16} style={{ marginBottom: 12 }} isDark={isDark} /><Skeleton w="100%" h={4} style={{ marginBottom: 8 }} isDark={isDark} /><Skeleton w="60%" h={12} isDark={isDark} />
            </div>
          )) : (paths ?? []).length > 0 ? (paths ?? []).map((p: any) => <LearningPathCard key={p.id} p={p} navigate={navigate} isDark={isDark} />) : (
            <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontSize: 12, gridColumn: '1 / -1' }}>No learning paths configured yet.</div>
          )}
        </div>

        {/* ═══ RECENTLY UPDATED TABLE ═══ */}
        <SectionHeader title="Recent Articles" count={articles?.length ?? 0} rightLabel="View All Articles" rightAction={() => navigate('/wiki/articles')} isDark={isDark} />
        <div style={{ borderRadius: 8, border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', background: isDark ? '#1A1A1A' : '#FFFFFF', overflow: 'hidden', marginBottom: 40 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '3% 34% 8% 12% 8% 8% 14% 5% 3%',
            background: isDark ? '#1A1A1A' : '#1A1A1A', padding: '8px 12px', height: 50, alignItems: 'center', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)',
            fontFamily: 'Sora, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', letterSpacing: '0.05em',
          }}>
            <span></span><span>Article</span><span>Domain</span><span>Status</span><span>Confidence</span><span>Helpful</span><span>Tags</span><span>Ver.</span><span></span>
          </div>
          {articlesLoading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3% 34% 8% 12% 8% 8% 14% 5% 3%', padding: '8px 12px', height: 42, alignItems: 'center', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)' }}>
              <span /><Skeleton w="80%" h={12} isDark={isDark} /><Skeleton w={30} h={12} isDark={isDark} /><Skeleton w={60} h={12} isDark={isDark} /><Skeleton w={40} h={12} isDark={isDark} /><Skeleton w={30} h={12} isDark={isDark} /><Skeleton w={80} h={12} isDark={isDark} /><Skeleton w={20} h={12} isDark={isDark} /><span />
            </div>
          )) : (articles ?? []).length > 0 ? (articles ?? []).map((a: any) => (
            <ArticleRow key={a.id} a={a} navigate={navigate} bookmarked={bookmarkSet.has(a.id)} onToggleBookmark={() => toggleBookmark.mutate({ pageId: a.id })} isDark={isDark} />
          )) : (
            <div style={{ padding: 40, textAlign: 'center', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontSize: 12 }}>No articles yet — upload a document or run a sync to get started.</div>
          )}
        </div>
      </div>

      {/* ═══ AI CHATBOT FAB — Wiki Convergence Hub Icon ═══ */}
      <div onClick={() => setChatOpen(!chatOpen)} style={{
        position: 'fixed', bottom: 24, right: 24, width: 48, height: 48, borderRadius: 14,
        background: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', transition: 'transform 150ms, box-shadow 150ms', zIndex: 50,
        overflow: 'hidden',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)'; }}
      >
        <img src={wikiHubIcon} alt="Ask Catalyst" style={{ width: 32, height: 32, borderRadius: 8 }} />
      </div>

      <WikiCommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <WikiUploadWizard open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <WikiChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <WikiQuickRefDrawer open={!!selectedQR} onClose={() => setSelectedQR(null)} qr={selectedQR} />
      <WikiKnowledgeRequestForm open={krFormOpen} onClose={() => setKrFormOpen(false)} />

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

/* ── Stat Card ── */
const StatCard = React.memo(({ label, value, valueColor, isDark }: { label: string; value: string | number; valueColor?: string; isDark?: boolean }) => (
  <div style={{
    padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#1A1A1A', textAlign: 'center',
    border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', transition: 'all 150ms', cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = isDark ? 'rgba(37,99,235,0.12)' : 'rgba(59,130,246,0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.background = isDark ? '#1A1A1A' : '#1A1A1A'; }}
  >
    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: valueColor || (isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)') }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', letterSpacing: '0.05em', marginTop: 4 }}>{label}</div>
  </div>
));
StatCard.displayName = 'StatCard';

/* ── Domain color map for quick ref icons ── */
const DOMAIN_COLORS: Record<string, { bg: string; fg: string }> = {
  D1: { bg: '#DBEAFE', fg: '#7DB8FC' },   // blue
  D2: { bg: '#CFFAFE', fg: '#0E7490' },   // cyan
  D3: { bg: 'rgba(251,191,36,0.10)', fg: '#FBBF24' },   // amber
  D4: { bg: '#DCFCE7', fg: '#166534' },   // green
  D5: { bg: '#EDE9FE', fg: '#A78BFA' },   // purple
  D6: { bg: '#DBEAFE', fg: '#7DB8FC' },   // blue
  D7: { bg: '#CCFBF1', fg: '#0F766E' },   // teal
  D8: { bg: '#DBEAFE', fg: '#7DB8FC' },   // blue
  D9: { bg: 'rgba(251,191,36,0.10)', fg: '#FBBF24' },   // amber
};

/* ── Quick Ref Card ── */
const QuickRefCard = React.memo(({ qr, onClick, isDark }: { qr: any; onClick: () => void; isDark?: boolean }) => {
  const dc = DOMAIN_COLORS[qr.domain_code] || { bg: '#1A1A1A', fg: 'rgba(237,237,237,0.40)' };
  const Icon = DOMAIN_ICONS[qr.domain_code] || FileText;
  return (
    <div onClick={onClick} style={{
      minWidth: 190, maxWidth: 190, padding: 16, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF',
      border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', cursor: 'pointer', scrollSnapAlign: 'start', transition: 'border-color 120ms, box-shadow 120ms, transform 120ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 6, background: isDark ? 'rgba(37,99,235,0.12)' : dc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={15} style={{ color: dc.fg }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', marginBottom: 8, lineHeight: 1.3 }}>{qr.title}</div>
      <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#2563EB', fontWeight: 500 }}>{qr.steps} steps</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontWeight: 500 }}>{formatK(qr.view_count ?? qr.views ?? 0)} views</span>
      </div>
    </div>
  );
});
QuickRefCard.displayName = 'QuickRefCard';

/* ── Domain Card ── */
const DomainCard = React.memo(({ d, Icon, navigate, isDark }: { d: any; Icon: React.ComponentType<any>; navigate: any; isDark?: boolean }) => {
  const [hovered, setHovered] = useState(false);
  const tagStyle = TAG_STYLES[d.tag] || TAG_STYLES.SUPPORT;
  const dc = DOMAIN_COLORS[d.domain_code] || { bg: '#1A1A1A', fg: 'rgba(237,237,237,0.40)' };
  const coverageColor = d.coverage_percent >= 80 ? '#16A34A' : d.coverage_percent >= 60 ? '#2563EB' : '#D97706';

  return (
    <div onClick={() => navigate(`/wiki/domains/${d.domain_code}`)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', cursor: 'pointer', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'border-color 120ms, box-shadow 120ms', borderColor: hovered ? '#2563EB' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), boxShadow: hovered ? '0 2px 8px rgba(37,99,235,0.08)' : 'none' }}
    >
      <div style={{ width: 3, background: hovered ? dc.fg : 'transparent', transition: 'background 200ms' }} />
      <div style={{ flex: 1, padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, background: isDark ? 'rgba(37,99,235,0.12)' : dc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms' }}>
            <Icon size={16} style={{ color: dc.fg }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', background: isDark ? '#1A1A1A' : '#1A1A1A', padding: '1px 5px', borderRadius: 3 }}>{d.domain_code}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12.5, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{d.name}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: isDark ? 'rgba(55,48,163,0.15)' : tagStyle.bg, color: isDark ? '#A1A1A1' : tagStyle.color, letterSpacing: '0.04em' }}>{d.tag}</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 10 }}>
          {[{ v: d.article_count, l: 'Articles' }, { v: formatK(d.view_count), l: 'Views' }, { v: d.knowledge_gaps, l: 'Gaps' }].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{s.v}</div>
              <div style={{ fontSize: 9, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Coverage bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>Coverage</span>
          <div style={{ flex: 1, height: 3, borderRadius: 4, background: isDark ? '#1A1A1A' : 'rgba(255,255,255,0.10)' }}>
            <div style={{ height: '100%', borderRadius: 4, background: coverageColor, width: `${d.coverage_percent}%`, transition: 'width 600ms' }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{d.coverage_percent}%</span>
        </div>
      </div>
    </div>
  );
});
DomainCard.displayName = 'DomainCard';

/* ── Learning Path Card ── */
const LearningPathCard = React.memo(({ p, navigate, isDark }: { p: any; navigate: any; isDark?: boolean }) => {
  const pct = p.article_count > 0 ? Math.round((p.completedCount / p.article_count) * 100) : 0;
  const diffColor = p.difficulty === 'beginner' ? '#16A34A' : p.difficulty === 'intermediate' ? '#2563EB' : '#D97706';
  return (
    <div onClick={() => navigate(`/wiki/learning-paths/${p.id}`)} style={{ padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', transition: 'border-color 120ms, box-shadow 120ms', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GraduationCap size={16} style={{ color: '#FFFFFF' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12.5, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{p.title}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: diffColor }}>{p.difficulty}</span>
      </div>
      <div style={{ fontSize: 11.5, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', marginBottom: 12, lineHeight: 1.4 }}>{p.description}</div>
      <div style={{ height: 4, borderRadius: 4, background: isDark ? '#1A1A1A' : 'rgba(255,255,255,0.10)', marginBottom: 8 }}>
        <div style={{ height: '100%', borderRadius: 4, background: '#2563EB', width: `${pct}%`, transition: 'width 600ms' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>
        <span>{p.estimated_hours}h · {p.article_count} articles</span>
        <span>{pct}% complete</span>
      </div>
    </div>
  );
});
LearningPathCard.displayName = 'LearningPathCard';

/* ── Article Row ── */
const ArticleRow = React.memo(({ a, navigate, bookmarked, onToggleBookmark, isDark }: { a: any; navigate: any; bookmarked: boolean; onToggleBookmark: () => void; isDark?: boolean }) => {
  const formatIcon = a.format === 'pdf'
    ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: isDark ? 'rgba(220,38,38,0.15)' : 'rgba(248,113,113,0.10)', color: '#DC2626' }}>PDF</span>
    : <FileText size={14} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }} />;

  const verStatus = a.verification_status || 'unverified';
  const verBadge = verStatus === 'verified'
    ? { bg: 'rgba(22,163,74,0.08)', color: '#16A34A', label: 'Verified' }
    : verStatus === 'needs_review'
    ? { bg: 'rgba(217,119,6,0.08)', color: '#D97706', label: 'Needs Review' }
    : { bg: isDark ? 'rgba(107,101,96,0.15)' : 'rgba(100,116,139,0.08)', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', label: 'Unverified' };

  const conf = Math.round((a.ai_confidence ?? 0) * 100);
  const confColor = conf >= 90 ? '#16A34A' : conf >= 70 ? '#2563EB' : '#D97706';
  const tags = (a.tags ?? []).slice(0, 3);

  return (
    <div onClick={() => navigate(`/wiki/${a.slug}`)} style={{
      display: 'grid', gridTemplateColumns: '3% 34% 8% 12% 8% 8% 14% 5% 3%',
      padding: '8px 12px', height: 42, alignItems: 'center', cursor: 'pointer',
      borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', fontSize: 12, transition: 'background 80ms',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Format */}
      <span>{formatIcon}</span>

      {/* Article title + TL;DR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, paddingRight: 8 }}>
        <span style={{ fontWeight: 500, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{a.title}</span>
        {a.tldr && (
          <span title={a.tldr} style={{ fontSize: 10, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 2, cursor: 'help', flexShrink: 0 }}>TL;DR</span>
        )}
      </div>

      {/* Domain */}
      <span style={{ fontSize: 9, fontWeight: 650, padding: '1px 5px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#1A1A1A', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', width: 'fit-content' }}>{a.domain_code}</span>

      {/* Verification Status */}
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: verBadge.bg, color: verBadge.color, width: 'fit-content' }}>{verBadge.label}</span>

      {/* Confidence — colored number only */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, color: confColor }}>{conf}%</span>

      {/* Helpful */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>{Math.round(a.helpfulness_score ?? 0)}%</span>

      {/* Tags — grey pills */}
      <div style={{ display: 'flex', gap: 3, overflow: 'hidden' }}>
        {tags.map((t: string) => (
          <span key={t} style={{ fontSize: 9.5, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#1A1A1A', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', border: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>{t}</span>
        ))}
      </div>

      {/* Version */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }}>v{a.version ?? 1}</span>

      {/* Bookmark */}
      <span onClick={e => { e.stopPropagation(); onToggleBookmark(); }} style={{ cursor: 'pointer' }}>
        <Star size={13} fill={bookmarked ? '#2563EB' : 'none'} style={{ color: bookmarked ? '#2563EB' : (isDark ? '#878787' : 'rgba(237,237,237,0.53)') }} />
      </span>
    </div>
  );
});
ArticleRow.displayName = 'ArticleRow';
