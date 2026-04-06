import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { DomainBadge, sectionHeaderStyle, SkeletonBlock, truncateStyle } from '@/components/wiki/WikiTokens';
import { useWikiWhatsNew } from '@/hooks/useWikiData';

type BadgeType = 'NEW' | 'UPDATED' | 'DOC' | 'ARCHIVED';

const BADGE_STYLES: Record<BadgeType, { bg: string; color: string }> = {
  NEW: { bg: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-lozenge-green-text)' },
  UPDATED: { bg: 'var(--cp-lozenge-blue-bg)', color: 'var(--cp-lozenge-blue-text)' },
  DOC: { bg: 'var(--cp-purple-5)', color: 'var(--cp-purple-60)' },
  ARCHIVED: { bg: 'var(--cp-lozenge-grey-bg)', color: 'var(--cp-lozenge-grey-text)' },
};

const SkeletonChangeItem = () => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 4, border: '1px solid var(--cp-border-subtle)', background: 'var(--cp-bg-elevated)' }}>
    <SkeletonBlock width={60} height={16} />
    <div style={{ flex: 1 }}>
      <SkeletonBlock width="70%" height={14} style={{ marginBottom: 4 }} />
      <SkeletonBlock width="50%" height={10} />
    </div>
    <SkeletonBlock width={30} height={16} />
  </div>
);

export default function WikiWhatsNewPage() {
  const navigate = useNavigate();
  const { data: groups, isLoading } = useWikiWhatsNew(7);

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ maxWidth: 840, marginInline: 'auto', padding: '16px 28px 48px' }}>
        {/* Breadcrumb */}
        <nav role="navigation" aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <span onClick={() => navigate('/wiki')} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate('/wiki'); }} style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', fontWeight: 600 }}>What's New</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, margin: '0 0 24px', color: 'var(--cp-text-primary)' }}>What's New</h1>

        {isLoading && (
          <div>
            <SkeletonBlock width={80} height={12} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonChangeItem key={i} />)}
            </div>
          </div>
        )}

        {!isLoading && (!groups || groups.length === 0) && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--cp-text-muted)', fontSize: 12 }}>
            No changes in the last 7 days.
          </div>
        )}

        {(groups || []).map((group: any) => (
          <div key={group.date}>
            <div style={sectionHeaderStyle}>{group.date}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map((item: any, i: number) => {
                const bs = BADGE_STYLES[item.badge as BadgeType] || BADGE_STYLES.UPDATED;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    borderRadius: 4, border: '1px solid var(--cp-border-subtle)',
                    background: 'var(--cp-bg-elevated)',
                  }}>
                    <span aria-label={`Change type: ${item.badge}`} style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', marginTop: 2,
                      background: bs.bg, color: bs.color,
                    }}>{item.badge}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-text-primary)', marginBottom: 2, ...truncateStyle(2) }}>{item.title}</div>
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
