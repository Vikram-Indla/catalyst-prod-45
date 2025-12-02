import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Plus, 
  GripVertical, 
  Pencil, 
  Trash2, 
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTestCasePriorities, type TestCasePriority } from '@/hooks/useTestSettings';

// Source: Customize_Case_Priorities.doc

export function CasePrioritiesSettings() {
  const { programId } = useParams();
  const { priorities: dbPriorities, isLoading, createPriority, updatePriority, deletePriority } = useTestCasePriorities(programId);
  
  // Map DB format to local format for UI compatibility
  const priorities = dbPriorities.map(p => ({
    id: p.id,
    name: p.name,
    order: p.display_order,
    isDefault: p.is_default,
    isArchived: p.is_archived,
  }));
  const [isReordering, setIsReordering] = useState(false);
  const [editingPriority, setEditingPriority] = useState<{ id: string; name: string; order: number; isDefault: boolean; isArchived: boolean; } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPriorityName, setNewPriorityName] = useState('');

  const activePriorities = priorities.filter(p => !p.isArchived);
  const archivedPriorities = priorities.filter(p => p.isArchived);

  const handleAddPriority = () => {
    if (!newPriorityName.trim()) {
      toast.error('Priority name is required');
      return;
    }

    createPriority({
      name: newPriorityName,
      display_order: activePriorities.length,
      program_id: programId || null,
    }, {
      onSuccess: () => {
        setNewPriorityName('');
        setIsAddDialogOpen(false);
        toast.success('Case priority added');
      },
      onError: () => toast.error('Failed to add priority'),
    });
  };

  const handleUpdatePriority = () => {
    if (!editingPriority) return;
    updatePriority({ id: editingPriority.id, name: editingPriority.name }, {
      onSuccess: () => {
        setEditingPriority(null);
        toast.success('Case priority updated');
      },
      onError: () => toast.error('Failed to update priority'),
    });
  };

  const handleSetDefault = (id: string) => {
    // Unset other defaults first
    priorities.forEach(p => {
      if (p.isDefault && p.id !== id) {
        updatePriority({ id: p.id, is_default: false });
      }
    });
    updatePriority({ id, is_default: true }, {
      onSuccess: () => toast.success('Default priority updated'),
    });
  };

  const handleArchivePriority = (id: string) => {
    updatePriority({ id, is_archived: true, is_default: false }, {
      onSuccess: () => toast.success('Priority archived'),
    });
  };

  const handleUnarchivePriority = (id: string) => {
    updatePriority({ id, is_archived: false }, {
      onSuccess: () => toast.success('Priority restored'),
    });
  };

  const handleDeletePriority = (id: string) => {
    const priority = priorities.find(p => p.id === id);
    if (!priority?.isArchived) {
      toast.error('Priority must be archived before deletion');
      return;
    }
    
    deletePriority(id, {
      onSuccess: () => toast.success('Priority deleted'),
      onError: () => toast.error('Failed to delete priority'),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Case Priorities</CardTitle>
            <CardDescription>
              Customize case priorities for your organization. Only admins can modify these settings.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsReordering(!isReordering)}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {isReordering ? 'Done' : 'Reorder'}
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Active Priorities */}
          <div>
            <h4 className="font-medium mb-3">Active Priorities</h4>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {isReordering && <th className="w-10 p-3"></th>}
                    <th className="p-3 text-left text-sm font-medium">Priority Name</th>
                    <th className="p-3 text-center text-sm font-medium">Default</th>
                    <th className="w-32 p-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePriorities.sort((a, b) => a.order - b.order).map((priority) => (
                    <tr key={priority.id} className="border-b last:border-0">
                      {isReordering && (
                        <td className="p-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </td>
                      )}
                      <td className="p-3 font-medium">{priority.name}</td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={priority.isDefault}
                          onCheckedChange={() => handleSetDefault(priority.id)}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingPriority(priority)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchivePriority(priority.id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Archived Priorities */}
          <div>
            <h4 className="font-medium mb-3">Archived Priorities</h4>
            <div className="rounded-md border">
              {archivedPriorities.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No archived priorities
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Priority Name</th>
                      <th className="w-32 p-3 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedPriorities.map((priority) => (
                      <tr key={priority.id} className="border-b last:border-0">
                        <td className="p-3">
                          <span className="text-muted-foreground">{priority.name}</span>
                          <Badge variant="outline" className="ml-2">Archived</Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnarchivePriority(priority.id)}
                              title="Unarchive"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePriority(priority.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Archived priorities don't show in Priority dropdowns when creating/editing cases.
            </p>
          </div>
        </div>
      </CardContent>

      {/* Add Priority Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Case Priority</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Priority Name</Label>
              <Input
                value={newPriorityName}
                onChange={(e) => setNewPriorityName(e.target.value)}
                placeholder="Enter priority name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPriority}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Priority Dialog */}
      <Dialog open={!!editingPriority} onOpenChange={() => setEditingPriority(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Case Priority</DialogTitle>
          </DialogHeader>
          {editingPriority && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Priority Name</Label>
                <Input
                  value={editingPriority.name}
                  onChange={(e) => setEditingPriority({ ...editingPriority, name: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPriority(null)}>Cancel</Button>
            <Button onClick={handleUpdatePriority}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
