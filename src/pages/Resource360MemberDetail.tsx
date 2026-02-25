// ═══════════════════════════════════════════════════════════
// Resource 360° — Member Detail Page (Stage B: Data Verification)
// Route: /resource360/members/:memberId
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useR360MdMember,
  useR360MdChronology,
  useR360MdMemberKpis,
  useR360MdAllMembers,
} from '@/hooks/useResource360';

const Resource360MemberDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();

  const { data: member, isLoading: memberLoading } = useR360MdMember(memberId || '');
  const { data: chronology, isLoading: chronoLoading } = useR360MdChronology(memberId || '');
  const { data: kpis, isLoading: kpisLoading } = useR360MdMemberKpis(memberId || '');
  const { data: allMembers } = useR360MdAllMembers();

  const isLoading = memberLoading || chronoLoading || kpisLoading;

  return (
    <div
      className="flex flex-col gap-6 p-6"
      style={{ fontFamily: "'Sora', 'Inter', sans-serif" }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 32px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>360</span>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Resource 360° — Member Detail
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Stage B Data Verification · Member ID:{' '}
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#2563EB' }}>
                {memberId}
              </code>
            </p>
          </div>
        </div>

        {/* Quick nav to test members */}
        {allMembers && allMembers.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#94A3B8', alignSelf: 'center' }}>Test members:</span>
            {(allMembers as any[]).map((m: any) => (
              <Link
                key={m.id}
                to={`/resource360/members/${m.id}`}
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: m.id === memberId ? '#2563EB' : '#F1F5F9',
                  color: m.id === memberId ? '#FFFFFF' : '#334155',
                  textDecoration: 'none',
                  fontWeight: m.id === memberId ? 600 : 400,
                }}
              >
                {m.full_name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748B', fontSize: 14 }}>
          Loading data from database…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Member Info */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              👤 Member Info
            </h3>
            {member ? (
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.8 }}>
                <div><strong>Name:</strong> {(member as any).full_name}</div>
                <div><strong>Role:</strong> {(member as any).role}</div>
                <div><strong>Department:</strong> {(member as any).department}</div>
                <div><strong>Team:</strong> {(member as any).team || '—'}</div>
                <div><strong>Email:</strong> {(member as any).email}</div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#EF4444' }}>No member found for this ID</p>
            )}
          </div>

          {/* KPIs */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              📊 KPIs (from r360md_member_kpis_view)
            </h3>
            {kpis ? (
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.8 }}>
                <div><strong>Total Items:</strong> {(kpis as any).total_items}</div>
                <div><strong>Open Items:</strong> {(kpis as any).open_items}</div>
                <div><strong>Stale Items:</strong> {(kpis as any).stale_items}</div>
                <div><strong>Closure %:</strong> {(kpis as any).closure_pct}%</div>
                <div><strong>Avg Age (days):</strong> {(kpis as any).avg_age_days}</div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94A3B8' }}>No KPI data</p>
            )}
          </div>

          {/* Chronology Items */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }} className="md:col-span-2">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              📋 Chronology Items (from r360md_chronology_view) — {chronology?.length || 0} items
            </h3>
            {chronology && chronology.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>Key</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>Title</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>Status</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>Type</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>Age</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>Date Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(chronology as any[]).map((item: any) => (
                      <tr key={item.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '6px 10px', fontFamily: "'JetBrains Mono', monospace", color: '#2563EB' }}>{item.item_key}</td>
                        <td style={{ padding: '6px 10px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 6,
                            background: item.status_bg_color, color: item.status_color,
                            fontSize: 11, fontWeight: 600,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.status_dot_color }} />
                            {item.status_name}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px' }}>{item.item_type}</td>
                        <td style={{ padding: '6px 10px', color: item.age_class === 'green' ? '#16A34A' : item.age_class === 'amber' ? '#D97706' : '#EF4444' }}>
                          {item.age_days}d
                        </td>
                        <td style={{ padding: '6px 10px', color: '#64748B' }}>{item.date_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94A3B8' }}>No chronology data for this member</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Resource360MemberDetail;
