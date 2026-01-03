/**
 * Test Admin Page
 * Full configuration for test management: types, statuses, priorities, fields
 */

import React, { useState } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { 
  Settings,
  Sparkles,
  Shield,
  Link2,
  Bell,
  Lock,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  Check,
  X,
  Palette,
  FileText,
  CircleDot,
  AlertTriangle,
  Play,
  ToggleLeft,
  Save,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useTestAdminConfig } from '@/modules/tests/hooks/useTestAdminConfig';
import { supabase } from '@/integrations/supabase/client';

// Color options for configuration
const COLOR_OPTIONS = [
  { value: '#22C55E', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
  { value: '#14B8A6', label: 'Teal' },
];

// ==================== CONFIG TABLE COMPONENT ====================

interface ConfigTableProps {
  title: string;
  description: string;
  items: any[];
  isLoading: boolean;
  onCreate: (data: any) => Promise<unknown>;
  onUpdate: (data: any) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  columns: { key: string; label: string; type: 'text' | 'color' | 'boolean' | 'select'; options?: { value: string; label: string }[] }[];
  emptyMessage?: string;
}

function ConfigTable({
  title,
  description,
  items,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  columns,
  emptyMessage = 'No items configured',
}: ConfigTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ color: '#6B7280' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await onUpdate({ id: editingItem.id, ...formData });
      } else {
        await onCreate(formData);
      }
      setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await onDelete(id);
    }
  };

  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium text-text-primary">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary text-sm">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border-default">
                <TableHead className="w-8"></TableHead>
                {columns.map(col => (
                  <TableHead key={col.key} className="text-text-tertiary text-xs">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id} className="border-border-default">
                  <TableCell className="w-8 text-text-quaternary">
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                  {columns.map(col => (
                    <TableCell key={col.key} className="text-sm">
                      {col.type === 'color' ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-border-default"
                            style={{ backgroundColor: item[col.key] as string }}
                          />
                          <span className="text-text-primary">{item.name}</span>
                          {item.is_default && (
                            <Badge variant="secondary" className="text-[10px]">Default</Badge>
                          )}
                          {item.is_system && (
                            <Badge variant="outline" className="text-[10px]">System</Badge>
                          )}
                        </div>
                      ) : col.type === 'boolean' ? (
                        item[col.key] ? (
                          <Check className="h-4 w-4 text-status-success" />
                        ) : (
                          <X className="h-4 w-4 text-text-quaternary" />
                        )
                      ) : (
                        <span className="text-text-primary">{String(item[col.key] || '—')}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenEdit(item)}
                        disabled={item.is_system}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-status-error hover:text-status-error"
                        onClick={() => handleDelete(item.id)}
                        disabled={item.is_system}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Create'} {title.replace(/s$/, '')}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the configuration' : 'Add a new configuration item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {columns.map(col => (
              <div key={col.key} className="space-y-2">
                <Label>{col.label}</Label>
                {col.type === 'text' ? (
                  <Input
                    value={String(formData[col.key] || '')}
                    onChange={(e) => setFormData(prev => ({ ...prev, [col.key]: e.target.value }))}
                    className="bg-surface-2"
                  />
                ) : col.type === 'color' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={String(formData[col.key] || '')}
                      onChange={(e) => setFormData(prev => ({ ...prev, [col.key]: e.target.value }))}
                      className="bg-surface-2 flex-1"
                    />
                    <div className="flex gap-1">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          className={cn(
                            'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                            formData[col.key] === c.value ? 'border-text-primary scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: c.value }}
                          onClick={() => setFormData(prev => ({ ...prev, [col.key]: c.value }))}
                        />
                      ))}
                    </div>
                  </div>
                ) : col.type === 'boolean' ? (
                  <Switch
                    checked={Boolean(formData[col.key])}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [col.key]: checked }))}
                  />
                ) : col.type === 'select' && col.options ? (
                  <Select
                    value={String(formData[col.key] || '')}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, [col.key]: value }))}
                  >
                    <SelectTrigger className="bg-surface-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {col.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            ))}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(formData.is_default)}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <span>Set as default</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ==================== FIELD CONFIG COMPONENT ====================

interface FieldConfigSectionProps {
  entityType: string;
  label: string;
  fields: Array<{
    id: string;
    entity_type?: string;
    field_name: string;
    field_label: string;
    is_enabled: boolean;
    is_required: boolean;
    display_order: number;
  }>;
  onUpdate: (data: { id: string; is_enabled?: boolean; is_required?: boolean }) => Promise<unknown>;
}

