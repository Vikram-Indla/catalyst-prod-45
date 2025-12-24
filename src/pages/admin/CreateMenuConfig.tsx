import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateMenuVisibility, useProductRoles } from '@/hooks/useCreateMenuVisibility';
import { workItemConfig, WorkItemType } from '@/config/workItemConfig';
import { Save, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WORK_ITEM_TYPES: WorkItemType[] = [
  'theme',
  'objective',
  'business-request',
  'epic',
  'feature',
  'story',
  'defect',
  'incident',
  'dependency',
  'risk',
];

// Default visibility settings based on the screenshot
const DEFAULT_VISIBILITY: Record<string, Record<string, boolean>> = {
  developer: {
    theme: false, objective: false, 'business-request': false, epic: false,
    feature: false, story: true, defect: false, incident: false, dependency: false, risk: false,
  },
  enterprise_architect: {
    theme: true, objective: true, 'business-request': true, epic: true,
    feature: true, story: false, defect: false, incident: false, dependency: true, risk: true,
  },
  product_manager: {
    theme: true, objective: true, 'business-request': false, epic: true,
    feature: true, story: false, defect: false, incident: true, dependency: true, risk: true,
  },
  product_owner: {
    theme: false, objective: false, 'business-request': true, epic: true,
    feature: true, story: false, defect: false, incident: false, dependency: false, risk: false,
  },
  project_manager: {
    theme: false, objective: false, 'business-request': true, epic: true,
    feature: true, story: true, defect: true, incident: true, dependency: true, risk: true,
  },
  qa_tester: {
    theme: false, objective: false, 'business-request': false, epic: false,
    feature: false, story: true, defect: false, incident: false, dependency: false, risk: false,
  },
  super_admin: {
    theme: true, objective: true, 'business-request': true, epic: true,
    feature: true, story: true, defect: true, incident: true, dependency: true, risk: true,
  },
};

export default function CreateMenuConfig() {
  const { allSettings, isLoadingAll, batchUpdateVisibility } = useCreateMenuVisibility();
  const { data: productRoles, isLoading: isLoadingRoles } = useProductRoles();
  
  // Track pending changes (role_code -> work_item_type -> is_visible)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, boolean>>>({});
  
  // Build a map for quick lookup: role_code -> work_item_type -> is_visible
  const visibilityMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    allSettings?.forEach(setting => {
      if (!map[setting.role_code]) {
        map[setting.role_code] = {};
      }
      map[setting.role_code][setting.work_item_type] = setting.is_visible;
    });
    return map;
  }, [allSettings]);

  const getVisibility = (roleCode: string, workItemType: string): boolean => {
    // Check pending changes first
    if (pendingChanges[roleCode]?.[workItemType] !== undefined) {
      return pendingChanges[roleCode][workItemType];
    }
    // Fall back to saved settings
    return visibilityMap[roleCode]?.[workItemType] ?? false;
  };

  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  const handleToggle = (roleCode: string, workItemType: string) => {
    const currentValue = getVisibility(roleCode, workItemType);
    const originalValue = visibilityMap[roleCode]?.[workItemType] ?? false;
    const newValue = !currentValue;

    setPendingChanges(prev => {
      const updated = { ...prev };
      
      if (newValue === originalValue) {
        // Remove from pending if back to original
        if (updated[roleCode]) {
          delete updated[roleCode][workItemType];
          if (Object.keys(updated[roleCode]).length === 0) {
            delete updated[roleCode];
          }
        }
      } else {
        // Add to pending
        if (!updated[roleCode]) {
          updated[roleCode] = {};
        }
        updated[roleCode][workItemType] = newValue;
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    const updates: { roleCode: string; workItemType: string; isVisible: boolean }[] = [];
    
    Object.entries(pendingChanges).forEach(([roleCode, workItems]) => {
      Object.entries(workItems).forEach(([workItemType, isVisible]) => {
        updates.push({ roleCode, workItemType, isVisible });
      });
    });

    if (updates.length === 0) return;

    try {
      await batchUpdateVisibility.mutateAsync(updates);
      setPendingChanges({});
      toast.success('Create menu visibility settings saved successfully');
    } catch (error) {
      console.error('Failed to save visibility settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleRestoreDefaults = () => {
    // Stage all default values as pending changes (don't save immediately)
    const newPendingChanges: Record<string, Record<string, boolean>> = {};
    
    Object.entries(DEFAULT_VISIBILITY).forEach(([roleCode, workItems]) => {
      Object.entries(workItems).forEach(([workItemType, defaultValue]) => {
        const currentSavedValue = visibilityMap[roleCode]?.[workItemType] ?? false;
        
        // Only add to pending if different from saved value
        if (defaultValue !== currentSavedValue) {
          if (!newPendingChanges[roleCode]) {
            newPendingChanges[roleCode] = {};
          }
          newPendingChanges[roleCode][workItemType] = defaultValue;
        }
      });
    });
    
    setPendingChanges(newPendingChanges);
    
    if (Object.keys(newPendingChanges).length > 0) {
      toast.info('Default settings staged. Click "Save Settings" to apply.');
    } else {
      toast.info('Settings are already at defaults.');
    }
  };

  if (isLoadingAll || isLoadingRoles) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Menu Configuration</h1>
          <p className="text-muted-foreground">
            Control which work items each role can see in the Create dropdown menu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleRestoreDefaults} 
            disabled={batchUpdateVisibility.isPending}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restore Defaults
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasUnsavedChanges || batchUpdateVisibility.isPending}
            className="gap-2"
          >
            {batchUpdateVisibility.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            You have unsaved changes. Click "Save Settings" to apply them.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Work Item Visibility by Role</CardTitle>
          <CardDescription>
            Check the boxes to allow a role to see that work item in the Create menu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground min-w-[180px]">
                    Role
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-sm min-w-[70px]">
                    <span className="text-xs">All</span>
                  </th>
                  {WORK_ITEM_TYPES.map(type => {
                    const config = workItemConfig[type];
                    const Icon = config.icon;
                    return (
                      <th key={type} className="text-center py-3 px-2 font-medium text-sm min-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <Icon className={cn('h-4 w-4', config.color)} />
                          <span className="text-xs">{config.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {productRoles?.map(role => {
                  // Check if all items are selected for this role
                  const allSelected = WORK_ITEM_TYPES.every(type => getVisibility(role.code, type));
                  const someSelected = WORK_ITEM_TYPES.some(type => getVisibility(role.code, type));
                  
                  const handleSelectAll = () => {
                    const newValue = !allSelected;
                    WORK_ITEM_TYPES.forEach(type => {
                      const currentValue = getVisibility(role.code, type);
                      if (currentValue !== newValue) {
                        handleToggle(role.code, type);
                      }
                    });
                  };

                  return (
                    <tr key={role.code} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{role.name}</span>
                          <span className="text-xs text-muted-foreground">{role.code}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                            onCheckedChange={handleSelectAll}
                            className="h-5 w-5"
                          />
                        </div>
                      </td>
                      {WORK_ITEM_TYPES.map(type => {
                        const isVisible = getVisibility(role.code, type);
                        const hasChange = pendingChanges[role.code]?.[type] !== undefined;
                        
                        return (
                          <td key={type} className="text-center py-3 px-2">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={isVisible}
                                onCheckedChange={() => handleToggle(role.code, type)}
                                className={cn(
                                  'h-5 w-5',
                                  hasChange && 'ring-2 ring-amber-400 ring-offset-2'
                                )}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
