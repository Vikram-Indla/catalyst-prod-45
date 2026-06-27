import React from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ads';
import { T } from '@/components/admin/ai-assistant/tokens';
import { Icon, ICONS } from '@/components/admin/ai-assistant/icons';
import { useAiCommandConsole } from '@/components/admin/ai-assistant/useAiCommandConsole';
import { AiCommandComposer } from '@/components/admin/ai-assistant/AiCommandComposer';
import { AiActivityFeed } from '@/components/admin/ai-assistant/AiActivityFeed';
import { AiCommandLibrary, AiRecentActivity } from '@/components/admin/ai-assistant/AiSidePanels';

/**
 * AiAccessPage — replaces the 3-col cockpit at /admin/ai-assistant.
 *
 * ZERO-DRIFT CONTRACT
 * - Renders ONLY the page content area. Global nav + AdminSidebar already mounted.
 * - Route unchanged (lazy in FullAppRoutes). AdminGuard wrapping unchanged.
 * - All colour from var(--ds-*) tokens. No hardcoded hex.
 *
 * Scoped CSS carries only keyframes + one responsive breakpoint.
 * Everything else is inline, matching admin pages convention.
 */
export default function AiAccessPage() {
  const c = useAiCommandConsole();
  return (
    <AdminGuard>
      <style>{CSS}</style>
      <div style={{ padding: '20px 32px 48px', minHeight: '100%', background: T.surfaceSunken }}>
        {/* breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.subtlest, marginBottom: 8 }}>
          <span style={{ color: T.link, cursor: 'pointer' }}>Administration</span>
          <Icon path="M9 18l6-6-6-6" size={12} w={2} />
          <span>AI assistant</span>
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: '28px', color: T.text, letterSpacing: '-.01em' }}>AI admin assistant</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: T.subtle, maxWidth: 680 }}>
              Describe an access change in plain words. The assistant prepares it, runs it step by step, and confirms exactly what changed. Not sure how to phrase something? Browse the library.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.subtlest }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ds-background-warning-bold, #D97706)' }} />Staging</span>
              <span style={{ opacity: .5 }}>·</span><span>Super Admin</span>
              <span style={{ opacity: .5 }}>·</span><span>Plan-first</span>
            </div>
            <Button appearance="default" iconBefore={<Icon path={ICONS.file} size={15} w={1.8} />}>Audit log</Button>
          </div>
        </div>

        {/* workspace */}
        <div className="cc-grid">
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AiCommandComposer c={c} />
            <AiActivityFeed c={c} />
          </div>
          <aside className="cc-rail" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AiCommandLibrary c={c} />
            <AiRecentActivity />
          </aside>
        </div>
      </div>
    </AdminGuard>
  );
}

const CSS = `
@keyframes cc-spin { to { transform: rotate(360deg); } }
@keyframes cc-bar { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }
.cc-grid { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
@media (min-width: 1180px) {
  .cc-grid { grid-template-columns: minmax(0,1fr) 340px; }
  .cc-grid > .cc-rail { position: sticky; top: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  .cc-grid [style*="cc-spin"], .cc-grid [style*="cc-bar"] { animation: none !important; }
}
`;
