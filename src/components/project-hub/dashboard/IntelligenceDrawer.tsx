/**
 * IntelligenceDrawer — AI project intelligence panel
 */
import { useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { useDashboardStore } from './useDashboardStore';

export default function IntelligenceDrawer() {
  const { activeDrawer, closeDrawer } = useDashboardStore();
  const open = activeDrawer === 'intelligence';

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, closeDrawer]);

  if (!open) return null;

  return (
    <>
      <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.15)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: '#FFFFFF', zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
              Project Intelligence
            </span>
          </div>
          <button onClick={closeDrawer} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#94A3B8" />
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '3px 8px', borderRadius: 6 }}>
            ✦ AI · Powered by project data
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Recommendations */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Recommendations</div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Action Items</div>
                1. Review overdue items and reassign if needed<br />
                2. Monitor bottleneck statuses (&gt;5 days in QA/UAT)<br />
                3. Prioritize P1 incident resolution<br />
                4. Balance team workload across members
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Release Health</div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
              Analysis based on current release data. Check the dashboard widgets for detailed metrics on milestones, incidents, and defects.
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={closeDrawer} style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748B' }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
