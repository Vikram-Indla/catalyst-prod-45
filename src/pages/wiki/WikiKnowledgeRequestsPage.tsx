import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiKnowledgeRequests } from '@/hooks/useWikiHub';
import { ChevronRight, Plus, HelpCircle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEE2E2', color: '#DC2626' },
  high: { bg: '#FEF3C7', color: '#D97706' },
  medium: { bg: '#DBEAFE', color: '#2563EB' },
  low: { bg: '#F1F5F9', color: '#64748B' },
};

const PRIORITY_STYLES_DARK: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(220,38,38,0.15)', color: '#FCA5A5' },
  high: { bg: 'rgba(217,119,6,0.15)', color: '#FCD34D' },
  medium: { bg: 'rgba(37,99,235,0.15)', color: '#93C5FD' },
  low: { bg: 'rgba(255,255,255,0.06)', color: '#878787' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#DBEAFE', color: '#1E40AF', label: 'OPEN' },
  in_progress: { bg: '#FEF3C7', color: '#92400E', label: 'IN PROGRESS' },
  resolved: { bg: '#DCFCE7', color: '#16A34A', label: 'RESOLVED' },
  closed: { bg: '#F1F5F9', color: '#64748B', label: 'CLOSED' },
};

const STATUS_STYLES_DARK: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: 'rgba(37,99,235,0.15)', color: '#93C5FD', label: 'OPEN' },
  in_progress: { bg: 'rgba(217,119,6,0.15)', color: '#FCD34D', label: 'IN PROGRESS' },
  resolved: { bg: 'rgba(22,163,74,0.15)', color: '#86EFAC', label: 'RESOLVED' },
  closed: { bg: 'rgba(255,255,255,0.06)', color: '#878787', label: 'CLOSED' },
};

export default function WikiKnowledgeRequestsPage() {
  const navigate = useNavigate();
  const { data: requests, isLoading } = useWikiKnowledgeRequests('all');
  const { isDark } = useTheme();

  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>Knowledge Requests</span>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, margin: 0 }}>Knowledge Requests</h1>
          <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', margin: '4px 0 0' }}>Track content gaps and route to domain experts.</p>
        </div>
        <button style={{
          fontSize: 12, fontWeight: 650, padding: '8px 16px', borderRadius: 6, border: 'none',
          background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}><Plus size={14} /> New Request</button>
      </div>

      <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? '#1A1A1A' : '#FFFFFF', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 120px',
          background: isDark ? '#1A1A1A' : '#F1F5F9', padding: '0 16px', height: 50, alignItems: 'center',
          fontFamily: 'Sora, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: isDark ? '#878787' : '#64748B', letterSpacing: '0.05em',
          borderBottom: `0.75px solid ${border}`,
        }}>
          <span>Title</span><span>Domain</span><span>Priority</span><span>Status</span><span>Created</span>
        </div>
        {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : '#64748B', fontSize: 12 }}>Loading...</div> :
          (requests ?? []).length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : '#64748B', fontSize: 12 }}>No knowledge requests yet.</div> :
          (requests ?? []).map((r: any) => {
            const pr = isDark ? (PRIORITY_STYLES_DARK[r.priority] || PRIORITY_STYLES_DARK.medium) : (PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.medium);
            const st = isDark ? (STATUS_STYLES_DARK[r.status] || STATUS_STYLES_DARK.open) : (STATUS_STYLES[r.status] || STATUS_STYLES.open);
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 120px',
                padding: '0 16px', height: 42, alignItems: 'center', borderBottom: `0.75px solid ${border}`, fontSize: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  {r.description && <div style={{ fontSize: 10, color: isDark ? '#878787' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                </div>
                <span style={{ fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B' }}>{r.domain_code || '—'}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: pr.bg, color: pr.color, textTransform: 'uppercase', width: 'fit-content' }}>{r.priority}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: st.bg, color: st.color, width: 'fit-content' }}>{st.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B' }}>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
