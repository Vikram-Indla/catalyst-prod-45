// ═══════════════════════════════════════════════════════════
// Resource 360° — Member Detail Page (Stage E: QA Polished)
// Route: /resource360/members/:memberId
// ALL data from Supabase. ZERO hardcoded arrays.
// ═══════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useR360MdMember,
  useR360MdChronology,
  useR360MdMemberKpis,
  useR360MdAllMembers,
  useR360MdSiblings,
} from '@/hooks/useResource360';
import '@/components/resource360/r360-member.css';
import { R360ProfileHeader } from '@/components/resource360/R360ProfileHeader';
import { R360WeekNav } from '@/components/resource360/R360WeekNav';
import { R360ChronologyView } from '@/components/resource360/R360ChronologyView';
import { R360RingView } from '@/components/resource360/R360RingView';
import { R360BoardView } from '@/components/resource360/R360BoardView';
import { R360DetailPanel } from '@/components/resource360/R360DetailPanel';

/** Skeleton loader for profile section */
const ProfileSkeleton = () => (
  <div className="r3-profile-card" style={{ minHeight: 120 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div className="r3-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      <div>
        <div className="r3-skeleton" style={{ width: 160, height: 18, marginBottom: 6 }} />
        <div className="r3-skeleton" style={{ width: 100, height: 13 }} />
      </div>
    </div>
  </div>
);

/** Skeleton loader for cards */
const CardsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{ background: '#FFF', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8, padding: '14px 16px', height: 64 }}>
        <div className="r3-skeleton" style={{ width: '60%', height: 12, marginBottom: 8 }} />
        <div className="r3-skeleton" style={{ width: '40%', height: 10 }} />
      </div>
    ))}
  </div>
);

/** Board skeleton */
const BoardSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
    {[1, 2, 3].map(col => (
      <div key={col}>
        <div className="r3-skeleton" style={{ width: '100%', height: 24, marginBottom: 12 }} />
        {[1, 2].map(card => (
          <div key={card} style={{ background: '#FFF', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div className="r3-skeleton" style={{ width: '50%', height: 10, marginBottom: 8 }} />
            <div className="r3-skeleton" style={{ width: '80%', height: 12 }} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

/** Ring skeleton */
const RingSkeleton = () => (
  <div style={{ position: 'relative', minHeight: 640, background: 'radial-gradient(circle, #FFF, #F1F5F9)', borderRadius: 12, border: '1px solid var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="r3-skeleton" style={{ width: 96, height: 96, borderRadius: '50%' }} />
  </div>
);

/** Compute week date range from offset */
function getWeekRange(offset: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const toISO = (d: Date) => d.toISOString().split('T')[0];
  return { date_from: toISO(start), date_to: toISO(end) };
}

const Resource360MemberDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();

  // UI state
  const [activeTab, setActiveTab] = useState('Ring');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute date filters from week offset
  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  // Build chronology filters object
  const chronoFilters = useMemo(() => ({
    pending_only: activeFilter === 'pending',
  }), [activeFilter]);

  // Data hooks — ALL from Supabase
  const { data: member, isLoading: memberLoading, error: memberError } = useR360MdMember(memberId || '');
  const { data: chronology, isLoading: chronoLoading, error: chronoError } = useR360MdChronology(memberId || '', chronoFilters);
  const { data: kpis } = useR360MdMemberKpis(memberId || '');
  const { data: allMembers } = useR360MdAllMembers();

  // Siblings — driven by selected item's parent_key (only for Story parents)
  const { data: siblingsData } = useR360MdSiblings(selectedItem?.parent_key || null);
  const siblings = (siblingsData as any)?.siblings || [];
  const parentType = (siblingsData as any)?.parentType || '';

  // Derived data — ALL from DB-sourced chronology
  const items = useMemo(() => (chronology as any[]) || [], [chronology]);

  const isDone = (cat: string | null | undefined) => {
    const c = (cat || '').toLowerCase();
    return c === 'completed' || c === 'done' || c === 'complete';
  };

  const doneCount = useMemo(() =>
    items.filter(i => isDone(i.status_category)).length,
  [items]);

  const pendingCount = useMemo(() =>
    items.filter(i => !isDone(i.status_category)).length,
  [items]);

  const memberName = (member as any)?.full_name || '';

  const handleItemClick = useCallback((item: any) => setSelectedItem(item), []);
  const handleClosePanel = useCallback(() => setSelectedItem(null), []);
  const handleSiblingClick = useCallback((sib: any) => setSelectedItem(sib), []);

  const isLoading = memberLoading || chronoLoading;
  const hasError = memberError || chronoError;

  const renderViewSkeleton = () => {
    if (activeTab === 'Ring') return <RingSkeleton />;
    if (activeTab === 'Board') return <BoardSkeleton />;
    return <CardsSkeleton />;
  };

  return (
    <div id="r360-root">
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 20px' }}>
        {/* Member nav pills — from DB */}
        {allMembers && (allMembers as any[]).length > 0 && (
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }} aria-label="Team members">
            {(allMembers as any[]).map((m: any) => (
              <Link
                key={m.id}
                to={`/resource360/members/${m.id}`}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 6, textDecoration: 'none',
                  background: m.id === memberId ? '#2563EB' : var(--bg-2, '#F1F5F9'),
                  color: m.id === memberId ? '#FFFFFF' : '#334155',
                  fontWeight: m.id === memberId ? 600 : 400,
                }}
                aria-current={m.id === memberId ? 'page' : undefined}
              >
                {m.full_name}
              </Link>
            ))}
          </nav>
        )}

        {/* Error state — inline, not full-page */}
        {hasError && (
          <div style={{ textAlign: 'center', padding: 40, background: 'var(--tint-red, #FEF2F2)', border: '1px solid #FECACA', borderRadius: 12, marginBottom: 12 }} role="alert">
            <div style={{ fontSize: 14, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>Failed to load data</div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 10 }}>{(memberError || chronoError)?.message}</div>
            <button
              onClick={() => window.location.reload()}
              style={{ fontSize: 12, padding: '6px 16px', borderRadius: 6, border: '1px solid #FECACA', background: '#FFF', color: '#991B1B', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !hasError ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProfileSkeleton />
            {renderViewSkeleton()}
          </div>
        ) : !hasError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Profile Header */}
            <R360ProfileHeader
              member={member}
              kpis={kpis}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Week Nav */}
            <R360WeekNav
              totalItems={items.length}
              pendingItems={pendingCount}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
            />

            {/* Views with fade transition */}
            <div key={activeTab} className="r3-view-fade">
              {activeTab === 'Ring' && (
                <R360RingView
                  member={member}
                  items={items}
                  doneCount={doneCount}
                  onItemClick={handleItemClick}
                />
              )}
              {activeTab === 'Chronology' && (
                <R360ChronologyView items={items} onItemClick={handleItemClick} memberName={memberName} />
              )}
              {activeTab === 'Board' && (
                <R360BoardView items={items} onItemClick={handleItemClick} memberName={memberName} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <R360DetailPanel
          item={selectedItem}
          siblings={siblings as any[]}
          onClose={handleClosePanel}
          onSiblingClick={handleSiblingClick}
        />
      )}
    </div>
  );
};

export default Resource360MemberDetail;
