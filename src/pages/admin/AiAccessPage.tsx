import React from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { CatalystBreadcrumbs } from '@/components/ads';
import { T } from '@/components/admin/ai-assistant/tokens';
import { useAiCommandConsole } from '@/components/admin/ai-assistant/useAiCommandConsole';
import { AiCommandComposer } from '@/components/admin/ai-assistant/AiCommandComposer';
import { AiActivityFeed } from '@/components/admin/ai-assistant/AiActivityFeed';
import { AiRecentActivity, AiUserSearch } from '@/components/admin/ai-assistant/AiSidePanels';

export default function AiAccessPage() {
  const c = useAiCommandConsole();
  return (
    <AdminGuard>
      <style>{CSS}</style>
      <div style={{ padding: '20px 32px 48px', minHeight: '100%' }}>
        <CatalystBreadcrumbs items={[
          { label: 'Administration', href: '/admin' },
          { label: 'AI assistant' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: '28px', color: T.text, letterSpacing: '-.01em' }}>AI admin assistant</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: T.subtle, maxWidth: 680 }}>
              Describe an access change in plain words. The assistant prepares it, runs it step by step, and confirms exactly what changed.
            </p>
          </div>
        </div>

        <div className="cc-grid">
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AiCommandComposer c={c} />
            <AiActivityFeed c={c} />
          </div>
          <div className="cc-rail" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AiUserSearch />
            <AiRecentActivity />
          </div>
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
  .cc-grid > .cc-rail { position: sticky; top: 24px; width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .cc-grid [style*="cc-spin"], .cc-grid [style*="cc-bar"] { animation: none !important; }
}
`;
