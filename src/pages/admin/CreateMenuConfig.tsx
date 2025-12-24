import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateMenuVisibility, useProductRoles } from '@/hooks/useCreateMenuVisibility';
import { workItemConfig, WorkItemType } from '@/config/workItemConfig';
import { useWorkItemIconPreferences, IconStyle } from '@/hooks/useWorkItemIconPreferences';
import { IconStyleSelector } from '@/components/admin/IconStyleSelector';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import { Save, Loader2, AlertCircle, RotateCcw, Palette } from 'lucide-react';
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

// Default visibility settings matching the reference screenshot
// Note: No role has ALL items checked to prevent "All" checkbox from being selected
const DEFAULT_VISIBILITY: Record<string, Record<string, boolean>> = {
  developer: {
    theme: false, objective: false, 'business-request': false, epic: false,
    feature: false, story: true, defect: false, incident: false, dependency: false, risk: false,
  },
  enterprise_architect: {
    theme: true, objective: true, 'business-request': true, epic: true,
    feature: true, story: false, defect: false, incident: false, dependency: false, risk: false,
  },
  product_manager: {
    theme: true, objective: true, 'business-request': true, epic: true,
    feature: true, story: true, defect: true, incident: false, dependency: false, risk: false,
  },
  product_owner: {
    theme: true, objective: true, 'business-request': true, epic: true,
    feature: true, story: true, defect: true, incident: false, dependency: false, risk: false,
  },
  project_manager: {
    theme: true, objective: true, 'business-request': false, epic: true,
    feature: true, story: false, defect: false, incident: false, dependency: false, risk: false,
  },
  qa_tester: {
    theme: false, objective: false, 'business-request': true, epic: true,
    feature: true, story: false, defect: false, incident: false, dependency: false, risk: false,
  },
  super_admin: {
    theme: true, objective: true, 'business-request': true, epic: true,
    feature: true, story: true, defect: true, incident: true, dependency: true, risk: false,
  },
};

// Default icon styles
const DEFAULT_ICON_STYLES: Record<string, IconStyle> = {
  theme: 'filled',
  objective: 'filled',
  'business-request': 'filled',
  epic: 'filled',
  feature: 'filled',
  story: 'filled',
  defect: 'filled',
  incident: 'filled',
  dependency: 'filled',
  risk: 'filled',
};

