import { ShieldOff } from 'lucide-react';
import { JiraSyncControlPanel } from '@/components/admin/jira/JiraSyncControlPanel';

export default function JiraSyncControlPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page header */}
      <div
        className="border-b px-6 py-5"
        style={{ borderColor: 'var(--cp-border-default)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#DFE1E618' }}
          >
            <ShieldOff style={{ width: 18, height: 18, color: '#253858' }} />
          </div>
          <div>
            <h1
              className="text-base font-semibold leading-tight"
              style={{ color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-heading)' }}
            >
              Jira Sync Control
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--cp-text-muted)' }}>
              Toggle Jira integration on / off without data loss · 2026 cut-off mode
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-2xl">
        <JiraSyncControlPanel />
      </div>
    </div>
  );
}
