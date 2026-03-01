import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWikiPage, useIsBookmarked, useToggleWikiBookmark, useLogWikiRead, useSubmitFeedback } from '@/hooks/useWikiData';
import { Star, ThumbsUp, ThumbsDown, Flag, ExternalLink, ChevronRight } from 'lucide-react';
import { sectionHeaderStyle, StatusLozenge, JiraPill, AiBadge, DomainBadge, ConfidenceBadge, LiveDataBadge } from '@/components/wiki/WikiTokens';
import { supabase } from '@/integrations/supabase/client';

export default function WikiArticlePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading, error } = useWikiPage(pageSlug);
  const { data: isBookmarked } = useIsBookmarked(page?.id);
  const toggleBookmark = useToggleWikiBookmark();
  const logRead = useLogWikiRead();
  const submitFeedback = useSubmitFeedback();

  // Log read on page load
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

  if (isLoading) {
    return (
      <div style={{ fontFamily: 'var(--cp-font-body)', padding: 48, textAlign: 'center', color: 'var(--cp-text-muted)' }}>
        Loading article...
      </div>
    );
  }

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

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ padding: '16px 28px 48px' }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />}
              {b.path ? (
                <span onClick={() => navigate(b.path!)} style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer' }}>{b.label}</span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', fontWeight: 600 }}>{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* 2-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>
          {/* Main content */}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: 'var(--cp-text-primary)' }}>{title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>Last updated: {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : '—'}</span>
              <AiBadge small />
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-mono)' }}>v{page.version || 1}</span>
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>{refs.length} references</span>
              <button onClick={handleTogglePin} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--cp-border-default)', background: 'transparent',
                color: isBookmarked ? '#D97706' : 'var(--cp-text-secondary)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Star size={12} fill={isBookmarked ? '#D97706' : 'none'} /> {isBookmarked ? 'Pinned' : 'Pin'}
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
              <div style={{
                background: 'var(--cp-bg-sunken)', border: '1px solid var(--cp-border-default)',
                borderRadius: 6, padding: 16, marginBottom: 24,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--cp-text-secondary)', marginBottom: 8, letterSpacing: '0.04em' }}>Contents</div>
                {sections.map((s: any, i: number) => (
                  <div key={s.id} style={{
                    fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer',
                    padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, color: 'var(--cp-text-muted)', minWidth: 16 }}>{i + 1}.</span>
                    {s.title}
                    {s.is_live_data && <LiveDataBadge />}
                  </div>
                ))}
              </div>
            )}

            {/* Sections */}
            {sections.map((s: any, i: number) => (
              <div key={s.id} id={`section-${i + 1}`}>
                <div style={{ ...sectionHeaderStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{i + 1}. {s.title}</span>
                  {s.is_live_data && <LiveDataBadge />}
                </div>

                {s.section_type === 'references' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {refs.map((r: any) => (
                      <div key={r.ref_number} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, color: 'var(--cp-text-muted)', minWidth: 20 }}>[{r.ref_number}]</span>
                        {r.source_type === 'jira' ? <JiraPill label={r.source_key} /> :
                          r.source_type === 'document' ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: 'var(--cp-purple-5)', color: 'var(--cp-purple-60)' }}>{r.source_key}</span> :
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-text-secondary)' }}>{r.source_key}</span>}
                        <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)' }}>{r.description}</span>
                      </div>
                    ))}
                    {refs.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--cp-text-muted)', padding: 8 }}>No references available.</div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--cp-text-secondary)', margin: 0 }}>{s.content}</p>
                )}
              </div>
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
                <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>Source coverage: {Math.round((page.source_coverage || 0) * 100)}%</span>
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
          </div>

          {/* Infobox */}
          <aside style={{ position: 'sticky', top: 16, borderRadius: 6, border: '1px solid var(--cp-border-default)', overflow: 'hidden', fontSize: 12 }}>
            <div style={{ background: 'var(--cp-primary-60)', color: '#fff', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Article Info
            </div>
            {[
              { label: 'Domain', value: <DomainBadge code={info.domainCode || page.domain_code || ''} /> },
              { label: 'Status', value: <StatusLozenge status={info.status || page.status || ''} /> },
              ...(info.hub ? [{ label: 'Hub', value: info.hub }] : []),
              ...(info.project ? [{ label: 'Project', value: info.project }] : []),
              ...(info.epicKey ? [{ label: 'Epic', value: <JiraPill label={info.epicKey} /> }] : []),
              ...(info.totalStories ? [{ label: 'Stories', value: <span style={{ fontFamily: 'var(--cp-font-mono)' }}>{info.totalStories}</span> }] : []),
              ...(info.doneStories != null ? [{ label: 'Done', value: <span style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-success-60)' }}>{info.doneStories} ({info.donePercent}%)</span> }] : []),
              ...(info.openDefects != null ? [{ label: 'Open Defects', value: <span style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-warning-60)' }}>{info.openDefects}</span> }] : []),
              ...(info.currentSprint ? [{ label: 'Sprint', value: info.currentSprint }] : []),
              ...(info.owner ? [{ label: 'Owner', value: <span style={{ fontWeight: 600, color: 'var(--cp-primary-60)' }}>{info.owner}</span> }] : []),
              ...(info.brdVersion ? [{ label: 'BRD', value: info.brdVersion }] : []),
              ...(info.documentsCount ? [{ label: 'Documents', value: <span style={{ color: 'var(--cp-purple-60)', fontWeight: 600 }}>{info.documentsCount}</span> }] : []),
              ...(info.lastSync ? [{ label: 'Last Sync', value: info.lastSync }] : []),
              { label: 'AI Confidence', value: <ConfidenceBadge value={page.ai_confidence || info.aiConfidence || 0} /> },
            ].map(row => (
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
