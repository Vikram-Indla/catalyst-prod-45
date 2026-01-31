import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { usePlanHubSettings, useUpdatePlanHubSettings, PlanHubGeneralSettings, PlanHubFeatureSettings } from '@/hooks/planhub';

export default function PlanHubGeneralSettingsPage() {
  const { data: settings, isLoading } = usePlanHubSettings();
  const updateSettings = useUpdatePlanHubSettings();
  
  const [general, setGeneral] = useState<PlanHubGeneralSettings | null>(null);
  const [features, setFeatures] = useState<PlanHubFeatureSettings | null>(null);

  // Initialize local state when data loads
  if (settings && !general && !features) {
    setGeneral(settings.general);
    setFeatures(settings.features);
  }

  const handleSave = () => {
    if (general && features) {
      updateSettings.mutate({ general, features });
    }
  };

  const updateGeneral = <K extends keyof PlanHubGeneralSettings>(key: K, value: PlanHubGeneralSettings[K]) => {
    if (general) {
      setGeneral({ ...general, [key]: value });
    }
  };

  const updateFeature = <K extends keyof PlanHubFeatureSettings>(key: K, value: boolean) => {
    if (features) {
      setFeatures({ ...features, [key]: value });
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="h-[72px] border-b bg-card flex-shrink-0">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 flex-shrink-0">
                <Calendar className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">PlanHub™ Settings</h1>
                <p className="text-sm text-muted-foreground truncate">
                  Configure module behavior, defaults, and feature toggles
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending}
              className="bg-brand-primary hover:bg-brand-primary-hover flex-shrink-0"
            >
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Warning Banner */}
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Admin access required</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Changes made here affect all users of the PlanHub™ module.
                </p>
              </div>
            </div>

            {/* General Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>
                  Configure default values and limits for plan creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="module-name">Module Display Name</Label>
                  <Input
                    id="module-name"
                    value={general?.module_name || ''}
                    onChange={(e) => updateGeneral('module_name', e.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Default Plan Duration (days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={365}
                      value={general?.default_duration_days || 90}
                      onChange={(e) => updateGeneral('default_duration_days', parseInt(e.target.value) || 90)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-tasks">Max Tasks Per Plan</Label>
                    <Input
                      id="max-tasks"
                      type="number"
                      min={10}
                      max={1000}
                      value={general?.max_tasks_per_plan || 500}
                      onChange={(e) => updateGeneral('max_tasks_per_plan', parseInt(e.target.value) || 500)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="auto-save">Auto-Save Interval (seconds)</Label>
                    <Input
                      id="auto-save"
                      type="number"
                      min={10}
                      max={300}
                      value={general?.auto_save_interval_seconds || 30}
                      onChange={(e) => updateGeneral('auto_save_interval_seconds', parseInt(e.target.value) || 30)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sentiment">Default Sentiment</Label>
                    <Select 
                      value={general?.default_sentiment || 'moderate'} 
                      onValueChange={(v) => updateGeneral('default_sentiment', v as 'conservative' | 'moderate' | 'aggressive')}
                    >
                      <SelectTrigger id="sentiment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Toggles */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>
                  Enable or disable specific PlanHub features for all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Version Control</Label>
                    <p className="text-sm text-muted-foreground">
                      Track changes and maintain plan history
                    </p>
                  </div>
                  <Switch 
                    checked={features?.version_control ?? true}
                    onCheckedChange={(v) => updateFeature('version_control', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Save</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save changes at configured interval
                    </p>
                  </div>
                  <Switch 
                    checked={features?.auto_save ?? true}
                    onCheckedChange={(v) => updateFeature('auto_save', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval for Delete</Label>
                    <p className="text-sm text-muted-foreground">
                      Manager approval before deleting plans
                    </p>
                  </div>
                  <Switch 
                    checked={features?.require_approval_delete ?? false}
                    onCheckedChange={(v) => updateFeature('require_approval_delete', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Presentation Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Full-screen presentation capability
                    </p>
                  </div>
                  <Switch 
                    checked={features?.presentation_mode ?? true}
                    onCheckedChange={(v) => updateFeature('presentation_mode', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Scenario Compare</Label>
                    <p className="text-sm text-muted-foreground">
                      Side-by-side plan comparison
                    </p>
                  </div>
                  <Switch 
                    checked={features?.scenario_compare ?? true}
                    onCheckedChange={(v) => updateFeature('scenario_compare', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Master Plan View</Label>
                    <p className="text-sm text-muted-foreground">
                      Multi-plan timeline visualization
                    </p>
                  </div>
                  <Switch 
                    checked={features?.master_plan_view ?? true}
                    onCheckedChange={(v) => updateFeature('master_plan_view', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Resource Management</Label>
                    <p className="text-sm text-muted-foreground">
                      Team and resource assignment
                    </p>
                  </div>
                  <Switch 
                    checked={features?.resource_management ?? true}
                    onCheckedChange={(v) => updateFeature('resource_management', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Report Center</Label>
                    <p className="text-sm text-muted-foreground">
                      Report generation and export
                    </p>
                  </div>
                  <Switch 
                    checked={features?.report_center ?? true}
                    onCheckedChange={(v) => updateFeature('report_center', v)} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
