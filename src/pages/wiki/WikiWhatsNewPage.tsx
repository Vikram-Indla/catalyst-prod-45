import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { DomainBadge, sectionHeaderStyle } from '@/components/wiki/WikiTokens';

type BadgeType = 'NEW' | 'UPDATED' | 'DOC' | 'ARCHIVED';

const BADGE_STYLES: Record<BadgeType, { bg: string; color: string }> = {
  NEW: { bg: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-lozenge-green-text)' },
  UPDATED: { bg: 'var(--cp-lozenge-blue-bg)', color: 'var(--cp-lozenge-blue-text)' },
  DOC: { bg: 'var(--cp-purple-5)', color: 'var(--cp-purple-60)' },
  ARCHIVED: { bg: 'var(--cp-lozenge-grey-bg)', color: 'var(--cp-lozenge-grey-text)' },
};

const MOCK_CHANGES = [
  { date: 'Today', items: [
    { badge: 'NEW' as BadgeType, title: 'Gold License Application Flow', desc: 'New article generated from BRD-GL-2.1 and 24 Jira stories', domain: 'D6' },
    { badge: 'DOC' as BadgeType, title: 'API Specification v3.2 uploaded', desc: 'Parsed 42 pages, generated 128 chunks, 128 vectors', domain: 'D1' },
    { badge: 'UPDATED' as BadgeType, title: 'Sprint Planning Module', desc: 'Updated delivery status section with Sprint 42 data', domain: 'D4' },
  ]},
  { date: 'Yesterday', items: [
    { badge: 'NEW' as BadgeType, title: 'Chemical Permits Workflow', desc: 'AI-generated article with 91% confidence from 18 Jira stories', domain: 'D6' },
    { badge: 'UPDATED' as BadgeType, title: 'OKR Dashboard Module', desc: 'Refreshed delivery metrics and added 2 new references', domain: 'D2' },
    { badge: 'DOC' as BadgeType, title: 'User Guide - Senaei Portal v4.0', desc: 'Parsed 86 pages, generated 245 chunks', domain: 'D7' },
  ]},
  { date: '2 days ago', items: [
    { badge: 'ARCHIVED' as BadgeType, title: 'Legacy Reporting Module', desc: 'Archived due to replacement by Analytics Dashboard v2', domain: 'D8' },
    { badge: 'UPDATED' as BadgeType, title: 'Test Management Overview', desc: 'Added cross-references to Quality Dashboard and Defect Tracker', domain: 'D5' },
  ]},
];

export default function WikiWhatsNewPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ maxWidth: 720, marginInline: 'auto', padding: '16px 24px 48px' }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <span onClick={() => navigate('/wiki')} style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', fontWeight: 600 }}>What's New</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, margin: '0 0 24px', color: 'var(--cp-text-primary)' }}>What's New</h1>

        {MOCK_CHANGES.map(group => (
          <div key={group.date}>
            <div style={sectionHeaderStyle}>{group.date}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map((item, i) => {
                const bs = BADGE_STYLES[item.badge];
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    borderRadius: 4, border: '1px solid var(--cp-border-subtle)',
                    background: 'var(--cp-bg-elevated)',
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap', marginTop: 2,
                      background: bs.bg, color: bs.color,
                    }}>{item.badge}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-text-primary)', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                    <DomainBadge code={item.domain} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
