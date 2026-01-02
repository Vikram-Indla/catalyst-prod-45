import React, { useState } from 'react';
import { Plus, Trash2, Edit2, ArrowRight, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { StatusPill } from '../components/StatusPill';
import { toast } from 'sonner';

interface Status {
  id: string;
  name: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
}

interface Transition {
  id: string;
  name: string;
  fromStatusId: string | null;
  toStatusId: string;
  isGlobal: boolean;
  buttonText: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  statuses: Status[];
  transitions: Transition[];
}

// Mock data for the editor
const initialWorkflow: WorkflowData = {
  id: 'wf-1',
  name: 'Software Development Workflow',
  description: 'Standard workflow for development teams',
  isActive: true,
  statuses: [
    { id: 's-1', name: 'Backlog', category: 'todo', color: '#DFE1E6' },
    { id: 's-2', name: 'To Do', category: 'todo', color: '#DFE1E6' },
    { id: 's-3', name: 'In Progress', category: 'in_progress', color: '#0052CC' },
    { id: 's-4', name: 'In Review', category: 'in_progress', color: '#FF991F' },
    { id: 's-5', name: 'Done', category: 'done', color: '#36B37E' },
  ],
  transitions: [
    { id: 't-1', name: 'Start Progress', fromStatusId: 's-1', toStatusId: 's-3', isGlobal: false, buttonText: 'Start' },
    { id: 't-2', name: 'Start Progress', fromStatusId: 's-2', toStatusId: 's-3', isGlobal: false, buttonText: 'Start' },
    { id: 't-3', name: 'Submit for Review', fromStatusId: 's-3', toStatusId: 's-4', isGlobal: false, buttonText: 'Review' },
    { id: 't-4', name: 'Request Changes', fromStatusId: 's-4', toStatusId: 's-3', isGlobal: false, buttonText: 'Changes' },
    { id: 't-5', name: 'Approve', fromStatusId: 's-4', toStatusId: 's-5', isGlobal: false, buttonText: 'Done' },
    { id: 't-6', name: 'Reopen', fromStatusId: 's-5', toStatusId: 's-2', isGlobal: false, buttonText: 'Reopen' },
  ],
};

export function WorkflowEditor() {
  const [workflow, setWorkflow] = useState<WorkflowData>(initialWorkflow);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [editingTransition, setEditingTransition] = useState<Transition | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Status form state
  const [statusForm, setStatusForm] = useState<Partial<Status>>({});

  // Transition form state
  const [transitionForm, setTransitionForm] = useState<Partial<Transition>>({});

  const handleSave = () => {
    toast.success('Workflow saved successfully');
    setHasChanges(false);
  };

  const handleAddStatus = () => {
    setEditingStatus(null);
    setStatusForm({ category: 'todo', color: '#DFE1E6' });
    setIsStatusDialogOpen(true);
  };

  const handleEditStatus = (status: Status) => {
    setEditingStatus(status);
    setStatusForm(status);
    setIsStatusDialogOpen(true);
  };

  const handleSaveStatus = () => {
    if (!statusForm.name) {
      toast.error('Status name is required');
      return;
    }

    if (editingStatus) {
      setWorkflow(prev => ({
        ...prev,
        statuses: prev.statuses.map(s => 
          s.id === editingStatus.id ? { ...s, ...statusForm as Status } : s
        ),
      }));
    } else {
      const newStatus: Status = {
        id: `s-${Date.now()}`,
        name: statusForm.name!,
        category: statusForm.category || 'todo',
        color: statusForm.color || '#DFE1E6',
      };
      setWorkflow(prev => ({
        ...prev,
        statuses: [...prev.statuses, newStatus],
      }));
    }

    setIsStatusDialogOpen(false);
    setHasChanges(true);
    toast.success(editingStatus ? 'Status updated' : 'Status added');
  };

  const handleDeleteStatus = (statusId: string) => {
    // Check if status is used in transitions
    const usedInTransitions = workflow.transitions.some(
      t => t.fromStatusId === statusId || t.toStatusId === statusId
    );

    if (usedInTransitions) {
      toast.error('Cannot delete status: it is used in transitions');
      return;
    }

    setWorkflow(prev => ({
      ...prev,
      statuses: prev.statuses.filter(s => s.id !== statusId),
    }));
    setHasChanges(true);
    toast.success('Status deleted');
  };

  const handleAddTransition = () => {
    setEditingTransition(null);
    setTransitionForm({ isGlobal: false });
    setIsTransitionDialogOpen(true);
  };

  const handleEditTransition = (transition: Transition) => {
    setEditingTransition(transition);
    setTransitionForm(transition);
    setIsTransitionDialogOpen(true);
  };

  const handleSaveTransition = () => {
    if (!transitionForm.name || !transitionForm.toStatusId) {
      toast.error('Transition name and target status are required');
      return;
    }

    if (editingTransition) {
      setWorkflow(prev => ({
        ...prev,
        transitions: prev.transitions.map(t => 
          t.id === editingTransition.id ? { ...t, ...transitionForm as Transition } : t
        ),
      }));
    } else {
      const newTransition: Transition = {
        id: `t-${Date.now()}`,
        name: transitionForm.name!,
        fromStatusId: transitionForm.fromStatusId || null,
        toStatusId: transitionForm.toStatusId!,
        isGlobal: transitionForm.isGlobal || false,
        buttonText: transitionForm.buttonText || transitionForm.name!,
      };
      setWorkflow(prev => ({
        ...prev,
        transitions: [...prev.transitions, newTransition],
      }));
    }

    setIsTransitionDialogOpen(false);
    setHasChanges(true);
    toast.success(editingTransition ? 'Transition updated' : 'Transition added');
  };

  const handleDeleteTransition = (transitionId: string) => {
    setWorkflow(prev => ({
      ...prev,
      transitions: prev.transitions.filter(t => t.id !== transitionId),
    }));
    setHasChanges(true);
    toast.success('Transition deleted');
  };

  const getStatusName = (statusId: string | null) => {
    if (!statusId) return 'Any Status';
    const status = workflow.statuses.find(s => s.id === statusId);
    return status?.name || 'Unknown';
  };

  const getStatusById = (statusId: string | null): Status | undefined => {
    if (!statusId) return undefined;
    return workflow.statuses.find(s => s.id === statusId);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workflow.name}</h1>
          <p className="text-muted-foreground">{workflow.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={workflow.isActive}
              onCheckedChange={(checked) => {
                setWorkflow(prev => ({ ...prev, isActive: checked }));
                setHasChanges(true);
              }}
            />
            <Label>Active</Label>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            You have unsaved changes
          </span>
        </div>
      )}

      <Tabs defaultValue="statuses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="statuses">Statuses ({workflow.statuses.length})</TabsTrigger>
          <TabsTrigger value="transitions">Transitions ({workflow.transitions.length})</TabsTrigger>
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
        </TabsList>

        {/* Statuses Tab */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Statuses</CardTitle>
                <CardDescription>Define the states an issue can be in</CardDescription>
              </div>
              <Button onClick={handleAddStatus}>
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Transitions From</TableHead>
                    <TableHead>Transitions To</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.statuses.map((status) => {
                    const transitionsFrom = workflow.transitions.filter(t => t.fromStatusId === status.id);
                    const transitionsTo = workflow.transitions.filter(t => t.toStatusId === status.id);
                    
                    return (
                      <TableRow key={status.id}>
                        <TableCell>
                          <StatusPill
                            statusId={status.id}
                            statusName={status.name}
                            category={status.category}
                            color={status.color}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{status.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transitionsFrom.length} transition{transitionsFrom.length !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transitionsTo.length} transition{transitionsTo.length !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStatus(status)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStatus(status.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transitions Tab */}
        <TabsContent value="transitions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transitions</CardTitle>
                <CardDescription>Define how issues move between statuses</CardDescription>
              </div>
              <Button onClick={handleAddTransition}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transition
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.transitions.map((transition) => {
                    const fromStatus = getStatusById(transition.fromStatusId);
                    const toStatus = getStatusById(transition.toStatusId);
                    
                    return (
                      <TableRow key={transition.id}>
                        <TableCell className="font-medium">{transition.name}</TableCell>
                        <TableCell>
                          {fromStatus ? (
                            <StatusPill
                              statusId={fromStatus.id}
                              statusName={fromStatus.name}
                              category={fromStatus.category}
                              color={fromStatus.color}
                              size="sm"
                            />
                          ) : (
                            <Badge variant="outline">Any</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          {toStatus && (
                            <StatusPill
                              statusId={toStatus.id}
                              statusName={toStatus.name}
                              category={toStatus.category}
                              color={toStatus.color}
                              size="sm"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {transition.isGlobal ? (
                            <Badge>Global</Badge>
                          ) : (
                            <Badge variant="outline">Direct</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTransition(transition)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTransition(transition.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagram Tab */}
        <TabsContent value="diagram">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Diagram</CardTitle>
              <CardDescription>Visual representation of your workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-8 p-8 bg-muted/50 rounded-lg min-h-[400px]">
                {/* Simple visual representation */}
                {workflow.statuses.map((status) => {
                  const outgoing = workflow.transitions.filter(t => t.fromStatusId === status.id);
                  
                  return (
                    <div key={status.id} className="flex flex-col items-center gap-2">
                      <div
                        className="px-4 py-3 rounded-lg border-2 bg-background shadow-sm"
                        style={{ borderColor: status.color }}
                      >
                        <span className="font-medium">{status.name}</span>
                      </div>
                      {outgoing.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          → {outgoing.map(t => getStatusName(t.toStatusId)).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-muted border" />
                  <span>To Do</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Done</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Edit Status' : 'Add Status'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={statusForm.name || ''}
                onChange={(e) => setStatusForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., In Progress"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={statusForm.category}
                onValueChange={(value) => setStatusForm(prev => ({ 
                  ...prev, 
                  category: value as Status['category'] 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={statusForm.color || '#DFE1E6'}
                onChange={(e) => setStatusForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStatus}>
              {editingStatus ? 'Save Changes' : 'Add Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog open={isTransitionDialogOpen} onOpenChange={setIsTransitionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransition ? 'Edit Transition' : 'Add Transition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={transitionForm.name || ''}
                onChange={(e) => setTransitionForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Start Progress"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={transitionForm.buttonText || ''}
                onChange={(e) => setTransitionForm(prev => ({ ...prev, buttonText: e.target.value }))}
                placeholder="e.g., Start"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={transitionForm.isGlobal || false}
                onCheckedChange={(checked) => setTransitionForm(prev => ({ 
                  ...prev, 
                  isGlobal: checked,
                  fromStatusId: checked ? null : prev.fromStatusId,
                }))}
              />
              <Label>Global transition (available from any status)</Label>
            </div>
            {!transitionForm.isGlobal && (
              <div className="space-y-2">
                <Label>From Status</Label>
                <Select
                  value={transitionForm.fromStatusId || ''}
                  onValueChange={(value) => setTransitionForm(prev => ({ 
                    ...prev, 
                    fromStatusId: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source status" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflow.statuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>To Status</Label>
              <Select
                value={transitionForm.toStatusId || ''}
                onValueChange={(value) => setTransitionForm(prev => ({ 
                  ...prev, 
                  toStatusId: value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target status" />
                </SelectTrigger>
                <SelectContent>
                  {workflow.statuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransitionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransition}>
              {editingTransition ? 'Save Changes' : 'Add Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