function FieldConfigSection({ entityType, label, fields, onUpdate }: FieldConfigSectionProps) {
  const entityFields = fields.filter(f => f.entity_type === entityType);

  if (entityFields.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-text-tertiary">
        No fields configured for {label}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-text-primary">{label}</h4>
      <div className="space-y-1">
        {entityFields.map(field => (
          <div
            key={field.id}
            className="flex items-center justify-between p-2 bg-surface-1 rounded-md border border-border-default"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-text-quaternary" />
              <span className="text-sm text-text-primary">{field.field_label}</span>
              <span className="text-xs text-text-quaternary font-mono">{field.field_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-text-tertiary">
                <Switch
                  checked={field.is_required}
                  onCheckedChange={(checked) => onUpdate({ id: field.id, is_required: checked })}
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-xs text-text-tertiary">
                <Switch
                  checked={field.is_enabled}
                  onCheckedChange={(checked) => onUpdate({ id: field.id, is_enabled: checked })}
                />
                Enabled
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== NOTIFICATION PREFERENCES SECTION ====================

function NotificationPreferencesSection() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    execution_completed: true,
    execution_failed: true,
    cycle_completed: true,
    defect_linked: true,
    coverage_gap_detected: true,
    daily_digest: false,
    weekly_report: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (key: string, checked: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      await supabase.from('test_notification_preferences').upsert({
        user_id: user.id,
        preferences: preferences,
      });
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const notifications = [
    { key: 'execution_completed', label: 'Execution Completed', description: 'Notify when a test execution is completed' },
    { key: 'execution_failed', label: 'Execution Failed', description: 'Notify when a test execution fails' },
    { key: 'cycle_completed', label: 'Cycle Completed', description: 'Notify when a test cycle is completed' },
    { key: 'defect_linked', label: 'Defect Linked', description: 'Notify when a defect is linked to a test' },
    { key: 'coverage_gap_detected', label: 'Coverage Gap Detected', description: 'Notify when a coverage gap is identified' },
    { key: 'daily_digest', label: 'Daily Digest', description: 'Receive a daily summary of test activity' },
    { key: 'weekly_report', label: 'Weekly Report', description: 'Receive a weekly test metrics report' },
  ];

  return (
    <Card className="bg-surface-2 border-border-default">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Configure which test events trigger notifications</CardDescription>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map(n => (
          <div key={n.key} className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
            <div>
              <Label className="text-text-primary">{n.label}</Label>
              <p className="text-sm text-text-tertiary">{n.description}</p>
            </div>
            <Switch
              checked={preferences[n.key] ?? false}
              onCheckedChange={(checked) => handleToggle(n.key, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ==================== MAIN PAGE ====================

export function TestAdminPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  
  const { hasPermission, isLoading: permLoading } = usePermission('test_cases', 'configure', 'program', projectKey);

  const config = useTestAdminConfig(programId);

  // Show loading state
  if (permLoading || config.isLoading) {
    return (
      <div className="h-full flex flex-col bg-surface-1">
        <div className="px-6 py-4 border-b border-border-default">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if no permission
  if (!hasPermission) {
    toast.error('You do not have permission to access Test Admin');
    return <Navigate to={`/project/${projectKey}/tests`} replace />;
  }

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Admin</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-subtle rounded-lg">
              <Settings className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Test Administration</h1>
              <p className="text-sm text-text-tertiary">Configure test types, statuses, priorities, and fields</p>
            </div>
          </div>
          <Badge className="text-status-warning bg-status-warning/10">
            <Lock className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="types" className="w-full">
          <TabsList className="bg-surface-2 border border-border-default mb-6">
            <TabsTrigger value="types" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Case Types
            </TabsTrigger>
            <TabsTrigger value="statuses" className="gap-1.5">
              <CircleDot className="h-4 w-4" />
              Case Statuses
            </TabsTrigger>
            <TabsTrigger value="priorities" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Priorities
            </TabsTrigger>
            <TabsTrigger value="run-statuses" className="gap-1.5">
              <Play className="h-4 w-4" />
              Run Statuses
            </TabsTrigger>
            <TabsTrigger value="fields" className="gap-1.5">
              <ToggleLeft className="h-4 w-4" />
              Field Config
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Case Types Tab */}
          <TabsContent value="types">
            <ConfigTable
              title="Case Types"
              description="Define test case types (e.g., Functional, Regression, Smoke)"
              items={config.caseTypes}
              isLoading={config.isLoading}
              onCreate={config.createCaseType}
              onUpdate={config.updateCaseType}
              onDelete={config.deleteCaseType}
              columns={[
                { key: 'color', label: 'Name', type: 'color' },
                { key: 'description', label: 'Description', type: 'text' },
              ]}
              emptyMessage="No case types configured. Add some to categorize your tests."
            />
          </TabsContent>

          {/* Case Statuses Tab */}
          <TabsContent value="statuses">
            <ConfigTable
              title="Case Statuses"
              description="Define test case lifecycle statuses (e.g., Draft, Ready, Deprecated)"
              items={config.caseStatuses}
              isLoading={config.isLoading}
              onCreate={config.createCaseStatus}
              onUpdate={config.updateCaseStatus}
              onDelete={config.deleteCaseStatus}
              columns={[
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'eligible_for_cycle_set', label: 'Cycle Eligible', type: 'boolean' },
                { key: 'eligible_for_linked_step', label: 'Step Eligible', type: 'boolean' },
              ]}
              emptyMessage="No case statuses configured."
            />
          </TabsContent>

          {/* Priorities Tab */}
          <TabsContent value="priorities">
            <ConfigTable
              title="Case Priorities"
              description="Define priority levels for test cases"
              items={config.casePriorities}
              isLoading={config.isLoading}
              onCreate={config.createCasePriority}
              onUpdate={config.updateCasePriority}
              onDelete={config.deleteCasePriority}
              columns={[
                { key: 'color', label: 'Priority', type: 'color' },
              ]}
              emptyMessage="No priorities configured. Add priorities like Critical, High, Medium, Low."
            />
          </TabsContent>

          {/* Run Statuses Tab */}
          <TabsContent value="run-statuses">
            <ConfigTable
              title="Run Statuses"
              description="Define execution result statuses (e.g., Passed, Failed, Blocked)"
              items={config.runStatuses}
              isLoading={config.isLoading}
              onCreate={(data) => config.createRunStatus({ ...data, status_type: 'custom' } as any)}
              onUpdate={config.updateRunStatus}
              onDelete={config.deleteRunStatus}
              columns={[
                { key: 'highlight_color', label: 'Status', type: 'color' },
                { key: 'status_type', label: 'Type', type: 'text' },
                { key: 'execution_completed', label: 'Marks Complete', type: 'boolean' },
              ]}
              emptyMessage="No run statuses configured."
            />
          </TabsContent>

          {/* Field Configuration Tab */}
          <TabsContent value="fields">
            <Card className="bg-surface-2 border-border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-text-primary">
                  Field Configuration
                </CardTitle>
                <CardDescription>
                  Enable/disable and configure field requirements for test entities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FieldConfigSection
                  entityType="test_case"
                  label="Test Case Fields"
                  fields={config.fieldConfigs}
                  onUpdate={config.updateFieldConfig}
                />
                <FieldConfigSection
                  entityType="test_cycle"
                  label="Test Cycle Fields"
                  fields={config.fieldConfigs}
                  onUpdate={config.updateFieldConfig}
                />
                <FieldConfigSection
                  entityType="test_execution"
                  label="Test Execution Fields"
                  fields={config.fieldConfigs}
                  onUpdate={config.updateFieldConfig}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationPreferencesSection />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    AI Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Enable AI Test Suggestions</Label>
                      <p className="text-sm text-text-tertiary">
                        Allow AI to suggest test cases based on requirements
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(config.getSetting('ai_settings')?.['ai_suggestions_enabled'])}
                      onCheckedChange={(checked) => config.updateSetting({
                        key: 'ai_settings',
                        value: { ...config.getSetting('ai_settings'), ai_suggestions_enabled: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Auto-generate Test Steps</Label>
                      <p className="text-sm text-text-tertiary">
                        Automatically generate test steps from acceptance criteria
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(config.getSetting('ai_settings')?.['auto_generate_steps'])}
                      onCheckedChange={(checked) => config.updateSetting({
                        key: 'ai_settings',
                        value: { ...config.getSetting('ai_settings'), auto_generate_steps: checked }
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    Execution Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Require Evidence for Pass</Label>
                      <p className="text-sm text-text-tertiary">
                        Testers must attach screenshots for passed tests
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(config.getSetting('execution_policies')?.['require_evidence'])}
                      onCheckedChange={(checked) => config.updateSetting({
                        key: 'execution_policies',
                        value: { ...config.getSetting('execution_policies'), require_evidence: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Mandatory Defect Linking</Label>
                      <p className="text-sm text-text-tertiary">
                        Failed tests must be linked to a defect
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(config.getSetting('execution_policies')?.['require_defect_link'])}
                      onCheckedChange={(checked) => config.updateSetting({
                        key: 'execution_policies',
                        value: { ...config.getSetting('execution_policies'), require_defect_link: checked }
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TestAdminPage;
