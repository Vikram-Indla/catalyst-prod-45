import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';

/**
 * Programs Management Page - Manage programs in the organization
 */
export default function Programs() {
  return (
    <AdminGuard>
      <div className="h-full flex flex-col" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Programs</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
              Manage programs and their configurations.
            </p>
          </div>
          <Button appearance="primary">
            Add Program
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ marginBottom: '4px' }}>
              <h2 className="text-base font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Program Management</h2>
              <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                Create and manage programs across your organization.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                Program management functionality coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
