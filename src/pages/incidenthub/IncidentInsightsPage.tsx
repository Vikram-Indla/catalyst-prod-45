/**
 * IncidentInsightsPage — AI-branded, purple accent
 * DARK MODE dark mode support via useTheme
 */

import { Sparkles } from 'lucide-react';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { useTheme } from '@/hooks/useTheme';

export default function IncidentInsightsPage() {
  const { isDark } = useTheme();
  const { data: incidents } = useIncidentListView();
  const sev1Count = incidents?.filter(i => i.severity === 'SEV1').length || 0;
  const breachedCount = incidents?.filter(i => i.resolution_breached).length || 0;

  // DARK MODE tokens
  const pageBg = isDark ? 'var(--cp-bg-page, #1F1F21)' : '#FFFFFF';
  const surfaceBg = isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF';
  const textPrimary = 'var(--cp-text-primary, #0F172A)';
  const textSecondary = 'var(--cp-text-tertiary, #64748B)';
  const textBody = 'var(--cp-text-secondary, #334155)';
  const borderColor = isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)';

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: pageBg }}>
      <div className="px-6 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: isDark ? 'rgba(124,58,237,0.16)' : '#F3E8FF' }}>
            <Sparkles size={18} style={{ color: '#7C3AED' }} />
          </div>
          <div className="flex items-center gap-2">
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 700, color: textPrimary }}>Insights</h1>
            <span className="px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 700, backgroundColor: isDark ? 'rgba(124,58,237,0.16)' : '#F3E8FF', color: '#7C3AED', borderRadius: 3 }}>AI</span>
          </div>
          <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: textSecondary, marginLeft: 'auto' }}>Pattern analysis and recommendations</p>
        </div>

        {/* Featured AI Card */}
        <div className="p-4 mb-6" style={{ border: `1px solid ${isDark ? 'rgba(124,58,237,0.25)' : '#E9D5FF'}`, borderRadius: 6, backgroundColor: surfaceBg }}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full flex items-center justify-center" style={{
              width: 36, height: 50,
              background: 'linear-gradient(135deg, #7C3AED, #0D9488)',
            }}>
              <Sparkles size={18} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 14, fontWeight: 650, color: textPrimary, marginBottom: 4 }}>
                Pattern Analysis
              </h3>
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: textBody, lineHeight: 1.6 }}>
                {sev1Count > 0
                  ? `${sev1Count} SEV-1 incident(s) detected in the current window. Analysis suggests correlation with recent deployment activities. ${breachedCount > 0 ? `${breachedCount} SLA breach(es) require immediate attention.` : 'SLA targets are currently being met.'}`
                  : 'No critical incidents detected. System health appears stable across all monitored services.'}
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Risk Signals */}
          <div className="p-4" style={{ border: `1px solid ${borderColor}`, borderRadius: 6 }}>
            <h3 className="flex items-center gap-2 mb-3" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 700, color: textPrimary }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
              Risk Signals
            </h3>
            <div className="space-y-3">
              {[
                { title: 'Recurring authentication failures', desc: 'Multiple incidents linked to auth service in past 7 days' },
                { title: 'SLA breach pattern detected', desc: 'SEV-1 incidents averaging resolution above target threshold' },
              ].map((item, i) => (
                <div key={i} className="p-2.5" style={{
                  backgroundColor: isDark ? 'rgba(248,113,113,0.08)' : '#FEF2F2',
                  borderRadius: 4,
                  border: `1px solid ${isDark ? 'rgba(248,113,113,0.2)' : '#FECACA'}`,
                }}>
                  <h4 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 650, color: 'var(--cp-danger-text, #991B1B)', marginBottom: 2 }}>{item.title}</h4>
                  <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: isDark ? '#F87171' : '#B91C1C' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="p-4" style={{ border: `1px solid ${borderColor}`, borderRadius: 6 }}>
            <h3 className="flex items-center gap-2 mb-3" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 700, color: textPrimary }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
              Improvements
            </h3>
            <div className="space-y-3">
              {[
                { title: 'Automated rollback triggers', desc: 'Implement auto-rollback for auth service config changes to reduce MTTR' },
                { title: 'Pre-deployment health checks', desc: 'Add mandatory health check gates before production deployments' },
              ].map((item, i) => (
                <div key={i} className="p-2.5" style={{
                  backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : '#F0FDF4',
                  borderRadius: 4,
                  border: `1px solid ${isDark ? 'rgba(34,197,94,0.2)' : '#BBF7D0'}`,
                }}>
                  <h4 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 650, color: isDark ? '#86EFAC' : '#166534', marginBottom: 2 }}>{item.title}</h4>
                  <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: isDark ? '#4ADE80' : '#15803D' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
