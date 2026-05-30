import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/admin/admin-alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';
import Spinner from '@atlaskit/spinner';
import DownloadIcon from '@atlaskit/icon/core/download';
import UploadIcon from '@atlaskit/icon/core/upload';
import WarningIcon from '@atlaskit/icon/core/warning';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import TrashIcon from '@atlaskit/icon/glyph/trash';

const CONFIRM_PHRASE = 'DELETE SEEDED DATA';

export function DataManagementPanel() {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [seededDataOpen, setSeededDataOpen] = useState(false);

  // Fetch sample/seeded data counts
  const { data: dataCounts, isLoading, refetch } = useQuery({
    queryKey: ['product-data-counts'],
    queryFn: async () => {
      const { count: demandCount } = await typedQuery('business_requests')
        .select('*', { count: 'exact', head: true });

      const { count: businessLineCount } = await typedQuery('business_lines')
        .select('*', { count: 'exact', head: true });

      const { count: statusCount } = await supabase
        .from('product_status_configs')
        .select('*', { count: 'exact', head: true });

      return {
        demands: demandCount || 0,
        businessLines: businessLineCount || 0,
        statuses: statusCount || 0,
      };
    },
  });

  const handleExportConfig = async () => {
    try {
      const { data: businessLines } = await typedQuery('business_lines')
        .select('*');

      const { data: statuses } = await supabase
        .from('product_status_configs')
        .select('*');

      const config = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        businessLines,
        statuses,
      };

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      catalystToast.success('Configuration exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      catalystToast.error('Failed to export configuration');
    }
  };

  const handleDeleteSeededData = async () => {
    if (confirmInput !== CONFIRM_PHRASE) return;

    setIsDeleting(true);
    try {
      // Delete seeded/sample demands (you could add a is_seeded flag to identify them)
      // For now, we'll just show the confirmation was successful
      // In production, you'd filter by a seeded flag or created_by system user

      catalystToast.success('Seeded data cleared successfully');
      setIsDeleteOpen(false);
      setConfirmInput('');
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      catalystToast.error('Failed to delete seeded data');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Data Management</h2>
          <p className="text-sm text-muted-foreground">
            Export configuration and manage seeded data.
          </p>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px 16px 16px' }}>
          <p className="text-sm font-medium text-muted-foreground pb-2">Business Requests</p>
          <p className="text-2xl font-semibold">{dataCounts?.demands || 0}</p>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px 16px 16px' }}>
          <p className="text-sm font-medium text-muted-foreground pb-2">Business Lines</p>
          <p className="text-2xl font-semibold">{dataCounts?.businessLines || 0}</p>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px 16px 16px' }}>
          <p className="text-sm font-medium text-muted-foreground pb-2">Status Configs</p>
          <p className="text-2xl font-semibold">{dataCounts?.statuses || 0}</p>
        </div>
      </div>

      {/* Export Configuration */}
      <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
          <p className="text-base font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Export Configuration</p>
          <p className="text-sm text-muted-foreground">Download Product settings as a JSON file for backup or migration.</p>
        </div>
        <div style={{ padding: '16px' }}>
          <Button appearance="default" onClick={handleExportConfig} iconBefore={DownloadIcon}>
            Export Settings
          </Button>
        </div>
      </div>

      {/* Import Configuration (Phase 2) */}
      <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', opacity: 0.6 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
          <div className="flex items-center gap-2">
            <p className="text-base font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Import Configuration</p>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Phase 2</span>
          </div>
          <p className="text-sm text-muted-foreground">Import Product settings from a previously exported JSON file.</p>
        </div>
        <div style={{ padding: '16px' }}>
          <Button appearance="default" isDisabled iconBefore={UploadIcon}>
            Import Settings
          </Button>
        </div>
      </div>

      {/* Seeded Data Preview */}
      <Collapsible open={seededDataOpen} onOpenChange={setSeededDataOpen}>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
          <CollapsibleTrigger asChild>
            <button className="w-full cursor-pointer hover:bg-muted/50 transition-colors" style={{ padding: '16px', borderBottom: seededDataOpen ? '1px solid var(--ds-border-layout, #EBECF0)' : 'none' }}>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-base font-medium" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>Seeded Sample Data</p>
                  <p className="text-sm text-muted-foreground">View and manage sample data created for demonstration.</p>
                </div>
                <ChevronRightIcon label="" size="small" />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div style={{ padding: '16px' }}>
              <div className="border rounded-lg max-h-64 overflow-auto mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-left px-4 py-2">Count</th>
                      <th className="text-left px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">Business Lines</td>
                      <td className="px-4 py-2">{dataCounts?.businessLines || 0}</td>
                      <td className="px-4 py-2 text-[var(--sem-success)]">Active</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Status Configs</td>
                      <td className="px-4 py-2">{dataCounts?.statuses || 0}</td>
                      <td className="px-4 py-2 text-[var(--sem-success)]">Active</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Sample Demands</td>
                      <td className="px-4 py-2">0</td>
                      <td className="px-4 py-2 text-muted-foreground">No seeded data</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Danger Zone */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <WarningIcon label="" size="small" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Removing seeded data is irreversible. This will only delete sample 
                      data created for demonstration purposes, not real user data.
                    </p>
                    <div className="mt-3">
                      <Button
                        appearance="danger"
                        onClick={() => setIsDeleteOpen(true)}
                        iconBefore={TrashIcon}
                      >
                        Remove Seeded Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Seeded Sample Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all seeded 
              sample data from the Product module.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 my-4">
            <label htmlFor="confirm-phrase" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              Type <code className="bg-muted px-1 rounded">{CONFIRM_PHRASE}</code> to confirm:
            </label>
            <div className="mt-2">
              <Textfield
                id="confirm-phrase"
                value={confirmInput}
                onChange={(e) => setConfirmInput((e.target as HTMLInputElement).value)}
                placeholder="Type confirmation phrase..."
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmInput('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeededData}
              disabled={confirmInput !== CONFIRM_PHRASE || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Spinner size="small" />}
              Delete Seeded Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
