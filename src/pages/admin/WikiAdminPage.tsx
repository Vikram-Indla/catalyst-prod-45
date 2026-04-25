/**
 * WikiAdminPage — Admin panel for managing the Wiki content pipeline.
 * Tab state is driven by ?tab= query param. Defaults to 'sync'.
 * Role-guarded: admin + program_manager only.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Upload, RefreshCw, FileText, Database, HeartPulse, Search, GraduationCap, ShieldCheck } from 'lucide-react';
import type { WikiAdminTab } from '@/types/wikiAdmin';
import { WikiAdminMetrics } from '@/components/wiki/admin/WikiAdminMetrics';
import { WikiAdminSyncTab } from '@/components/wiki/admin/WikiAdminSyncTab';
import { WikiAdminPagesTab } from '@/components/wiki/admin/WikiAdminPagesTab';
import { WikiAdminSourcesTab } from '@/components/wiki/admin/WikiAdminSourcesTab';
import { WikiAdminHealthTab } from '@/components/wiki/admin/WikiAdminHealthTab';
import { WikiAdminQueryLogTab } from '@/components/wiki/admin/WikiAdminQueryLogTab';
import { WikiAdminTrainingTab } from '@/components/wiki/admin/WikiAdminTrainingTab';
import { WikiAdminAccessTab } from '@/components/wiki/admin/WikiAdminAccessTab';
import { WikiUploadWizard } from '@/components/wiki/WikiUploadWizard';

const TABS: { key: WikiAdminTab; label: string; icon: React.ElementType }[] = [
  { key: 'sync', label: 'Sync Pipeline', icon: RefreshCw },
  { key: 'pages', label: 'Pages', icon: FileText },
  { key: 'sources', label: 'Sources & Docs', icon: Database },
  { key: 'health', label: 'Health', icon: HeartPulse },
  { key: 'queries', label: 'Query Log', icon: Search },
  { key: 'training', label: 'Training', icon: GraduationCap },
  { key: 'access', label: 'Access Control', icon: ShieldCheck },
];

const TAB_COMPONENTS: Record<WikiAdminTab, React.ComponentType> = {
  sync: WikiAdminSyncTab,
  pages: WikiAdminPagesTab,
  sources: WikiAdminSourcesTab,
  health: WikiAdminHealthTab,
  queries: WikiAdminQueryLogTab,
  training: WikiAdminTrainingTab,
  access: WikiAdminAccessTab,
};

function WikiAdminContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as WikiAdminTab) || 'sync';
  const [uploadOpen, setUploadOpen] = useState(false);

  const setTab = (tab: WikiAdminTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const TabContent = TAB_COMPONENTS[activeTab] || WikiAdminSyncTab;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--cp-bg-page, #fff)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ padding: '20px 28px 0' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{
            fontFamily: 'var(--cp-font-heading)', fontSize: 22, fontWeight: 700,
            color: 'var(--cp-text-primary, #0F172A)', margin: 0,
          }}>
            Wiki Admin Dashboard
          </h1>
          <button
            onClick={() => setUploadOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 4,
              background: 'var(--cp-primary-60, #2563EB)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 600,
            }}
          >
            <Upload style={{ width: 14, height: 14 }} />
            Upload Document
          </button>
        </div>

        {/* Metric cards */}
        <div style={{ marginBottom: 16 }}>
          <WikiAdminMetrics />
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Wiki admin tabs"
          style={{
            display: 'flex', gap: 0, overflowX: 'auto',
            borderBottom: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${key}`}
                onClick={() => setTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px 10px',
                  fontSize: 13, fontFamily: 'var(--cp-font-body)',
                  fontWeight: isActive ? 600 : 450,
                  color: isActive ? 'var(--cp-primary-60, #2563EB)' : 'var(--cp-text-tertiary, #64748B)',
                  background: 'transparent', border: 'none',
                  borderBottom: isActive ? '2px solid var(--cp-primary-60, #2563EB)' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color 120ms ease, border-color 120ms ease',
                  marginBottom: -1,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--cp-text-primary, #0F172A)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--cp-text-tertiary, #64748B)'; }}
              >
                <Icon style={{ width: 15, height: 15, strokeWidth: 1.6 }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panel */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={activeTab}
        className="flex-1 overflow-auto"
        style={{ padding: '24px 28px' }}
      >
        <TabContent />
      </div>

      {/* Upload wizard modal */}
      <WikiUploadWizard open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

export default function WikiAdminPage() {
  const { isProgramManager, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isProgramManager) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access Wiki Administration. Required: Admin or Program Manager role.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <WikiAdminContent />;
}
