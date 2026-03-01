import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, ChevronRight } from 'lucide-react';
import { useWikiDomains, useWikiCategories, useWikiCategoryPages } from '@/hooks/useWikiData';
import { sectionHeaderStyle, DomainBadge, ConfidenceBadge, SkeletonArticleRow, SkeletonBlock, truncateStyle } from '@/components/wiki/WikiTokens';
import { WikiUploadWizard } from '@/components/wiki/WikiUploadWizard';

const SLUG_TO_CODE: Record<string, string> = {
  'industrial-licensing': 'D1', 'customs-trade': 'D2', 'chemical-permits': 'D3',
  'environmental-compliance': 'D4', 'industrial-incentives': 'D5',
  'fourth-industrial-revolution': 'D6', 'workforce-support': 'D7',
  'senaei-platform': 'D8', 'mining-minerals': 'D9',
};

export default function WikiCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: domains } = useWikiDomains();
  const domainCode = SLUG_TO_CODE[slug || ''] || slug?.toUpperCase() || 'D1';
  const { data: categories } = useWikiCategories(domainCode);
  const [activeFilter, setActiveFilter] = useState('all');
  const { data: pages, isLoading: pagesLoading } = useWikiCategoryPages(domainCode, activeFilter);
  const [uploadOpen, setUploadOpen] = useState(false);

  const domain = (domains || []).find((d: any) => d.domain_code === domainCode);
  const name = domain?.name || slug || 'Domain';

  const filterItems = [
    { id: 'all', name: 'All' },
    ...(categories || []).map((c: any) => ({ id: c.id, name: c.name })),
  ];

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ padding: '16px 28px 48px' }}>
        {/* Breadcrumb */}
        <nav role="navigation" aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <span onClick={() => navigate('/wiki')} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate('/wiki'); }} style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', fontWeight: 600 }}>{domainCode} {name}</span>
        </nav>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <DomainBadge code={domainCode} size="md" />
          <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--cp-text-primary)', flex: 1 }}>{name}</h1>
          <button onClick={() => setUploadOpen(true)} style={{
            fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
            border: '1px solid var(--cp-border-default)', background: 'transparent',
            color: 'var(--cp-text-secondary)', display: 'flex', alignItems: 'center', gap: 5,
          }}><Upload size={13} /> Add Document</button>
        </div>

        {domain?.description && (
          <p style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', marginBottom: 20, lineHeight: 1.6 }}>{domain.description}</p>
        )}

        {/* Filter chips */}
        <div role="tablist" aria-label="Category filters" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {filterItems.map(cat => (
            <button key={cat.id} role="tab" aria-selected={activeFilter === cat.id} onClick={() => setActiveFilter(cat.id)} style={{
              fontSize: 11, fontWeight: activeFilter === cat.id ? 650 : 500, padding: '5px 12px',
              borderRadius: 4, cursor: 'pointer',
              border: activeFilter === cat.id ? '1.5px solid var(--cp-primary-60)' : '1px solid var(--cp-border-default)',
              background: activeFilter === cat.id ? 'var(--cp-primary-5)' : 'transparent',
              color: activeFilter === cat.id ? 'var(--cp-primary-60)' : 'var(--cp-text-secondary)',
            }}>{cat.name}</button>
          ))}
        </div>

        {/* Articles section */}
        <div style={sectionHeaderStyle}>Articles</div>
        {pagesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonArticleRow key={i} />)}
          </div>
        ) : (pages || []).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(pages || []).map((p: any) => (
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
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </div>
                {p.ai_confidence > 0 && <ConfidenceBadge value={p.ai_confidence} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--cp-text-muted)', fontSize: 12, textAlign: 'center', padding: 40 }}>
            No articles yet in {name}. Content will appear after the next sync.
          </div>
        )}

        {/* Stats */}
        <div style={{
          marginTop: 32, padding: 16, borderRadius: 6, background: 'var(--cp-bg-sunken)',
          display: 'flex', justifyContent: 'center', gap: 32,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div dir="ltr" style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 700 }}>{domain?.article_count ?? 0}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--cp-text-muted)' }}>Articles</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div dir="ltr" style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 700 }}>{domain?.document_count ?? 0}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--cp-text-muted)' }}>Documents</div>
          </div>
        </div>
      </div>

      <WikiUploadWizard open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
