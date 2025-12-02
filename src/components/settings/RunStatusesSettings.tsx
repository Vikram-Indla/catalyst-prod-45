import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Plus, 
  GripVertical, 
  Pencil, 
  Trash2, 
  ArrowUpDown,
  AlertCircle,
  Palette,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTestRunStatuses, type TestRunStatus } from '@/hooks/useTestSettings';

// Source: Run_Statuses.doc

type RunStatusType = 'NOT_RUN' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';

const typeColors: Record<RunStatusType, string> = {
  NOT_RUN: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  PASSED: 'bg-green-500',
  FAILED: 'bg-red-500',
  BLOCKED: 'bg-amber-500',
};

export function RunStatusesSettings() {
  const { programId } = useParams();
  const { statuses: dbStatuses, isLoading, createStatus, updateStatus, deleteStatus } = useTestRunStatuses(programId);
  
  // Map DB format to local format
  const statuses = dbStatuses.map(s => ({
    id: s.id,
    name: s.name,
    type: s.status_type as RunStatusType,
    highlightColor: s.highlight_color,
    executionCompleted: s.execution_completed,
    order: s.display_order,
    isSystem: s.is_system,
  }));
  
  type LocalRunStatus = typeof statuses[0] & { markedForDeletion?: boolean; alternativeStatusId?: string };
  
  const [isReordering, setIsReordering] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LocalRunStatus | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogStatus, setDeleteDialogStatus] = useState<LocalRunStatus | null>(null);
  const [alternativeStatusId, setAlternativeStatusId] = useState<string>('');
  const [newStatus, setNewStatus] = useState({
    name: '',
    type: 'NOT_RUN' as RunStatusType,
    highlightColor: '#6b7280',
    executionCompleted: false,
  });

  const handleAddStatus = () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }

    if (statuses.some(s => s.name.toLowerCase() === newStatus.name.toLowerCase())) {
      toast.error('A status with this name already exists');
      return;
    }

    createStatus({
      name: newStatus.name,
      status_type: newStatus.type,
      highlight_color: newStatus.highlightColor,
      execution_completed: newStatus.executionCompleted,
      display_order: statuses.length,
      program_id: programId || null,
    }, {
      onSuccess: () => {
        setNewStatus({ name: '', type: 'NOT_RUN', highlightColor: '#6b7280', executionCompleted: false });
        setIsAddDialogOpen(false);
        toast.success('Run status added');
      },
      onError: () => toast.error('Failed to add status'),
    });
  };

  const handleUpdateStatus = () => {
    if (!editingStatus) return;

    if (statuses.some(s => s.id !== editingStatus.id && s.name.toLowerCase() === editingStatus.name.toLowerCase())) {
      toast.error('A status with this name already exists');
      return;
    }

    updateStatus({
      id: editingStatus.id,
      name: editingStatus.name,
      highlight_color: editingStatus.highlightColor,
      execution_completed: editingStatus.executionCompleted,
    }, {
      onSuccess: () => {
        setEditingStatus(null);
        toast.success('Run status updated');
      },
      onError: () => toast.error('Failed to update status'),
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

  const validateDelete = (id: string): { valid: boolean; message?: string } => {
    const status = statuses.find(s => s.id === id);
    if (!status) return { valid: false, message: 'Status not found' };

    const remaining = statuses.filter(s => s.id !== id);
    
    // Per docs: At least one status of type NOT RUN, PASSED & FAILED should be present
    const hasNotRun = remaining.some(s => s.type === 'NOT_RUN');
    const hasPassed = remaining.some(s => s.type === 'PASSED');
    const hasFailed = remaining.some(s => s.type === 'FAILED');

    if (status.type === 'NOT_RUN' && !hasNotRun) {
      return { valid: false, message: 'At least one NOT RUN status must be present' };
    }
    if (status.type === 'PASSED' && !hasPassed) {
      return { valid: false, message: 'At least one PASSED status must be present' };
    }
    if (status.type === 'FAILED' && !hasFailed) {
      return { valid: false, message: 'At least one FAILED status must be present' };
    }

    return { valid: true };
  };

  const getAlternativeStatuses = (status: LocalRunStatus): LocalRunStatus[] => {
    if (status.type === 'PASSED') {
      return statuses.filter(s => s.id !== status.id && s.type === 'PASSED') as LocalRunStatus[];
    }
    if (status.type === 'FAILED') {
      return statuses.filter(s => s.id !== status.id && s.type === 'FAILED') as LocalRunStatus[];
    }
    return statuses.filter(s => 
      s.id !== status.id && 
      ['NOT_RUN', 'IN_PROGRESS', 'BLOCKED'].includes(s.type)
    ) as LocalRunStatus[];
  };

  const handleDeleteStatus = () => {
    if (!deleteDialogStatus || !alternativeStatusId) return;

    const validation = validateDelete(deleteDialogStatus.id);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    deleteStatus(deleteDialogStatus.id, {
      onSuccess: () => {
        setDeleteDialogStatus(null);
        setAlternativeStatusId('');
        toast.success('Status deleted');
      },
      onError: () => toast.error('Failed to delete status'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Run Statuses</CardTitle>
            <CardDescription>
              Customize run statuses for your organization. Only admins can modify these settings.
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
                <th className="p-3 text-center text-sm font-medium">Highlight Color</th>
                <th className="p-3 text-center text-sm font-medium">Type</th>
                <th className="p-3 text-center text-sm font-medium">Execution Completed</th>
                <th className="w-24 p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {statuses.sort((a, b) => a.order - b.order).map((status) => (
                <tr key={status.id} className="border-b last:border-0">
                  {isReordering && (
                    <td className="p-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </td>
                  )}
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {status.name}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: status.highlightColor }}
                      />
                      <span className="text-xs text-muted-foreground">{status.highlightColor}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={`${typeColors[status.type]} text-white`}>
                      {status.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    {status.executionCompleted ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500">
                        No
                      </Badge>
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
                        onClick={() => setDeleteDialogStatus(status)}
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
            <li>• At least one status of type NOT RUN, PASSED & FAILED must be present</li>
            <li>• First NOT RUN status is used as default for new runs in cycles</li>
            <li>• Status type cannot be changed after creation</li>
            <li>• Execution completed flag can only be updated for FAILED type statuses</li>
          </ul>
        </div>
      </CardContent>

      {/* Add Status Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Run Status</DialogTitle>
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
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newStatus.type}
                onValueChange={(value) => setNewStatus({ ...newStatus, type: value as RunStatusType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_RUN">Not Run</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="PASSED">Passed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Highlight Color
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={newStatus.highlightColor}
                  onChange={(e) => setNewStatus({ ...newStatus, highlightColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={newStatus.highlightColor}
                  onChange={(e) => setNewStatus({ ...newStatus, highlightColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Execution Completed</Label>
              <Switch
                checked={newStatus.executionCompleted}
                onCheckedChange={(checked) => setNewStatus({ ...newStatus, executionCompleted: checked })}
              />
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
            <DialogTitle>Edit Run Status</DialogTitle>
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
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editingStatus.type} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={editingStatus.type}>{editingStatus.type.replace('_', ' ')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Type cannot be changed after creation</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Highlight Color
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={editingStatus.highlightColor}
                    onChange={(e) => setEditingStatus({ ...editingStatus, highlightColor: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={editingStatus.highlightColor}
                    onChange={(e) => setEditingStatus({ ...editingStatus, highlightColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Execution Completed</Label>
                <Switch
                  checked={editingStatus.executionCompleted}
                  onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, executionCompleted: checked })}
                  disabled={editingStatus.type !== 'FAILED'}
                />
              </div>
              {editingStatus.type !== 'FAILED' && (
                <p className="text-xs text-muted-foreground">
                  Execution completed flag can only be changed for FAILED type statuses
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Status Dialog */}
      <Dialog open={!!deleteDialogStatus} onOpenChange={() => { setDeleteDialogStatus(null); setAlternativeStatusId(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Run Status</DialogTitle>
            <DialogDescription>
              Select an alternative status. All existing runs in this status will be moved to the alternative status.
            </DialogDescription>
          </DialogHeader>
          {deleteDialogStatus && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  Deleting: <strong>{deleteDialogStatus.name}</strong> ({deleteDialogStatus.type})
                </p>
              </div>
              <div className="space-y-2">
                <Label>Alternative Status</Label>
                <Select value={alternativeStatusId} onValueChange={setAlternativeStatusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select alternative status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAlternativeStatuses(deleteDialogStatus).map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name} ({status.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogStatus(null); setAlternativeStatusId(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStatus} disabled={!alternativeStatusId}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
