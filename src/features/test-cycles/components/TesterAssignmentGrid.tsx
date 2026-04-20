// ============================================================================
// TesterAssignmentGrid - Manage testers assigned to cycle
// ============================================================================

import { memo, useState, useMemo } from 'react';
import { Plus, Trash2, Users, Loader2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lozenge } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CycleAssignment, CycleRole } from '../types/cycle-config';
import { CYCLE_ROLE_CONFIG } from '../types/cycle-config';
import { useCycleAssignments } from '../hooks/useCycleAssignments';

interface TesterAssignmentGridProps {
  cycleId: string;
  assignments: CycleAssignment[];
  className?: string;
}

export const TesterAssignmentGrid = memo(function TesterAssignmentGrid({
  cycleId,
  assignments,
  className,
}: TesterAssignmentGridProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CycleRole>('tester');

  const {
    availableUsers,
    isLoadingUsers,
    assignTester,
    removeTester,
    updateTesterRole,
    isLoading,
  } = useCycleAssignments(cycleId);

  // Filter out already assigned users
  const unassignedUsers = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.user_id));
    return availableUsers.filter((u) => !assignedIds.has(u.id));
  }, [availableUsers, assignments]);

  const handleAssign = () => {
    if (!selectedUserId) return;
    assignTester.mutate(
      { userId: selectedUserId, role: selectedRole },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setSelectedUserId('');
          setSelectedRole('tester');
        },
      }
    );
  };

  const handleRemove = () => {
    if (!removeConfirm) return;
    removeTester.mutate(removeConfirm, {
      onSuccess: () => setRemoveConfirm(null),
    });
  };

  const handleRoleChange = (userId: string, role: CycleRole) => {
    updateTesterRole.mutate({ userId, role });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('bg-card rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team ({assignments.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Assign
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No testers assigned</p>
          <p className="text-xs">Assign team members to this cycle</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const workload = assignment.workload;
            const completionRate =
              workload.assigned > 0
                ? Math.round((workload.completed / workload.assigned) * 100)
                : 0;
            const passRate =
              workload.passed + workload.failed > 0
                ? Math.round((workload.passed / (workload.passed + workload.failed)) * 100)
                : 0;

            return (
              <div
                key={assignment.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={assignment.user_avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(assignment.user_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {assignment.user_name || 'Unknown User'}
                    </span>
                    <Select
                      value={assignment.role}
                      onValueChange={(value) =>
                        handleRoleChange(assignment.user_id, value as CycleRole)
                      }
                    >
                      <SelectTrigger className="h-6 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CYCLE_ROLE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Workload stats */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {workload.completed}/{workload.assigned} completed
                      </span>
                      <span className="font-medium">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-1.5" />
                  </div>

                  {/* Pass/Fail badges */}
                  {workload.assigned > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Lozenge appearance="success">
                        {`Passed ${workload.passed}`}
                      </Lozenge>
                      {workload.failed > 0 && (
                        <Lozenge appearance="removed">
                          {`Failed ${workload.failed}`}
                        </Lozenge>
                      )}
                      {passRate > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {passRate}% pass rate
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => setRemoveConfirm(assignment.user_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tester Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tester</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : unassignedUsers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      All team members are already assigned
                    </div>
                  ) : (
                    unassignedUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.full_name || user.email || 'Unknown'}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CycleRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CYCLE_ROLE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assignTester.isPending}
            >
              {assignTester.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tester?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unassign the tester from this cycle. Their test case assignments will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
