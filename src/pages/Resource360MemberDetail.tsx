// ═══════════════════════════════════════════════════════════
// Resource 360° — Member Detail Page (Stage D: Fully Wired)
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
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
      <div>
        <div style={{ width: 160, height: 18, background: '#E2E8F0', borderRadius: 4, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: 100, height: 13, background: '#F1F5F9', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
      </div>
    </div>
  </div>
);

/** Skeleton loader for cards */
const CardsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', height: 64, animation: 'pulse 1.5s infinite' }}>
        <div style={{ width: '60%', height: 12, background: '#E2E8F0', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ width: '40%', height: 10, background: '#F1F5F9', borderRadius: 4 }} />
      </div>
    ))}
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

  // Siblings — driven by selected item's parent_key
  const { data: siblings = [] } = useR360MdSiblings(selectedItem?.parent_key || null);

  // Derived data — ALL from DB-sourced chronology
  const items = useMemo(() => (chronology as any[]) || [], [chronology]);

  const doneCount = useMemo(() =>
    items.filter(i => i.status_category === 'completed').length,
  [items]);

  const pendingCount = useMemo(() =>
    items.filter(i => i.status_category !== 'completed').length,
  [items]);

  const handleItemClick = useCallback((item: any) => setSelectedItem(item), []);
  const handleClosePanel = useCallback(() => setSelectedItem(null), []);
  const handleSiblingClick = useCallback((sib: any) => setSelectedItem(sib), []);

  const isLoading = memberLoading || chronoLoading;
  const hasError = memberError || chronoError;

  return (
    <div id="r360-root">
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 20px' }}>
        {/* Member nav pills — from DB */}
        {allMembers && (allMembers as any[]).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {(allMembers as any[]).map((m: any) => (
              <Link
                key={m.id}
                to={`/resource360/members/${m.id}`}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 6, textDecoration: 'none',
                  background: m.id === memberId ? '#2563EB' : '#F1F5F9',
                  color: m.id === memberId ? '#FFFFFF' : '#334155',
                  fontWeight: m.id === memberId ? 600 : 400,
                }}
              >
                {m.full_name}
              </Link>
            ))}
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div style={{ textAlign: 'center', padding: 40, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>Failed to load data</div>
            <div style={{ fontSize: 12, color: '#B91C1C' }}>{(memberError || chronoError)?.message}</div>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 10, fontSize: 12, padding: '6px 16px', borderRadius: 6, border: '1px solid #FECACA', background: '#FFF', color: '#991B1B', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !hasError ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProfileSkeleton />
            <CardsSkeleton />
          </div>
        ) : !hasError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Profile Header — data from useR360MdMember + useR360MdMemberKpis */}
            <R360ProfileHeader
              member={member}
              kpis={kpis}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Week Nav — counts from DB-sourced items */}
            <R360WeekNav
              totalItems={items.length}
              pendingItems={pendingCount}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
            />

            {/* Views — ALL items from r360md_chronology_view */}
            {activeTab === 'Ring' && (
              <R360RingView
                member={member}
                items={items}
                doneCount={doneCount}
                onItemClick={handleItemClick}
              />
            )}
            {activeTab === 'Chronology' && (
              <R360ChronologyView items={items} onItemClick={handleItemClick} />
            )}
            {activeTab === 'Board' && (
              <R360BoardView items={items} onItemClick={handleItemClick} />
            )}
          </div>
        )}
      </div>

      {/* Detail Panel — item data from chronology, siblings from useR360MdSiblings */}
      {selectedItem && (
        <R360DetailPanel
          item={selectedItem}
          siblings={siblings as any[]}
          onClose={handleClosePanel}
          onSiblingClick={handleSiblingClick}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Resource360MemberDetail;
