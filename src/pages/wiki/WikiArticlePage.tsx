import React, { useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWikiPage, useIsBookmarked, useToggleWikiBookmark, useLogWikiRead, useSubmitFeedback } from '@/hooks/useWikiData';
import { Star, ThumbsUp, ThumbsDown, Flag, ChevronRight } from 'lucide-react';
import { sectionHeaderStyle, StatusLozenge, JiraPill, AiBadge, DomainBadge, ConfidenceBadge, LiveDataBadge, EmDash, SkeletonBlock, SkeletonRow, truncateStyle } from '@/components/wiki/WikiTokens';
import { supabase } from '@/integrations/supabase/client';

// Memoized section component for performance
const ArticleSection = memo(({ section, index, refs }: { section: any; index: number; refs: any[] }) => (
  <div id={`section-${index + 1}`}>
    <div style={{ ...sectionHeaderStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{index + 1}. {section.title}</span>
      {section.is_live_data && <LiveDataBadge />}
    </div>

    {section.section_type === 'references' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {refs.map((r: any) => (
          <div key={r.ref_number} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span dir="ltr" style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, color: 'var(--cp-text-muted)', minWidth: 20 }}>[{r.ref_number}]</span>
            {r.source_type === 'jira' ? <JiraPill label={r.source_key} /> :
              r.source_type === 'document' ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: 'var(--cp-purple-5)', color: 'var(--cp-purple-60)' }}>{r.source_key}</span> :
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-text-secondary)' }}>{r.source_key}</span>}
            <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)' }}>{r.description || '—'}</span>
          </div>
        ))}
        {refs.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--cp-text-muted)', padding: 8 }}>No references available.</div>
        )}
      </div>
    ) : (
      <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--cp-text-secondary)', margin: 0 }}>{section.content}</p>
    )}
  </div>
));
ArticleSection.displayName = 'ArticleSection';

