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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useThemeGroupsWithCounts, useUpdateThemeStatus, ThemeGroupWithCounts } from '@/hooks/useThemeGroups';
import { ThemeDialog } from '@/components/forms/ThemeDialog';
import { DeleteThemeDialog } from '@/components/admin/DeleteThemeDialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export default function ThemeGroups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editTheme, setEditTheme] = useState<ThemeGroupWithCounts | null>(null);
  const [deleteTheme, setDeleteTheme] = useState<ThemeGroupWithCounts | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
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
        return { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
      case 'proposed':
        return { label: 'Proposed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'done':
        return { label: 'Done', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
      case 'cancelled':
        return { label: 'Inactive', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };
  
  const activeCount = themes.filter(t => t.status === 'active').length;
  const totalLinkedItems = themes.reduce((acc, t) => acc + t.epic_count + t.objective_count, 0);

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategic Themes</h1>
            <p className="text-muted-foreground mt-2">
              Manage strategic theme configurations and linked items
            </p>
          </div>
          <Button 
            className="bg-brand-primary hover:bg-brand-primary-hover"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Theme
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{themes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Linked Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLinkedItems}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Theme Configuration</CardTitle>
            <CardDescription>
              Configure themes for strategic organization. Toggle status or manage linked items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search themes..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Failed to load themes. Please try again.
              </div>
            ) : themes.length === 0 ? (
              <AdminEmptyState sectionType="theme-groups" onAction={() => setShowCreateDialog(true)} />
            ) : (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Theme Name</th>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-left p-3 text-sm font-medium">Linked Items</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-center p-3 text-sm font-medium">Active</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredThemes.map((theme) => {
                      const statusDisplay = getStatusDisplay(theme.status);
                      const hasLinkedItems = theme.epic_count > 0 || theme.objective_count > 0;
                      
                      return (
                        <tr key={theme.id} className="border-t hover:bg-muted/50">
                          <td className="p-3 text-sm font-medium">
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
                          <td className="p-3 text-sm max-w-md truncate text-muted-foreground">
                            {theme.description || '—'}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              {theme.epic_count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {theme.epic_count} epic{theme.epic_count !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {theme.objective_count > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {theme.objective_count} obj.
                                </Badge>
                              )}
                              {!hasLinkedItems && (
                                <span className="text-muted-foreground text-xs">None</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusDisplay.color}`}>
                              {statusDisplay.label}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex">
                                    <Switch
                                      checked={theme.status === 'active'}
                                      onCheckedChange={() => handleToggleStatus(theme)}
                                      disabled={updateStatusMutation.isPending}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{theme.status === 'active' ? 'Set to inactive' : 'Set to active'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="p-3 text-sm text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditTheme(theme)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setDeleteTheme(theme)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {hasLinkedItems 
                                      ? 'Has linked items - will need reassignment'
                                      : 'Delete theme'
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
