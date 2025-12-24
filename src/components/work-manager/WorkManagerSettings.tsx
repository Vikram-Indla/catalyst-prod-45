// src/components/work-manager/WorkManagerSettings.tsx
// Settings & Configuration View

import { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkManagerColumns } from '@/hooks/useWorkManagerColumns';
import type { TaskStatus } from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SettingsTab = 'columns' | 'recurrence' | 'notifications' | 'integrations';

interface BoardColumn {
  id: string;
  name: string;
  status: string;
}

interface RecurrenceTemplate {
  id: string;
  name: string;
  frequency: string;
  nextRun: string;
  active: boolean;
}

interface Integration {
  name: string;
  description: string;
  connected: boolean;
  icon: string;
}

export function WorkManagerSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('columns');
  const { columns, addColumn, updateColumn, deleteColumn } = useWorkManagerColumns();

  // Column dialog state
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [columnForm, setColumnForm] = useState({ name: '', status: 'Backlog' });

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingColumn, setDeletingColumn] = useState<BoardColumn | null>(null);

  // Recurrence template state
  const [templates, setTemplates] = useState<RecurrenceTemplate[]>([
    { id: 't1', name: 'Weekly Trade Settlement', frequency: 'Weekly (Friday)', nextRun: 'Dec 27, 2024', active: true },
    { id: 't2', name: 'Monthly Portfolio Review', frequency: 'Monthly (1st)', nextRun: 'Jan 1, 2025', active: true },
  ]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurrenceTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', frequency: 'Weekly' });

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([
    { name: 'Epics', description: 'Link tasks to strategic Epics', connected: true, icon: '📋' },
    { name: 'Features', description: 'Connect tasks to Feature work items', connected: true, icon: '✨' },
    { name: 'Stories', description: 'Associate tasks with User Stories', connected: true, icon: '📝' },
    { name: 'Business Requests', description: 'Track tasks against Business Requests', connected: true, icon: '📨' },
    { name: 'OKRs', description: 'Align tasks with Objectives and Key Results', connected: false, icon: '🎯' },
    { name: 'Calendar', description: 'Sync due dates with calendar', connected: false, icon: '📅' },
  ]);

  // Notification preferences state
  const [notifications, setNotifications] = useState([
    { id: 'n1', label: 'Task assigned to me', description: 'Get notified when a task is assigned to you', checked: true },
    { id: 'n2', label: 'Task due soon', description: 'Reminder when a task is due within 24 hours', checked: true },
    { id: 'n3', label: 'Task overdue', description: 'Alert when a task passes its due date', checked: true },
    { id: 'n4', label: 'Task blocked', description: 'Notify when a task you own becomes blocked', checked: true },
    { id: 'n5', label: 'Weekly digest', description: 'Summary of your weekly progress every Monday', checked: false },
    { id: 'n6', label: 'Team updates', description: 'Updates about team task changes', checked: false },
  ]);

  const tabs = [
    { id: 'columns', label: 'Board Columns' },
    { id: 'recurrence', label: 'Recurrence Templates' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'integrations', label: 'Integrations' },
  ] as const;

  const statusOptions = ['Backlog', 'Planned', 'In Progress', 'Waiting', 'Done'];

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-status-success-bg text-status-success';
      case 'In Progress': return 'bg-status-warning-bg text-status-warning';
      case 'Planned': return 'bg-status-info-bg text-status-info';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  // Column handlers
  const handleOpenAddColumn = () => {
    setEditingColumn(null);
    setColumnForm({ name: '', status: 'Backlog' });
    setIsColumnDialogOpen(true);
  };

  const handleOpenEditColumn = (column: BoardColumn) => {
    setEditingColumn(column);
    setColumnForm({ name: column.name, status: column.status });
    setIsColumnDialogOpen(true);
  };

  const handleSaveColumn = () => {
    if (!columnForm.name.trim()) {
      toast.error('Column name is required');
      return;
    }

    if (editingColumn) {
      updateColumn(editingColumn.id, { 
        name: columnForm.name.trim(), 
        status: columnForm.status as TaskStatus 
      });
      toast.success(`Column "${columnForm.name}" updated`);
    } else {
      addColumn({
        name: columnForm.name.trim(),
        status: columnForm.status as TaskStatus,
      });
      toast.success(`Column "${columnForm.name}" added`);
    }
    setIsColumnDialogOpen(false);
  };

  const handleOpenDeleteColumn = (column: BoardColumn) => {
    setDeletingColumn(column);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteColumn = () => {
    if (deletingColumn) {
      deleteColumn(deletingColumn.id);
      toast.success(`Column "${deletingColumn.name}" deleted`);
    }
    setIsDeleteDialogOpen(false);
    setDeletingColumn(null);
  };

  // Template handlers
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', frequency: 'Weekly' });
    setIsTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (template: RecurrenceTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name, frequency: template.frequency.split(' ')[0] });
    setIsTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (editingTemplate) {
      setTemplates(prev => prev.map(t =>
        t.id === editingTemplate.id
          ? { ...t, name: templateForm.name.trim(), frequency: `${templateForm.frequency} (Friday)` }
          : t
      ));
      toast.success(`Template "${templateForm.name}" updated`);
    } else {
      const newTemplate: RecurrenceTemplate = {
        id: `t-${Date.now()}`,
        name: templateForm.name.trim(),
        frequency: `${templateForm.frequency} (Friday)`,
        nextRun: 'Dec 27, 2024',
        active: true,
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success(`Template "${templateForm.name}" created`);
    }
    setIsTemplateDialogOpen(false);
  };

  const handleToggleTemplate = (templateId: string) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, active: !t.active } : t
    ));
  };

  // Notification handler
  const handleToggleNotification = (notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, checked: !n.checked } : n
    ));
    toast.success('Notification preference updated');
  };

  // Integration handler
  const handleConnectIntegration = (integrationName: string) => {
    setIntegrations(prev => prev.map(i =>
      i.name === integrationName ? { ...i, connected: true } : i
    ));
    toast.success(`${integrationName} connected successfully`);
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-foreground">Settings</h2>
        <p className="text-[13px] text-muted-foreground">Configure your Work Manager preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-default mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-3 text-[13px] font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'text-brand-primary border-brand-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'columns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Default Board Columns</h3>
              <p className="text-[12px] text-muted-foreground mt-1">Configure the default columns and WIP limits for new boards</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenAddColumn}>
              <Plus className="w-4 h-4" />
              Add Column
            </Button>
          </div>

          <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="w-10"></th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Column Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Status Mapping</th>
                  
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Position</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column, index) => (
                  <tr key={column.id} className="border-b border-border-subtle hover:bg-surface-muted">
                    <td className="px-2 py-3 text-center">
                      <GripVertical className="w-4 h-4 text-text-muted cursor-grab" />
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-foreground">{column.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getStatusBadgeClass(column.status))}>
                        {column.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-text-muted">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditColumn(column)}
                          className="p-1.5 rounded hover:bg-surface-hover"
                          title="Edit column"
                        >
                          <Edit2 className="w-4 h-4 text-text-muted" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteColumn(column)}
                          className="p-1.5 rounded hover:bg-surface-hover hover:text-red-500"
                          title="Delete column"
                        >
                          <Trash2 className="w-4 h-4 text-text-muted" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[12px] text-text-muted">
            <strong>Note:</strong> WIP (Work In Progress) limits help teams maintain focus by limiting the number of tasks that can be in a column simultaneously.
          </div>
        </div>
      )}

      {activeTab === 'recurrence' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Recurrence Templates</h3>
              <p className="text-[12px] text-muted-foreground mt-1">Manage templates for recurring tasks</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenAddTemplate}>
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </div>

          <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Template Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Frequency</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Next Run</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-border-subtle hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-medium text-foreground">{template.name}</td>
                    <td className="px-4 py-3 text-[13px] text-foreground/70">{template.frequency}</td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{template.nextRun}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={template.active}
                        onCheckedChange={() => handleToggleTemplate(template.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditTemplate(template)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Notification Preferences</h3>
            <p className="text-[12px] text-muted-foreground mt-1">Configure when and how you receive notifications</p>
          </div>

          <div className="bg-surface-card border border-border-default rounded-lg divide-y divide-border-subtle">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div>
                  <span className="text-[13px] font-medium text-foreground">{notification.label}</span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{notification.description}</p>
                </div>
                <Switch
                  checked={notification.checked}
                  onCheckedChange={() => handleToggleNotification(notification.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Integrations</h3>
            <p className="text-[12px] text-muted-foreground mt-1">Connect Work Manager with other Catalyst modules</p>
          </div>

          <div className="grid gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-4 bg-surface-card border border-border-default rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-lg">
                    {integration.icon}
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-foreground">{integration.name}</span>
                    <p className="text-[12px] text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {integration.connected ? (
                    <span className="px-2 py-1 bg-status-success-bg text-status-success text-[11px] font-medium rounded">
                      Connected
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectIntegration(integration.name)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Edit Column' : 'Add Column'}</DialogTitle>
            <DialogDescription>
              {editingColumn ? 'Update the column settings' : 'Create a new board column'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="col-name">Column Name *</Label>
              <Input
                id="col-name"
                value={columnForm.name}
                onChange={(e) => setColumnForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., In Review"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="col-status">Status Mapping</Label>
              <Select
                value={columnForm.status}
                onValueChange={(value) => setColumnForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveColumn}>
              {editingColumn ? 'Save Changes' : 'Add Column'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingColumn?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteColumn}>
              Delete Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the recurrence template' : 'Create a new recurrence template'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Weekly Status Report"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl-freq">Frequency</Label>
              <Select
                value={templateForm.frequency}
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WorkManagerSettings;