export default function CreateMenuConfig() {
  const { allSettings, isLoadingAll, batchUpdateVisibility } = useCreateMenuVisibility();
  const { data: productRoles, isLoading: isLoadingRoles } = useProductRoles();
  const { 
    iconPreferences, 
    isLoading: isLoadingIcons, 
    iconStyleMap,
    batchUpdateIconPreferences 
  } = useWorkItemIconPreferences();
  
  // Track pending visibility changes (role_code -> work_item_type -> is_visible)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, boolean>>>({});
  
  // Track pending icon changes (work_item_type -> icon_style)
  const [pendingIconChanges, setPendingIconChanges] = useState<Record<string, IconStyle>>({});
  
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

  const getIconStyle = (workItemType: string): IconStyle => {
    // Check pending icon changes first
    if (pendingIconChanges[workItemType] !== undefined) {
      return pendingIconChanges[workItemType];
    }
    // Fall back to saved settings
    return iconStyleMap[workItemType] || 'filled';
  };

  const hasUnsavedVisibilityChanges = Object.keys(pendingChanges).length > 0;
  const hasUnsavedIconChanges = Object.keys(pendingIconChanges).length > 0;
  const hasUnsavedChanges = hasUnsavedVisibilityChanges || hasUnsavedIconChanges;

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

  const handleIconStyleChange = (workItemType: string, iconStyle: IconStyle) => {
    const originalValue = iconStyleMap[workItemType] || 'filled';
    
    setPendingIconChanges(prev => {
      const updated = { ...prev };
      
      if (iconStyle === originalValue) {
        // Remove from pending if back to original
        delete updated[workItemType];
      } else {
        // Add to pending
        updated[workItemType] = iconStyle;
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    const visibilityUpdates: { roleCode: string; workItemType: string; isVisible: boolean }[] = [];
    const iconUpdates: { workItemType: string; iconStyle: IconStyle }[] = [];
    
    // Collect visibility updates
    Object.entries(pendingChanges).forEach(([roleCode, workItems]) => {
      Object.entries(workItems).forEach(([workItemType, isVisible]) => {
        visibilityUpdates.push({ roleCode, workItemType, isVisible });
      });
    });

    // Collect icon updates
    Object.entries(pendingIconChanges).forEach(([workItemType, iconStyle]) => {
      iconUpdates.push({ workItemType, iconStyle });
    });

    try {
      const promises: Promise<void>[] = [];
      
      if (visibilityUpdates.length > 0) {
        promises.push(batchUpdateVisibility.mutateAsync(visibilityUpdates));
      }
      
      if (iconUpdates.length > 0) {
        promises.push(batchUpdateIconPreferences.mutateAsync(iconUpdates));
      }
      
      await Promise.all(promises);
      
      setPendingChanges({});
      setPendingIconChanges({});
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleRestoreDefaults = () => {
    // Stage all default visibility values as pending changes
    const newPendingChanges: Record<string, Record<string, boolean>> = {};
    
    Object.entries(DEFAULT_VISIBILITY).forEach(([roleCode, workItems]) => {
      Object.entries(workItems).forEach(([workItemType, defaultValue]) => {
        const currentSavedValue = visibilityMap[roleCode]?.[workItemType] ?? false;
        
        if (defaultValue !== currentSavedValue) {
          if (!newPendingChanges[roleCode]) {
            newPendingChanges[roleCode] = {};
          }
          newPendingChanges[roleCode][workItemType] = defaultValue;
        }
      });
    });
    
    // Stage all default icon styles as pending changes
    const newPendingIconChanges: Record<string, IconStyle> = {};
    
    Object.entries(DEFAULT_ICON_STYLES).forEach(([workItemType, defaultStyle]) => {
      const currentSavedStyle = iconStyleMap[workItemType] || 'filled';
      
      if (defaultStyle !== currentSavedStyle) {
        newPendingIconChanges[workItemType] = defaultStyle;
      }
    });
    
    setPendingChanges(newPendingChanges);
    setPendingIconChanges(newPendingIconChanges);
    
    const hasChanges = Object.keys(newPendingChanges).length > 0 || Object.keys(newPendingIconChanges).length > 0;
    
    if (hasChanges) {
      toast.info('Default settings staged. Click "Save Settings" to apply.');
    } else {
      toast.info('Settings are already at defaults.');
    }
  };

  const isLoading = isLoadingAll || isLoadingRoles || isLoadingIcons;
  const isSaving = batchUpdateVisibility.isPending || batchUpdateIconPreferences.isPending;

  if (isLoading) {
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
            Control work item visibility and icon styles across Catalyst.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleRestoreDefaults} 
            disabled={isSaving}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restore Defaults
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasUnsavedChanges || isSaving}
            className="gap-2"
          >
            {isSaving ? (
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

      <Tabs defaultValue="visibility" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="visibility" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Role Visibility
            {hasUnsavedVisibilityChanges && (
              <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="icons" className="gap-2">
            <Palette className="h-4 w-4" />
            Icon Styles
            {hasUnsavedIconChanges && (
              <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visibility" className="mt-6">
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
                        return (
                          <th key={type} className="text-center py-3 px-2 font-medium text-sm min-w-[90px]">
                            <div className="flex flex-col items-center gap-1">
                              <WorkItemIcon type={type} size={16} forceStyle={getIconStyle(type)} />
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
        </TabsContent>

        <TabsContent value="icons" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Work Item Icon Styles</CardTitle>
              <CardDescription>
                Choose an icon style for each work item type. Changes apply across all of Catalyst in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {WORK_ITEM_TYPES.map(type => {
                  const config = workItemConfig[type];
                  const currentStyle = getIconStyle(type);
                  const hasChange = pendingIconChanges[type] !== undefined;
                  
                  return (
                    <div 
                      key={type} 
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        hasChange 
                          ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" 
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                          <WorkItemIcon type={type} size={28} forceStyle={currentStyle} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{config.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            Select icon style for {config.label.toLowerCase()}
                          </p>
                        </div>
                        {hasChange && (
                          <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded">
                            Modified
                          </span>
                        )}
                      </div>
                      <IconStyleSelector
                        workItemType={type}
                        selectedStyle={currentStyle}
                        onChange={(style) => handleIconStyleChange(type, style)}
                        disabled={isSaving}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
