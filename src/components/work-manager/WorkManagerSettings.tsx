// src/components/work-manager/WorkManagerSettings.tsx
// Settings & Configuration View

import { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { defaultColumns } from '@/lib/work-manager-data';
import { cn } from '@/lib/utils';

type SettingsTab = 'columns' | 'recurrence' | 'notifications' | 'integrations';

export function WorkManagerSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('columns');
  const [columns, setColumns] = useState(defaultColumns);

  const tabs = [
    { id: 'columns', label: 'Board Columns' },
    { id: 'recurrence', label: 'Recurrence Templates' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'integrations', label: 'Integrations' },
  ] as const;

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-status-success-bg text-status-success';
      case 'In Progress': return 'bg-status-warning-bg text-status-warning';
      case 'Planned': return 'bg-status-info-bg text-status-info';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-text-primary">Settings</h2>
        <p className="text-[13px] text-text-muted">Configure your Work Manager preferences</p>
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
                : 'text-text-muted border-transparent hover:text-text-primary'
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
              <h3 className="text-[14px] font-semibold text-text-primary">Default Board Columns</h3>
              <p className="text-[12px] text-text-muted mt-1">Configure the default columns and WIP limits for new boards</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
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
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">WIP Limit</th>
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
                    <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{column.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getStatusBadgeClass(column.status))}>
                        {column.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-text-secondary">
                      {column.wipLimit || '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-text-muted">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 rounded hover:bg-surface-hover">
                          <Edit2 className="w-4 h-4 text-text-muted" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-surface-hover">
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
              <h3 className="text-[14px] font-semibold text-text-primary">Recurrence Templates</h3>
              <p className="text-[12px] text-text-muted mt-1">Manage templates for recurring tasks</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </div>

          <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Template Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Frequency</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Next Run</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Active</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle">
                  <td className="px-4 py-3 text-[13px] font-medium text-text-primary">Weekly Trade Settlement</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">Weekly (Friday)</td>
                  <td className="px-4 py-3 text-[13px] text-text-muted">Dec 27, 2024</td>
                  <td className="px-4 py-3 text-center">
                    <Switch defaultChecked />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </td>
                </tr>
                <tr className="border-b border-border-subtle">
                  <td className="px-4 py-3 text-[13px] font-medium text-text-primary">Monthly Portfolio Review</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">Monthly (1st)</td>
                  <td className="px-4 py-3 text-[13px] text-text-muted">Jan 1, 2025</td>
                  <td className="px-4 py-3 text-center">
                    <Switch defaultChecked />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary">Notification Preferences</h3>
            <p className="text-[12px] text-text-muted mt-1">Configure when and how you receive notifications</p>
          </div>

          <div className="bg-surface-card border border-border-default rounded-lg divide-y divide-border-subtle">
            {[
              { label: 'Task assigned to me', description: 'Get notified when a task is assigned to you', defaultChecked: true },
              { label: 'Task due soon', description: 'Reminder when a task is due within 24 hours', defaultChecked: true },
              { label: 'Task overdue', description: 'Alert when a task passes its due date', defaultChecked: true },
              { label: 'Task blocked', description: 'Notify when a task you own becomes blocked', defaultChecked: true },
              { label: 'Weekly digest', description: 'Summary of your weekly progress every Monday', defaultChecked: false },
              { label: 'Team updates', description: 'Updates about team task changes', defaultChecked: false },
            ].map((notification, index) => (
              <div key={index} className="flex items-center justify-between p-4">
                <div>
                  <span className="text-[13px] font-medium text-text-primary">{notification.label}</span>
                  <p className="text-[12px] text-text-muted mt-0.5">{notification.description}</p>
                </div>
                <Switch defaultChecked={notification.defaultChecked} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary">Integrations</h3>
            <p className="text-[12px] text-text-muted mt-1">Connect Work Manager with other Catalyst modules</p>
          </div>

          <div className="grid gap-4">
            {[
              { name: 'Epics', description: 'Link tasks to strategic Epics', connected: true, icon: '📋' },
              { name: 'Features', description: 'Connect tasks to Feature work items', connected: true, icon: '✨' },
              { name: 'Stories', description: 'Associate tasks with User Stories', connected: true, icon: '📝' },
              { name: 'Business Requests', description: 'Track tasks against Business Requests', connected: true, icon: '📨' },
              { name: 'OKRs', description: 'Align tasks with Objectives and Key Results', connected: false, icon: '🎯' },
              { name: 'Calendar', description: 'Sync due dates with calendar', connected: false, icon: '📅' },
            ].map((integration) => (
              <div 
                key={integration.name} 
                className="flex items-center justify-between p-4 bg-surface-card border border-border-default rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-lg">
                    {integration.icon}
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-text-primary">{integration.name}</span>
                    <p className="text-[12px] text-text-muted">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {integration.connected ? (
                    <span className="px-2 py-1 bg-status-success-bg text-status-success text-[11px] font-medium rounded">
                      Connected
                    </span>
                  ) : (
                    <Button variant="outline" size="sm">Connect</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkManagerSettings;