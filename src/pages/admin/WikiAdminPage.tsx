/**
 * WikiAdminPage — Admin panel for managing the Wiki content pipeline.
 * Tab state is driven by ?tab= query param. Defaults to 'sync'.
 * Role-guarded: admin + program_manager only.
 */
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import type { WikiAdminTab } from '@/types/wikiAdmin';
import {
  RefreshCw,
  FileText,
  Database,
  HeartPulse,
  Search,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

const TABS: { key: WikiAdminTab; label: string; icon: React.ElementType }[] = [
  { key: 'sync', label: 'Sync Pipeline', icon: RefreshCw },
  { key: 'pages', label: 'Pages', icon: FileText },
  { key: 'sources', label: 'Sources & Docs', icon: Database },
  { key: 'health', label: 'Health', icon: HeartPulse },
  { key: 'queries', label: 'Query Log', icon: Search },
  { key: 'training', label: 'Training', icon: GraduationCap },
  { key: 'access', label: 'Access Control', icon: ShieldCheck },
];

function WikiAdminContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as WikiAdminTab) || 'sync';

  const setTab = (tab: WikiAdminTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--cp-bg-page, #fff)' }}>
      {/* Header */}
      <div
        className="shrink-0 border-b"
        style={{
          padding: '20px 28px 0',
          borderColor: 'var(--cp-border-default, rgba(15,23,42,0.12))',
        }}
      >
        <h1
          style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--cp-text-primary, #0F172A)',
            marginBottom: 16,
          }}
        >
          Wiki Administration
        </h1>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Wiki admin tabs"
          style={{
            display: 'flex',
            gap: 0,
            overflowX: 'auto',
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px 10px',
                  fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: isActive ? 600 : 450,
                  color: isActive
                    ? 'var(--cp-primary-60, #2563EB)'
                    : 'var(--cp-text-tertiary, #64748B)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive
                    ? '2px solid var(--cp-primary-60, #2563EB)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 120ms ease, border-color 120ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--cp-text-primary, #0F172A)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--cp-text-tertiary, #64748B)';
                }}
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
        <TabPlaceholder tab={activeTab} />
      </div>
    </div>
  );
}

/** Placeholder panel — will be replaced in Stage B */
function TabPlaceholder({ tab }: { tab: WikiAdminTab }) {
  const titles: Record<WikiAdminTab, string> = {
    sync: 'Sync Pipeline Monitor',
    pages: 'Page Management',
    sources: 'Source & Document Management',
    health: 'Data Health & Completeness',
    queries: 'Query Log Analytics',
    training: 'Training Question Manager',
    access: 'Access Control',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        borderRadius: 8,
        border: '1px dashed var(--cp-border-default, rgba(15,23,42,0.12))',
        color: 'var(--cp-text-tertiary, #64748B)',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
      }}
    >
      {titles[tab]} — Coming in Stage B
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
