import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
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

  const renderPanel = () => {
    switch (activeTab) {
      case 'business-lines':
        return <BusinessLinesPanel />;
      case 'fields-layout':
        return <FieldsLayoutPanel />;
      case 'lookup-management':
        return <LookupManagementPanel />;
      case 'workflow-statuses':
        return <WorkflowStatusesPanel />;
      case 'intake-views':
        return <IntakeViewsPanel />;
      case 'access-control':
        return <AccessControlPanel />;
      case 'data-management':
        return <DataManagementPanel />;
      default:
        return <BusinessLinesPanel />;
    }
  };

  return (
    <AdminGuard>
      <ModuleGuard moduleCode="PRODUCT">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b bg-card px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Product Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure business lines, fields, workflows, and access for the Product module.
              </p>
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
        </div>
      </ModuleGuard>
    </AdminGuard>
  );
}
