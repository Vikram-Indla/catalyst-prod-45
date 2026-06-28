/**
 * IncidentInsightsPage — AI-branded, purple accent
 * DARK MODE dark mode support via useTheme
 */

import { Sparkles } from '@/lib/atlaskit-icons';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { useTheme } from '@/hooks/useTheme';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

export default function IncidentInsightsPage() {
  const { isDark } = useTheme();
  const { data: incidents } = useIncidentListView();
  const sev1Count = incidents?.filter(i => i.severity === 'SEV1').length || 0;
  const breachedCount = incidents?.filter(i => i.resolution_breached).length || 0;

  // DARK MODE tokens
  const pageBg = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))';
  const surfaceBg = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))';
  const textPrimary = 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1)))';
  const textBody = 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))';
  const borderColor = 'var(--cp-border-default, rgba(15,23,42,0.12))';

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: pageBg }}>
      <ProjectPageHeader projectKey="INCIDENTS" hubType="incident" />
      <div className="px-6 pt-2 pb-4">
        {/* Featured AI Card */}
        <div className="p-4 mb-6" style={{ border: `1px solid ${isDark ? 'var(--ds-background-discovery-bold, rgba(124,58,237,0.25))' : 'var(--ds-background-discovery)'}`, borderRadius: 6, backgroundColor: surfaceBg }}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full flex items-center justify-center" style={{
              width: 36, height: 50,
              background: 'linear-gradient(135deg, var(--cp-purple-60), var(--cp-teal-60))',
            }}>
              <Sparkles size={18} style={{ color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 650, color: textPrimary, marginBottom: 4 }}>
                Pattern Analysis
              </h3>
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', color: textBody, lineHeight: 1.6 }}>
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
            <h3 className="flex items-center gap-2 mb-3" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: textPrimary }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ds-text-danger, var(--cp-danger))', display: 'inline-block' }} />
              Risk Signals
            </h3>
            <div className="space-y-3">
              {[
                { title: 'Recurring authentication failures', desc: 'Multiple incidents linked to auth service in past 7 days' },
                { title: 'SLA breach pattern detected', desc: 'SEV-1 incidents averaging resolution above target threshold' },
              ].map((item, i) => (
                <div key={i} className="p-2.5" style={{
                  backgroundColor: 'var(--cp-danger-light)',
                  borderRadius: 4,
                  border: `1px solid ${'var(--cp-danger-light)'}`,
                }}>
                  <h4 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: 'var(--cp-danger-text)', marginBottom: 0 }}>{item.title}</h4>
                  <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-danger-text)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="p-4" style={{ border: `1px solid ${borderColor}`, borderRadius: 6 }}>
            <h3 className="flex items-center gap-2 mb-3" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: textPrimary }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ds-text-success, var(--cp-success))', display: 'inline-block' }} />
              Improvements
            </h3>
            <div className="space-y-3">
              {[
                { title: 'Automated rollback triggers', desc: 'Implement auto-rollback for auth service config changes to reduce MTTR' },
                { title: 'Pre-deployment health checks', desc: 'Add mandatory health check gates before production deployments' },
              ].map((item, i) => (
                <div key={i} className="p-2.5" style={{
                  backgroundColor: 'var(--cp-success-light)',
                  borderRadius: 4,
                  border: `1px solid ${'var(--cp-success-light)'}`,
                }}>
                  <h4 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: 'var(--cp-success-text)', marginBottom: 0 }}>{item.title}</h4>
                  <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-success)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
