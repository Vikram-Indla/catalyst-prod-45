import { useState } from 'react';
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
  ArchiveRestore
} from 'lucide-react';
import { toast } from 'sonner';

// Source: Customize_Case_Priorities.doc
// Features:
// - Add new case priority
// - Edit case priority name
// - Reorder case priorities (drag/drop)
// - Archive case priorities
// - Delete case priority
// - Is Default toggle

interface CasePriority {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  isArchived: boolean;
}

const defaultPriorities: CasePriority[] = [
  { id: '1', name: 'Critical', order: 0, isDefault: false, isArchived: false },
  { id: '2', name: 'High', order: 1, isDefault: false, isArchived: false },
  { id: '3', name: 'Medium', order: 2, isDefault: true, isArchived: false },
  { id: '4', name: 'Low', order: 3, isDefault: false, isArchived: false },
];

export function CasePrioritiesSettings() {
  const [priorities, setPriorities] = useState<CasePriority[]>(defaultPriorities);
  const [isReordering, setIsReordering] = useState(false);
  const [editingPriority, setEditingPriority] = useState<CasePriority | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPriorityName, setNewPriorityName] = useState('');

  const activePriorities = priorities.filter(p => !p.isArchived);
  const archivedPriorities = priorities.filter(p => p.isArchived);

  const handleAddPriority = () => {
    if (!newPriorityName.trim()) {
      toast.error('Priority name is required');
      return;
    }

    const priority: CasePriority = {
      id: Date.now().toString(),
      name: newPriorityName,
      order: activePriorities.length,
      isDefault: false,
      isArchived: false,
    };

    setPriorities([...priorities, priority]);
    setNewPriorityName('');
    setIsAddDialogOpen(false);
    toast.success('Case priority added');
  };

  const handleUpdatePriority = () => {
    if (!editingPriority) return;

    setPriorities(priorities.map(p => 
      p.id === editingPriority.id ? editingPriority : p
    ));
    setEditingPriority(null);
    toast.success('Case priority updated');
  };

  const handleSetDefault = (id: string) => {
    setPriorities(priorities.map(p => ({
      ...p,
      isDefault: p.id === id,
    })));
    toast.success('Default priority updated');
  };

  const handleArchivePriority = (id: string) => {
    setPriorities(priorities.map(p => 
      p.id === id ? { ...p, isArchived: true, isDefault: false } : p
    ));
    toast.success('Priority archived');
  };

  const handleUnarchivePriority = (id: string) => {
    setPriorities(priorities.map(p => 
      p.id === id ? { ...p, isArchived: false } : p
    ));
    toast.success('Priority restored');
  };

  const handleDeletePriority = (id: string) => {
    const priority = priorities.find(p => p.id === id);
    if (!priority?.isArchived) {
      toast.error('Priority must be archived before deletion');
      return;
    }
    
    setPriorities(priorities.filter(p => p.id !== id));
    toast.success('Priority deleted');
  };

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
