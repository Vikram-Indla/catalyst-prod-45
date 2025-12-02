import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTestCaseStatuses, type TestCaseStatus } from '@/hooks/useTestSettings';

// Source: Customize_Case_Statuses.doc
// Case status options per documentation:
// - Viewable by Owner only
// - Eligible for Cycle and Set addition
// - Eligible for Linked Step

export function CaseStatusesSettings() {
  const { programId } = useParams();
  const { statuses, isLoading, createStatus, updateStatus, deleteStatus, isCreating, isUpdating } = useTestCaseStatuses(programId);
  
  const [editingStatus, setEditingStatus] = useState<TestCaseStatus | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: '',
    viewable_by_owner_only: false,
    eligible_for_cycle_set: true,
    eligible_for_linked_step: true,
  });

  const handleAddStatus = () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }
    
    createStatus({
      name: newStatus.name,
      viewable_by_owner_only: newStatus.viewable_by_owner_only,
      eligible_for_cycle_set: newStatus.eligible_for_cycle_set,
      eligible_for_linked_step: newStatus.eligible_for_linked_step,
      display_order: statuses.length,
      program_id: programId || null,
    }, {
      onSuccess: () => {
        toast.success('Status added');
        setIsAddDialogOpen(false);
        setNewStatus({ name: '', viewable_by_owner_only: false, eligible_for_cycle_set: true, eligible_for_linked_step: true });
      },
      onError: () => toast.error('Failed to add status'),
    });
  };

  const handleUpdateStatus = () => {
    if (!editingStatus) return;
    
    updateStatus({
      id: editingStatus.id,
      name: editingStatus.name,
      viewable_by_owner_only: editingStatus.viewable_by_owner_only,
      eligible_for_cycle_set: editingStatus.eligible_for_cycle_set,
      eligible_for_linked_step: editingStatus.eligible_for_linked_step,
    }, {
      onSuccess: () => {
        toast.success('Status updated');
        setEditingStatus(null);
      },
      onError: () => toast.error('Failed to update status'),
    });
  };

  const handleDeleteStatus = (status: TestCaseStatus) => {
    if (status.is_system) {
      toast.error('Cannot delete system status');
      return;
    }
    
    deleteStatus(status.id, {
      onSuccess: () => toast.success('Status deleted'),
      onError: () => toast.error('Failed to delete status'),
    });
  };

  const handleSetDefault = (status: TestCaseStatus) => {
    // First unset all defaults, then set new default
    statuses.forEach(s => {
      if (s.is_default && s.id !== status.id) {
        updateStatus({ id: s.id, is_default: false });
      }
    });
    updateStatus({ id: status.id, is_default: true }, {
      onSuccess: () => toast.success(`${status.name} set as default`),
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
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand-gold" />
              Case Statuses
            </CardTitle>
            <CardDescription>
              Configure test case statuses. Per Customize_Case_Statuses.doc specification.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Status
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {statuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center gap-4 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{status.name}</span>
                  {status.is_default && (
                    <span className="text-xs bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                  {status.is_system && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      System
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  {status.viewable_by_owner_only && <span>Owner only</span>}
                  {status.eligible_for_cycle_set && <span>Cycle/Set eligible</span>}
                  {status.eligible_for_linked_step && <span>Linked step eligible</span>}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!status.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(status)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingStatus(status)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!status.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteStatus(status)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Case Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Status Name</Label>
                <Input
                  id="name"
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                  placeholder="Enter status name"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ownerOnly">Viewable by Owner only</Label>
                  <Switch
                    id="ownerOnly"
                    checked={newStatus.viewable_by_owner_only}
                    onCheckedChange={(checked) => setNewStatus({ ...newStatus, viewable_by_owner_only: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cycleSet">Eligible for Cycle and Set addition</Label>
                  <Switch
                    id="cycleSet"
                    checked={newStatus.eligible_for_cycle_set}
                    onCheckedChange={(checked) => setNewStatus({ ...newStatus, eligible_for_cycle_set: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="linkedStep">Eligible for Linked Step</Label>
                  <Switch
                    id="linkedStep"
                    checked={newStatus.eligible_for_linked_step}
                    onCheckedChange={(checked) => setNewStatus({ ...newStatus, eligible_for_linked_step: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStatus} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Case Status</DialogTitle>
            </DialogHeader>
            {editingStatus && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Status Name</Label>
                  <Input
                    id="editName"
                    value={editingStatus.name}
                    onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Viewable by Owner only</Label>
                    <Switch
                      checked={editingStatus.viewable_by_owner_only}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, viewable_by_owner_only: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Eligible for Cycle and Set addition</Label>
                    <Switch
                      checked={editingStatus.eligible_for_cycle_set}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, eligible_for_cycle_set: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Eligible for Linked Step</Label>
                    <Switch
                      checked={editingStatus.eligible_for_linked_step}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, eligible_for_linked_step: checked })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStatus(null)}>Cancel</Button>
              <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
