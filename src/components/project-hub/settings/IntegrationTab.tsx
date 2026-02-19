import { Link } from 'lucide-react';

export function IntegrationTab() {
  return (
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Jira Integration
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <Link size={16} color="#64748B" />
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>Jira Cloud</span>
        <span
          className="rounded-full"
          style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: '#F1F5F9', color: '#94A3B8' }}
        >
          Not Connected
        </span>
      </div>

      <div className="relative inline-block" title="Coming in Phase 5">
        <button
          disabled
          className="opacity-50"
          style={{
            height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500,
            color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6,
            background: 'transparent', cursor: 'not-allowed',
          }}
        >
          Configure Connection
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
        Sync work items from Jira Cloud as read-only records in ProjectHub.
      </p>
    </div>
  );
}
