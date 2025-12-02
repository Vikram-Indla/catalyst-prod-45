import { useState } from 'react';
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
  ArrowUpDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Source: Customize_Case_Statuses.doc
// Case status options per documentation:
// - Viewable by Owner only
// - Eligible for Cycle and Set addition
// - Eligible for Linked Step

interface CaseStatus {
  id: string;
  name: string;
  viewableByOwnerOnly: boolean;
  eligibleForCycleSet: boolean;
  eligibleForLinkedStep: boolean;
  order: number;
  isDefault: boolean;
}

const defaultStatuses: CaseStatus[] = [
  { id: '1', name: 'Draft', viewableByOwnerOnly: true, eligibleForCycleSet: false, eligibleForLinkedStep: false, order: 0, isDefault: true },
  { id: '2', name: 'Under Review', viewableByOwnerOnly: false, eligibleForCycleSet: true, eligibleForLinkedStep: true, order: 1, isDefault: false },
  { id: '3', name: 'Published', viewableByOwnerOnly: false, eligibleForCycleSet: true, eligibleForLinkedStep: true, order: 2, isDefault: false },
  { id: '4', name: 'Deprecated', viewableByOwnerOnly: false, eligibleForCycleSet: false, eligibleForLinkedStep: false, order: 3, isDefault: false },
];

export function CaseStatusesSettings() {
  const [statuses, setStatuses] = useState<CaseStatus[]>(defaultStatuses);
  const [isReordering, setIsReordering] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CaseStatus | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: '',
    viewableByOwnerOnly: false,
    eligibleForCycleSet: true,
    eligibleForLinkedStep: true,
  });

  const handleAddStatus = () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }

    const status: CaseStatus = {
      id: Date.now().toString(),
      name: newStatus.name,
      viewableByOwnerOnly: newStatus.viewableByOwnerOnly,
      eligibleForCycleSet: newStatus.viewableByOwnerOnly ? false : newStatus.eligibleForCycleSet,
      eligibleForLinkedStep: newStatus.viewableByOwnerOnly ? false : newStatus.eligibleForLinkedStep,
      order: statuses.length,
      isDefault: false,
    };

    setStatuses([...statuses, status]);
    setNewStatus({ name: '', viewableByOwnerOnly: false, eligibleForCycleSet: true, eligibleForLinkedStep: true });
    setIsAddDialogOpen(false);
    toast.success('Case status added');
  };

  const handleUpdateStatus = () => {
    if (!editingStatus) return;

    setStatuses(statuses.map(s => 
      s.id === editingStatus.id ? editingStatus : s
    ));
    setEditingStatus(null);
    toast.success('Case status updated');
  };

  const handleDeleteStatus = (id: string) => {
    // Per docs: At least one status must be eligible for Cycle & Set addition and Linked Step
    const remaining = statuses.filter(s => s.id !== id);
    const hasEligibleStatus = remaining.some(s => s.eligibleForCycleSet && s.eligibleForLinkedStep);
    
    if (!hasEligibleStatus) {
      toast.error('At least one status must be eligible for Cycle & Set addition and Linked Step');
      return;
    }

    setStatuses(remaining);
    toast.success('Case status deleted');
  };

  const handleReorder = (dragIndex: number, dropIndex: number) => {
    const newStatuses = [...statuses];
    const [removed] = newStatuses.splice(dragIndex, 1);
    newStatuses.splice(dropIndex, 0, removed);
    
    // Update order values
    newStatuses.forEach((s, i) => s.order = i);
    setStatuses(newStatuses);
  };

  const toggleOwnerOnly = (checked: boolean) => {
    if (checked) {
      setNewStatus({
        ...newStatus,
        viewableByOwnerOnly: true,
        eligibleForCycleSet: false,
        eligibleForLinkedStep: false,
      });
    } else {
      setNewStatus({ ...newStatus, viewableByOwnerOnly: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Case Statuses</CardTitle>
            <CardDescription>
              Customize case statuses for your organization. Only admins can modify these settings.
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
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {isReordering && <th className="w-10 p-3"></th>}
                <th className="p-3 text-left text-sm font-medium">Status Name</th>
                <th className="p-3 text-center text-sm font-medium">Owner Only</th>
                <th className="p-3 text-center text-sm font-medium">Cycle/Set</th>
                <th className="p-3 text-center text-sm font-medium">Linked Step</th>
                <th className="p-3 text-center text-sm font-medium">Default</th>
                <th className="w-24 p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {statuses.sort((a, b) => a.order - b.order).map((status, index) => (
                <tr key={status.id} className="border-b last:border-0">
                  {isReordering && (
                    <td className="p-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </td>
                  )}
                  <td className="p-3 font-medium">{status.name}</td>
                  <td className="p-3 text-center">
                    {status.viewableByOwnerOnly ? (
                      <CheckCircle2 className="h-4 w-4 text-brand-gold mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {status.eligibleForCycleSet ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {status.eligibleForLinkedStep ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {status.isDefault && (
                      <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingStatus(status)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStatus(status.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            Status Rules
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• At least one status must be eligible for Cycle & Set addition and Linked Step</li>
            <li>• "Owner only" status makes cases invisible to other team members</li>
            <li>• The first status (#1) becomes the default for new cases</li>
          </ul>
        </div>
      </CardContent>

      {/* Add Status Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Case Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status Name</Label>
              <Input
                value={newStatus.name}
                onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                placeholder="Enter status name"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerOnly"
                  checked={newStatus.viewableByOwnerOnly}
                  onCheckedChange={(checked) => toggleOwnerOnly(checked as boolean)}
                />
                <Label htmlFor="ownerOnly">Viewable by Owner only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cycleSet"
                  checked={newStatus.eligibleForCycleSet}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, eligibleForCycleSet: checked as boolean })}
                  disabled={newStatus.viewableByOwnerOnly}
                />
                <Label htmlFor="cycleSet">Eligible for Cycle and Set addition</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="linkedStep"
                  checked={newStatus.eligibleForLinkedStep}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, eligibleForLinkedStep: checked as boolean })}
                  disabled={newStatus.viewableByOwnerOnly}
                />
                <Label htmlFor="linkedStep">Eligible for Linked Step</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStatus}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Case Status</DialogTitle>
          </DialogHeader>
          {editingStatus && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status Name</Label>
                <Input
                  value={editingStatus.name}
                  onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editingStatus.viewableByOwnerOnly}
                    onCheckedChange={(checked) => setEditingStatus({
                      ...editingStatus,
                      viewableByOwnerOnly: checked as boolean,
                      eligibleForCycleSet: checked ? false : editingStatus.eligibleForCycleSet,
                      eligibleForLinkedStep: checked ? false : editingStatus.eligibleForLinkedStep,
                    })}
                  />
                  <Label>Viewable by Owner only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editingStatus.eligibleForCycleSet}
                    onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, eligibleForCycleSet: checked as boolean })}
                    disabled={editingStatus.viewableByOwnerOnly}
                  />
                  <Label>Eligible for Cycle and Set addition</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editingStatus.eligibleForLinkedStep}
                    onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, eligibleForLinkedStep: checked as boolean })}
                    disabled={editingStatus.viewableByOwnerOnly}
                  />
                  <Label>Eligible for Linked Step</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
