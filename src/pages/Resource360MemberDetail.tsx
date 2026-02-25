// ═══════════════════════════════════════════════════════════
// Resource 360° — Member Detail Page (Stage C: Full UI)
// Route: /resource360/members/:memberId
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

const Resource360MemberDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();

  // Data hooks
  const { data: member, isLoading: memberLoading } = useR360MdMember(memberId || '');
  const { data: chronology, isLoading: chronoLoading } = useR360MdChronology(memberId || '');
  const { data: kpis } = useR360MdMemberKpis(memberId || '');
  const { data: allMembers } = useR360MdAllMembers();

  // UI state
  const [activeTab, setActiveTab] = useState('Ring');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Siblings query
  const { data: siblings = [] } = useR360MdSiblings(selectedItem?.parent_key || null);

  const items = useMemo(() => {
    const all = (chronology as any[]) || [];
    if (activeFilter === 'pending') return all.filter(i => i.status_category !== 'completed');
    return all;
  }, [chronology, activeFilter]);

  const doneCount = useMemo(() => {
    return ((chronology as any[]) || []).filter(i => i.status_category === 'completed').length;
  }, [chronology]);

  const pendingCount = useMemo(() => {
    return ((chronology as any[]) || []).filter(i => i.status_category !== 'completed').length;
  }, [chronology]);

  const handleItemClick = useCallback((item: any) => setSelectedItem(item), []);
  const handleClosePanel = useCallback(() => setSelectedItem(null), []);
  const handleSiblingClick = useCallback((sib: any) => setSelectedItem(sib), []);

  const isLoading = memberLoading || chronoLoading;

  return (
    <div id="r360-root">
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 20px' }}>
        {/* Member nav pills */}
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

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748B', fontSize: 14 }}>Loading…</div>
        ) : (
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
            />

            {/* View */}
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
