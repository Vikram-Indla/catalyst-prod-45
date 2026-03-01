import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Zap, FileText } from 'lucide-react';
import { useWikiDomains, useWikiRecentPages, useWikiStats } from '@/hooks/useWikiData';
import { sectionHeaderStyle, AiBadge, DomainBadge, ConfidenceBadge, SkeletonCard, SkeletonArticleRow, SkeletonBlock, truncateStyle } from '@/components/wiki/WikiTokens';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';
import { WikiUploadWizard } from '@/components/wiki/WikiUploadWizard';

const DOMAIN_SLUGS: Record<string, string> = {
  D1: 'platform', D2: 'strategy', D3: 'products', D4: 'projects',
  D5: 'quality', D6: 'ministry', D7: 'senaei', D8: 'analytics',
};

export default function WikiHomePage() {
  const navigate = useNavigate();
  const { data: domains, isLoading: domainsLoading } = useWikiDomains();
  const { data: recentPages, isLoading: recentLoading } = useWikiRecentPages(4);
  const { data: wikiStats, isLoading: statsLoading } = useWikiStats();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const stats = [
    { label: 'Articles', value: wikiStats?.articles ?? 0 },
    { label: 'Documents', value: wikiStats?.documents ?? 0 },
    { label: 'Domains', value: wikiStats?.domains ?? 8 },
    { label: 'Categories', value: wikiStats?.categories ?? 0 },
    { label: 'Knowledge Chunks', value: wikiStats?.chunks ? wikiStats.chunks.toLocaleString() : '0' },
    { label: 'Avg Confidence', value: wikiStats?.avgConfidence ? `${wikiStats.avgConfidence}%` : '—' },
  ];

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%', paddingBottom: 48 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '48px 28px 32px' }}>
        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: 'var(--cp-text-primary)' }}>
          Catalyst Wiki
        </h1>
        <p style={{ fontSize: 14, color: 'var(--cp-text-tertiary)', margin: '0 0 24px', maxWidth: 480, marginInline: 'auto' }}>
          AI-powered enterprise knowledge encyclopedia for the Catalyst platform
        </p>

        {/* Search bar */}
        <div
          role="search"
          onClick={() => setCmdOpen(true)}
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') setCmdOpen(true); }}
          style={{
            maxWidth: 560, margin: '0 auto 20px', display: 'flex', alignItems: 'center',
            gap: 10, padding: 12, borderRadius: 4,
            border: '1.5px solid var(--cp-border-default)', cursor: 'pointer',
            background: 'var(--cp-bg-elevated)',
            transition: 'border-color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cp-primary-60)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--cp-border-default)')}
        >
          <Search size={16} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ flex: 1, textAlign: 'start', fontSize: 13, color: 'var(--cp-text-muted)' }}>Search wiki articles, documents, Jira items...</span>
          <kbd style={{
            fontFamily: 'var(--cp-font-mono)', fontSize: 10, fontWeight: 600,
            padding: '2px 6px', borderRadius: 3, border: '1px solid var(--cp-border-default)',
            background: 'var(--cp-bg-sunken)', color: 'var(--cp-text-muted)',
          }}>⌘K</kbd>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setUploadOpen(true)} style={{
            fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 4, border: 'none', cursor: 'pointer',
            background: 'var(--cp-primary-60)', color: 'var(--cp-on-primary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><Upload size={14} /> Upload Document</button>
          <button onClick={() => navigate('/wiki/whats-new')} style={{
            fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
            border: '1px solid var(--cp-border-default)', background: 'transparent',
            color: 'var(--cp-text-secondary)', display: 'flex', alignItems: 'center', gap: 6,
          }}><Zap size={14} /> What's New</button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 32, padding: '16px 28px 32px',
        flexWrap: 'wrap',
      }}>
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <SkeletonBlock width={40} height={22} style={{ marginInline: 'auto', marginBottom: 4 }} />
              <SkeletonBlock width={60} height={10} style={{ marginInline: 'auto' }} />
            </div>
          ))
        ) : (
          stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--cp-text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--cp-text-muted)', letterSpacing: '0.04em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))
        )}
      </div>

      {/* Domain Grid */}
      <div style={{ padding: '0 28px' }}>
        <div style={sectionHeaderStyle}>Browse by Domain</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {domainsLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            (domains || []).map((d: any) => (
              <div
                key={d.domain_code}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/wiki/category/${DOMAIN_SLUGS[d.domain_code] || d.domain_code.toLowerCase()}`)}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/wiki/category/${DOMAIN_SLUGS[d.domain_code] || d.domain_code.toLowerCase()}`); }}
                style={{
                  padding: 20, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid var(--cp-border-default)',
                  boxShadow: 'var(--cp-shadow-xs)',
                  background: 'var(--cp-bg-elevated)',
                  transition: 'border-color 120ms ease, transform 120ms ease',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.outline = '2px solid var(--cp-primary-60)'; e.currentTarget.style.outlineOffset = '2px'; }}
                onBlur={e => { e.currentTarget.style.outline = 'none'; }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cp-primary-60)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cp-border-default)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{d.icon}</span>
                  <DomainBadge code={d.domain_code} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--cp-text-primary)', marginBottom: 4, ...truncateStyle(2) }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', lineHeight: 1.4, marginBottom: 8, ...truncateStyle(3) }}>
                  {d.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>
                  {d.article_count ?? 0} articles · {d.document_count ?? 0} docs
                  {d.last_updated && ` · Updated ${new Date(d.last_updated).toLocaleDateString()}`}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recently Updated */}
        <div style={{ ...sectionHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>Recently Updated</span>
          <span onClick={() => navigate('/wiki/whats-new')} style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-text-link)', cursor: 'pointer' }}>View all →</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recentLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonArticleRow key={i} />)
          ) : (recentPages || []).length > 0 ? (
            (recentPages || []).map((p: any) => (
              <div key={p.id}
                onClick={() => navigate(`/wiki/${p.slug}`)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/wiki/${p.slug}`); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 4, cursor: 'pointer', transition: 'background 80ms',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.outline = '2px solid var(--cp-primary-60)'; e.currentTarget.style.outlineOffset = '2px'; }}
                onBlur={e => { e.currentTarget.style.outline = 'none'; }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cp-interact-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FileText size={14} style={{ color: 'var(--cp-text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--cp-text-primary)', ...truncateStyle(2) }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--cp-text-muted)', marginTop: 1 }}>
                    {p.domain_code} · Updated {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </div>
                {p.ai_confidence > 0 && <ConfidenceBadge value={p.ai_confidence} />}
              </div>
            ))
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--cp-text-muted)', fontSize: 12 }}>
              No published articles yet. Upload documents to generate wiki content.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, padding: '24px 0', borderTop: '1px solid var(--cp-border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--cp-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Catalyst Wiki · {wikiStats?.articles ?? 0} articles across {wikiStats?.domains ?? 8} domains
            <AiBadge small />
          </div>
        </div>
      </div>

      <WikiCommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <WikiUploadWizard open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
