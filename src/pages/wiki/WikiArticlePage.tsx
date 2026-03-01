import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWikiPage } from '@/hooks/useWikiData';
import { Star, ThumbsUp, ThumbsDown, Flag, ExternalLink, ChevronRight } from 'lucide-react';
import { sectionHeaderStyle, StatusLozenge, JiraPill, AiBadge, DomainBadge, ConfidenceBadge, LiveDataBadge } from '@/components/wiki/WikiTokens';

// Mock infobox data for demo (will come from DB later)
const MOCK_INFOBOX = {
  status: 'In Progress', hub: 'MoIM', project: 'Catalyst', epicKey: 'CAT-2847',
  totalStories: 24, doneStories: 18, donePercent: 75, openDefects: 3,
  currentSprint: 'Sprint 42', owner: 'Mohammed Al-Rashid', brdVersion: '2.1',
  documentsCount: 4, lastSync: '2h ago', aiConfidence: 0.91, domainCode: 'D6',
};

const MOCK_SECTIONS = [
  { id: '1', section_number: 1, title: 'Overview', content: 'The Gold License module provides streamlined industrial licensing services for the Ministry of Industry and Mineral Resources. It enables companies to apply for, renew, and manage their industrial licenses through a digital-first workflow integrated with the Catalyst platform.', section_type: 'overview', is_live_data: false },
  { id: '2', section_number: 2, title: 'Functionality', content: 'The module supports multiple license types including manufacturing, mining, and services. Key features include automated eligibility checks, document verification, payment processing, and compliance monitoring.', section_type: 'functionality', is_live_data: false },
  { id: '3', section_number: 3, title: 'Delivery Status', content: '', section_type: 'delivery_status', is_live_data: true },
  { id: '4', section_number: 4, title: 'Related Items', content: 'Connected to the Environmental Compliance module (D6.2) and Financial Solutions module (D6.3).', section_type: 'related', is_live_data: false },
  { id: '5', section_number: 5, title: 'References', content: '', section_type: 'references', is_live_data: false },
];

const MOCK_DELIVERY = [
  { key: 'CAT-2847', summary: 'Gold License Application Flow', status: 'Done', sprint: 'Sprint 41', assignee: 'Ahmed K.' },
  { key: 'CAT-2848', summary: 'License Renewal Process', status: 'In Progress', sprint: 'Sprint 42', assignee: 'Sara M.' },
  { key: 'CAT-2901', summary: 'Payment Gateway Integration', status: 'In Progress', sprint: 'Sprint 42', assignee: 'Khalid R.' },
  { key: 'CAT-2955', summary: 'Compliance Dashboard', status: 'To Do', sprint: 'Sprint 43', assignee: 'Fatima A.' },
];

const MOCK_REFS = [
  { ref_number: 1, source_type: 'jira', source_key: 'CAT-2847', description: 'Gold License Epic' },
  { ref_number: 2, source_type: 'brd', source_key: 'BRD-GL-2.1', description: 'Gold License Business Requirements v2.1' },
  { ref_number: 3, source_type: 'document', source_key: 'DOC-0042', description: 'Industrial Licensing API Specification' },
];

