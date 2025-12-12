import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ProductSettingsNav } from '@/components/admin/product-settings/ProductSettingsNav';
import { BusinessLinesPanel } from '@/components/admin/product-settings/BusinessLinesPanel';
import { FieldsLayoutPanel } from '@/components/admin/product-settings/FieldsLayoutPanel';
import { WorkflowStatusesPanel } from '@/components/admin/product-settings/WorkflowStatusesPanel';
import { IntakeViewsPanel } from '@/components/admin/product-settings/IntakeViewsPanel';
import { AccessControlPanel } from '@/components/admin/product-settings/AccessControlPanel';
import { DataManagementPanel } from '@/components/admin/product-settings/DataManagementPanel';
import { LookupManagementPanel } from '@/components/admin/lookup-management/LookupManagementPanel';

export type ProductSettingsTab = 
  | 'business-lines'
  | 'fields-layout'
  | 'lookup-management'
  | 'workflow-statuses'
  | 'intake-views'
  | 'access-control'
  | 'data-management';

export default function ProductSettings() {
  const [activeTab, setActiveTab] = useState<ProductSettingsTab>('business-lines');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Trigger save on FieldsLayoutPanel if it has the save handler
      if ((window as any).__fieldsLayoutSave) {
        await (window as any).__fieldsLayoutSave();
      }
      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPanel = () => {
    switch (activeTab) {
      case 'business-lines':
        return <BusinessLinesPanel onChanges={() => setHasChanges(true)} />;
      case 'fields-layout':
        return <FieldsLayoutPanel onChanges={() => setHasChanges(true)} />;
      case 'lookup-management':
        return <LookupManagementPanel />;
      case 'workflow-statuses':
        return <WorkflowStatusesPanel onChanges={() => setHasChanges(true)} />;
      case 'intake-views':
        return <IntakeViewsPanel onChanges={() => setHasChanges(true)} />;
      case 'access-control':
        return <AccessControlPanel />;
      case 'data-management':
        return <DataManagementPanel />;
      default:
        return <BusinessLinesPanel onChanges={() => setHasChanges(true)} />;
    }
  };

  return (
    <AdminGuard>
      <ModuleGuard moduleCode="PRODUCT">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Product Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure business lines, fields, workflows, and access for the Product module.
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="bg-brand-gold hover:bg-brand-gold-hover"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex gap-6 p-6">
              {/* Settings Navigation */}
              <ProductSettingsNav 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
              />
              
              {/* Panel Content */}
              <div className="flex-1 overflow-auto">
                <div className="bg-card border rounded-lg p-6">
                  {renderPanel()}
                </div>
              </div>
            </div>
          </div>

          {/* Unsaved Changes Bar */}
          {hasChanges && (
            <div className="fixed bottom-0 left-64 right-0 bg-card border-t px-6 py-3 flex items-center justify-between shadow-lg z-50">
              <span className="text-sm text-amber-600 font-medium">
                You have unsaved changes
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setHasChanges(false)}>
                  Discard
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-brand-gold hover:bg-brand-gold-hover"
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </AdminGuard>
  );
}