// Skeleton loader for article page
const ArticleSkeleton = () => (
  <div style={{ fontFamily: 'var(--cp-font-body)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
    <div style={{ padding: '16px 28px 48px' }}>
      <SkeletonBlock width={200} height={12} style={{ marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24 }}>
        <div>
          <SkeletonBlock width="60%" height={24} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <SkeletonBlock width={100} height={14} />
            <SkeletonBlock width={80} height={14} />
            <SkeletonBlock width={60} height={14} />
          </div>
          <SkeletonRow lines={4} />
          <div style={{ marginTop: 24 }}><SkeletonRow lines={6} /></div>
        </div>
        <div style={{ borderRadius: 6, border: '1px solid var(--cp-border-default)', overflow: 'hidden' }}>
          <SkeletonBlock height={32} radius={0} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '8px 12px', borderBottom: '0.75px solid var(--cp-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <SkeletonBlock width={60} height={12} />
              <SkeletonBlock width={80} height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default function WikiArticlePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading, error } = useWikiPage(pageSlug);
  const { data: isBookmarked } = useIsBookmarked(page?.id);
  const toggleBookmark = useToggleWikiBookmark();
  const logRead = useLogWikiRead();
  const submitFeedback = useSubmitFeedback();

  useEffect(() => {
    if (page?.id) {
      logRead.mutate({ pageId: page.id });
    }
  }, [page?.id]);

  const handleTogglePin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !page?.id) return;
    toggleBookmark.mutate({ pageId: page.id, userId: user.id });
  };

  const handleFeedback = (rating: 'positive' | 'negative') => {
    if (!page?.id) return;
    submitFeedback.mutate({ entityId: page.id, entityType: 'wiki_page', rating });
  };

  if (isLoading) return <ArticleSkeleton />;

  if (error || !page) {
    return (
      <div style={{ fontFamily: 'var(--cp-font-body)', padding: 48, textAlign: 'center', color: 'var(--cp-text-muted)' }}>
        Article not found. <span onClick={() => navigate('/wiki')} style={{ color: 'var(--cp-text-link)', cursor: 'pointer' }}>Return to Wiki</span>
      </div>
    );
  }

  const info = (page.infobox as any) || {};
  const sections = page.sections || [];
  const refs = page.references || [];
  const title = page.title || pageSlug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Wiki Article';

  const breadcrumbs = [
    { label: 'Wiki', path: '/wiki' },
    { label: `${page.domain_code || ''}`, path: `/wiki/category/${page.domain_code?.toLowerCase()}` },
    { label: title },
  ];

  // Helper for infobox null values
  const infoVal = (val: any) => (val != null && val !== '' ? val : <EmDash />);

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ padding: '16px 28px 48px' }}>
        {/* Breadcrumb */}
        <nav role="navigation" aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />}
              {b.path ? (
                <span onClick={() => navigate(b.path!)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate(b.path!); }} style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer' }}>{b.label}</span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', fontWeight: 600 }}>{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* 2-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>
          {/* Main content */}
          <article style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: 'var(--cp-text-primary)' }}>{title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>Last updated: {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : '—'}</span>
              <AiBadge small />
              <span dir="ltr" style={{ fontSize: 11, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-mono)' }}>v{page.version || 1}</span>
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>{refs.length} references</span>
              <button onClick={handleTogglePin} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--cp-border-default)', background: 'transparent',
                color: isBookmarked ? 'var(--cp-warning-60)' : 'var(--cp-text-secondary)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Star size={12} fill={isBookmarked ? 'currentColor' : 'none'} /> {isBookmarked ? 'Pinned' : 'Pin'}
              </button>
            </div>

            {/* Lead */}
            {page.lead_content && (
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.85,
                color: 'var(--cp-text-secondary)', marginBottom: 24,
                paddingBottom: 20, borderBottom: '1px solid var(--cp-border-subtle)',
              }}>
                {page.lead_content}
              </div>
            )}

            {/* TOC */}
            {sections.length > 0 && (
              <nav aria-label="Table of contents" style={{
                background: 'var(--cp-bg-sunken)', border: '1px solid var(--cp-border-default)',
                borderRadius: 6, padding: 16, marginBottom: 24,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--cp-text-secondary)', marginBottom: 8, letterSpacing: '0.04em' }}>Contents</div>
                {sections.map((s: any, i: number) => (
                  <div key={s.id} style={{
                    fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer',
                    padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span dir="ltr" style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, color: 'var(--cp-text-muted)', minWidth: 16 }}>{i + 1}.</span>
                    {s.title}
                    {s.is_live_data && <LiveDataBadge />}
                  </div>
                ))}
              </nav>
            )}

            {/* Sections */}
            {sections.map((s: any, i: number) => (
              <ArticleSection key={s.id} section={s} index={i} refs={refs} />
            ))}

            {sections.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--cp-text-muted)', fontSize: 12 }}>
                This article has no content sections yet.
              </div>
            )}

            {/* Feedback */}
            <div style={{
              marginTop: 40, padding: 16, borderRadius: 6,
              border: '1px solid var(--cp-border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AiBadge /> <ConfidenceBadge value={page.ai_confidence || 0} />
                <span dir="ltr" style={{ fontSize: 11, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-mono)' }}>
                  {Math.round((page.source_coverage || 0) * 100)}% coverage
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleFeedback('positive')} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                  border: '1px solid var(--cp-border-default)', background: 'transparent',
                  color: 'var(--cp-text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}><ThumbsUp size={12} /> Helpful</button>
                <button onClick={() => handleFeedback('negative')} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                  border: '1px solid var(--cp-border-default)', background: 'transparent',
                  color: 'var(--cp-text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}><ThumbsDown size={12} /> Not helpful</button>
                <button style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                  border: '1px solid var(--cp-border-default)', background: 'transparent',
                  color: 'var(--cp-text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}><Flag size={12} /> Report issue</button>
              </div>
            </div>
          </article>

          {/* Infobox */}
          <aside aria-label="Article metadata" style={{ position: 'sticky', top: 16, borderRadius: 6, border: '1px solid var(--cp-border-default)', overflow: 'hidden', fontSize: 12 }}>
            <div style={{ background: 'var(--cp-primary-60)', color: 'var(--cp-on-primary)', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Article Info
            </div>
            {[
              { label: 'Domain', value: <DomainBadge code={info.domainCode || page.domain_code || ''} /> },
              { label: 'Status', value: <StatusLozenge status={info.status || page.status || ''} /> },
              { label: 'Hub', value: infoVal(info.hub), show: !!info.hub },
              { label: 'Project', value: infoVal(info.project), show: !!info.project },
              { label: 'Epic', value: info.epicKey ? <JiraPill label={info.epicKey} /> : <EmDash />, show: !!info.epicKey },
              { label: 'Stories', value: <span dir="ltr" style={{ fontFamily: 'var(--cp-font-mono)' }}>{infoVal(info.totalStories)}</span>, show: !!info.totalStories },
              { label: 'Done', value: info.doneStories != null ? <span dir="ltr" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-success-60)' }}>{info.doneStories} ({info.donePercent ?? 0}%)</span> : <EmDash />, show: info.doneStories != null },
              { label: 'Open Defects', value: info.openDefects != null ? <span dir="ltr" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-warning-60)' }}>{info.openDefects}</span> : <EmDash />, show: info.openDefects != null },
              { label: 'Sprint', value: infoVal(info.currentSprint), show: !!info.currentSprint },
              { label: 'Owner', value: info.owner ? <span style={{ fontWeight: 600, color: 'var(--cp-primary-60)' }}>{info.owner}</span> : <EmDash />, show: !!info.owner },
              { label: 'BRD', value: infoVal(info.brdVersion), show: !!info.brdVersion },
              { label: 'Documents', value: info.documentsCount ? <span dir="ltr" style={{ color: 'var(--cp-purple-60)', fontWeight: 600, fontFamily: 'var(--cp-font-mono)' }}>{info.documentsCount}</span> : <EmDash />, show: !!info.documentsCount },
              { label: 'Last Sync', value: infoVal(info.lastSync), show: !!info.lastSync },
              { label: 'AI Confidence', value: <ConfidenceBadge value={page.ai_confidence || info.aiConfidence || 0} /> },
            ]
              .filter(row => row.show !== false)
              .map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 12px', borderBottom: '0.75px solid var(--cp-border-subtle)',
                }}>
                  <span style={{ color: 'var(--cp-text-muted)', fontSize: 11 }}>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