export default function WikiArticlePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = useWikiPage(pageSlug);
  const [pinned, setPinned] = useState(false);

  const info = (page?.infobox as any) || MOCK_INFOBOX;
  const sections = page?.sections?.length ? page.sections : MOCK_SECTIONS;
  const refs = page?.references?.length ? page.references : MOCK_REFS;
  const title = page?.title || pageSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Wiki Article';

  const breadcrumbs = [
    { label: 'Wiki', path: '/wiki' },
    { label: `${info.domainCode} Ministry Services`, path: `/wiki/category/ministry` },
    { label: title },
  ];

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ maxWidth: 1080, marginInline: 'auto', padding: '16px 24px 48px' }}>
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
            {/* Header */}
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: 'var(--cp-text-primary)' }}>{title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>Last updated: {info.lastSync}</span>
              <AiBadge small />
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-mono)' }}>v{page?.version || 3}</span>
              <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>{refs.length} references</span>
              <button onClick={() => setPinned(!pinned)} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--cp-border-default)', background: 'transparent',
                color: pinned ? '#D97706' : 'var(--cp-text-secondary)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Star size={12} fill={pinned ? '#D97706' : 'none'} /> {pinned ? 'Pinned' : 'Pin'}
              </button>
            </div>

            {/* Lead */}
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.85,
              color: 'var(--cp-text-secondary)', marginBottom: 24,
              paddingBottom: 20, borderBottom: '1px solid var(--cp-border-subtle)',
            }}>
              {page?.lead_content || 'The Gold License module provides streamlined industrial licensing services for the Ministry of Industry and Mineral Resources. It enables companies to apply for, renew, and manage their industrial licenses through a digital-first workflow integrated with the Catalyst platform.'}
            </div>

            {/* TOC */}
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

            {/* Sections */}
            {sections.map((s: any, i: number) => (
              <div key={s.id} id={`section-${i + 1}`}>
                <div style={{ ...sectionHeaderStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{i + 1}. {s.title}</span>
                  {s.is_live_data && <LiveDataBadge />}
                </div>

                {s.section_type === 'delivery_status' ? (
                  <div style={{ border: '1px solid var(--cp-border-default)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '100px 1fr 90px 80px 80px',
                      fontSize: 10, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '8px 12px', background: 'var(--cp-bg-sunken)',
                      color: 'var(--cp-text-secondary)', borderBottom: '1px solid var(--cp-border-default)',
                    }}>
                      <span>Key</span><span>Summary</span><span>Status</span><span>Sprint</span><span>Assignee</span>
                    </div>
                    {MOCK_DELIVERY.map(row => (
                      <div key={row.key} style={{
                        display: 'grid', gridTemplateColumns: '100px 1fr 90px 80px 80px',
                        padding: '0 12px', height: 36, alignItems: 'center',
                        borderBottom: '0.75px solid var(--cp-border-subtle)',
                        fontSize: 12,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cp-interact-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span><JiraPill label={row.key} /></span>
                        <span style={{ color: 'var(--cp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.summary}</span>
                        <span><StatusLozenge status={row.status} /></span>
                        <span style={{ fontSize: 11, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-mono)' }}>{row.sprint}</span>
                        <span style={{ fontSize: 11, color: 'var(--cp-text-tertiary)' }}>{row.assignee}</span>
                      </div>
                    ))}
                  </div>
                ) : s.section_type === 'references' ? (
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
                  </div>
                ) : (
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--cp-text-secondary)', margin: 0 }}>{s.content}</p>
                )}
              </div>
            ))}

            {/* Feedback */}
            <div style={{
              marginTop: 40, padding: 16, borderRadius: 6,
              border: '1px solid var(--cp-border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AiBadge /> <ConfidenceBadge value={info.aiConfidence || 0.91} />
                <span style={{ fontSize: 11, color: 'var(--cp-text-muted)' }}>Source coverage: {Math.round((page?.source_coverage || 0.85) * 100)}%</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ icon: ThumbsUp, label: 'Helpful' }, { icon: ThumbsDown, label: 'Not helpful' }, { icon: Flag, label: 'Report issue' }].map(b => (
                  <button key={b.label} style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                    border: '1px solid var(--cp-border-default)', background: 'transparent',
                    color: 'var(--cp-text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}><b.icon size={12} /> {b.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Infobox */}
          <aside style={{ position: 'sticky', top: 16, borderRadius: 6, border: '1px solid var(--cp-border-default)', overflow: 'hidden', fontSize: 12 }}>
            <div style={{ background: 'var(--cp-primary-60)', color: '#fff', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Article Info
            </div>
            {[
              { label: 'Domain', value: <DomainBadge code={info.domainCode} /> },
              { label: 'Status', value: <StatusLozenge status={info.status} /> },
              { label: 'Hub', value: info.hub },
              { label: 'Project', value: info.project },
              { label: 'Epic', value: <JiraPill label={info.epicKey} /> },
              { label: 'Stories', value: <span style={{ fontFamily: 'var(--cp-font-mono)' }}>{info.totalStories}</span> },
              { label: 'Done', value: <span style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-success-60)' }}>{info.doneStories} ({info.donePercent}%)</span> },
              { label: 'Open Defects', value: <span style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-warning-60)' }}>{info.openDefects}</span> },
              { label: 'Sprint', value: info.currentSprint },
              { label: 'Owner', value: <span style={{ fontWeight: 600, color: 'var(--cp-primary-60)' }}>{info.owner}</span> },
              { label: 'BRD', value: info.brdVersion },
              { label: 'Documents', value: <span style={{ color: 'var(--cp-purple-60)', fontWeight: 600 }}>{info.documentsCount}</span> },
              { label: 'Last Sync', value: info.lastSync },
              { label: 'AI Confidence', value: <ConfidenceBadge value={info.aiConfidence} /> },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 12px', borderBottom: '0.75px solid var(--cp-border-subtle)',
              }}>
                <span style={{ color: 'var(--cp-text-muted)', fontSize: 11 }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            {/* Quick Links */}
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--cp-text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>Quick Links</div>
              {['Open in Jira', 'View BRD', 'Test Cases', 'Version History'].map(link => (
                <div key={link} style={{
                  fontSize: 11, color: 'var(--cp-text-link)', cursor: 'pointer', padding: '3px 0',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <ExternalLink size={10} /> {link}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
