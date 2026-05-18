/**
 * Theme Groups Management Page - Configure strategic theme groupings
 * Source: Administration guide PDF, Page 19
 *
 * Features:
 * - List all strategic themes with linked item counts
 * - Edit theme details
 * - Toggle active/inactive status
 * - Delete themes with linked items protection
 */

import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import AddIcon from '@atlaskit/icon/core/add';
import SearchIcon from '@atlaskit/icon/core/search';
import EditIcon from '@atlaskit/icon/core/edit';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import Spinner from '@atlaskit/spinner';
import { useState } from 'react';
import { useThemeGroupsWithCounts, useUpdateThemeStatus, ThemeGroupWithCounts } from '@/hooks/useThemeGroups';
import { ThemeDialog } from '@/components/forms/ThemeDialog';
import { DeleteThemeDialog } from '@/components/admin/DeleteThemeDialog';
import { Lozenge, Tooltip } from '@/components/ads';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export default function ThemeGroups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editTheme, setEditTheme] = useState<ThemeGroupWithCounts | null>(null);
  const [deleteTheme, setDeleteTheme] = useState<ThemeGroupWithCounts | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const { data: themes = [], isLoading, error } = useThemeGroupsWithCounts();
  const updateStatusMutation = useUpdateThemeStatus();

  const filteredThemes = themes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (theme.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleStatus = (theme: ThemeGroupWithCounts) => {
    const newStatus = theme.status === 'active' ? 'cancelled' : 'active';
    updateStatusMutation.mutate({
      id: theme.id,
      status: newStatus as 'active' | 'proposed' | 'done' | 'cancelled'
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', style: { background: 'rgba(34,197,94,0.12)', color: '#15803d' } };
      case 'proposed':
        return { label: 'Proposed', style: { background: 'rgba(59,130,246,0.12)', color: '#1d4ed8' } };
      case 'done':
        return { label: 'Done', style: { background: 'var(--ds-background-neutral, #F7F8F9)', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' } };
      case 'cancelled':
        return { label: 'Inactive', style: { background: 'var(--ds-background-neutral, #F7F8F9)', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' } };
      default:
        return { label: status, style: { background: 'var(--ds-background-neutral, #F7F8F9)', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' } };
    }
  };

  const activeCount = themes.filter(t => t.status === 'active').length;
  const totalLinkedItems = themes.reduce((acc, t) => acc + t.epic_count + t.objective_count, 0);

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Strategic Themes</h1>
            <p className="mt-2" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
              Manage strategic theme configurations and linked items
            </p>
          </div>
          <Button
            appearance="primary"
            onClick={() => setShowCreateDialog(true)}
            iconBefore={AddIcon}
          >
            Add Theme
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Total Themes</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{themes.length}</div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Active Themes</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{activeCount}</div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Linked Items</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{totalLinkedItems}</div>
          </div>
        </div>

        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 className="text-base font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Theme Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
              Configure themes for strategic organization. Toggle status or manage linked items.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search themes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="medium" />
              </div>
            ) : error ? (
              <div className="text-center py-12" style={{ color: 'var(--ds-icon-danger, #CA3521)' }}>
                Failed to load themes. Please try again.
              </div>
            ) : themes.length === 0 ? (
              <AdminEmptyState sectionType="theme-groups" onAction={() => setShowCreateDialog(true)} />
            ) : (
              <div style={{ border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
                <table className="w-full">
                  <thead style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                    <tr>
                      <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Theme Name</th>
                      <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Description</th>
                      <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Linked Items</th>
                      <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Status</th>
                      <th className="text-center p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Active</th>
                      <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredThemes.map((theme) => {
                      const statusDisplay = getStatusDisplay(theme.status);
                      const hasLinkedItems = theme.epic_count > 0 || theme.objective_count > 0;

                      return (
                        <tr
                          key={theme.id}
                          style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)', background: hoveredRow === theme.id ? 'var(--ds-background-neutral-hovered, #F1F2F4)' : 'transparent' }}
                          onMouseEnter={() => setHoveredRow(theme.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td className="p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
                            <div className="flex items-center gap-2">
                              {theme.color_tag && (
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: theme.color_tag }}
                                />
                              )}
                              {theme.name}
                            </div>
                          </td>
                          <td className="p-3 text-sm max-w-md truncate" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                            {theme.description || '—'}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              {theme.epic_count > 0 && (
                                <Lozenge appearance="default">
                                  {theme.epic_count} epic{theme.epic_count !== 1 ? 's' : ''}
                                </Lozenge>
                              )}
                              {theme.objective_count > 0 && (
                                <Lozenge appearance="default">
                                  {theme.objective_count} obj.
                                </Lozenge>
                              )}
                              {!hasLinkedItems && (
                                <span className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>None</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs" style={statusDisplay.style}>
                              {statusDisplay.label}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-center">
                            <Tooltip content={<p>{theme.status === 'active' ? 'Set to inactive' : 'Set to active'}</p>}>
                              <div className="inline-flex">
                                <Toggle
                                  isChecked={theme.status === 'active'}
                                  onChange={() => handleToggleStatus(theme)}
                                  isDisabled={updateStatusMutation.isPending}
                                />
                              </div>
                            </Tooltip>
                          </td>
                          <td className="p-3 text-sm text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                appearance="subtle"
                                onClick={() => setEditTheme(theme)}
                              >
                                <EditIcon label="" size="small" />
                              </Button>
                              <Tooltip
                                content={
                                  hasLinkedItems
                                    ? 'Has linked items - will need reassignment'
                                    : 'Delete theme'
                                }
                              >
                                <Button
                                  appearance="subtle"
                                  onClick={() => setDeleteTheme(theme)}
                                >
                                  <span style={{ display: 'inline-flex', color: 'var(--ds-icon-danger, #CA3521)' }}><TrashIcon label="" size="small" /></span>
                                </Button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <ThemeDialog
        open={showCreateDialog || !!editTheme}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditTheme(null);
          }
        }}
        theme={editTheme}
      />

      {/* Delete Dialog with reassignment */}
      <DeleteThemeDialog
        open={!!deleteTheme}
        onOpenChange={(open) => !open && setDeleteTheme(null)}
        theme={deleteTheme}
        allThemes={themes}
      />
    </AdminGuard>
  );
}
