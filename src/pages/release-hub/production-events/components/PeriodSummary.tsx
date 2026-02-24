import type { PcPeriodSummary } from '../types/production-events.types';

interface PeriodSummaryProps {
  summary: PcPeriodSummary | null;
  loading: boolean;
}

export function PeriodSummary({ summary, loading }: PeriodSummaryProps) {
  if (loading) {
    return (
      <div
        style={{
          background: '#FFFFFF', borderRadius: 10, padding: '20px 24px',
          borderLeft: '4px solid #2563EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ height: 14, width: 120, background: '#F1F5F9', borderRadius: 4, marginBottom: 10 }} />
        <div style={{ height: 12, width: '90%', background: '#F1F5F9', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 12, width: '70%', background: '#F1F5F9', borderRadius: 4 }} />
      </div>
    );
  }

  if (!summary) return null;

  // Split into lead sentence + rest
  const sentences = summary.summary_text.split('. ');
  const lead = sentences[0] + '.';
  const body = sentences.slice(1).join('. ');

  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: 10, padding: '20px 24px',
        borderLeft: '4px solid #2563EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif" }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#0F172A' }}>{lead}</span>
        {body && (
          <span style={{ fontSize: 14, fontWeight: 400, color: '#1E293B' }}> {body}</span>
        )}
      </p>
    </div>
  );
}
