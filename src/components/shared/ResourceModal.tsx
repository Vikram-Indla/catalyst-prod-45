import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductRoles } from '@/hooks/useProductRoles';
import { useCreateUser, CreateUserInput, useUpdateUserRoles } from '@/hooks/useUsers';
import { useCapacityDepartments, useResourceAssignments } from '@/modules/capacity-planner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ResourceCostSection } from '@/modules/budget';

export type ResourceModalMode = 'create' | 'edit';
export type ResourceModalContext = 'admin' | 'capacity';

export interface ResourceUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  roleIds?: string[];
  department?: string;
  department_id?: string;
  assignment_id?: string;
}

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ResourceModalMode;
  context: ResourceModalContext;
  user?: ResourceUser | null;
  /** List of users already added (for capacity planner add mode) */
  existingUserIds?: string[];
  /** Available users to select from (for capacity planner add mode) */
  availableUsers?: ResourceUser[];
}

export function ResourceModal({
  isOpen,
  onClose,
  mode,
  context,
  user,
  existingUserIds = [],
  availableUsers = [],
}: ResourceModalProps) {
  const queryClient = useQueryClient();
  
  // Form state for create mode
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Multi-select state for capacity planner add mode
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Common fields
  const [departmentId, setDepartmentId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState(100);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks
  const { roles, isLoading: rolesLoading } = useProductRoles();
  const createUser = useCreateUser();
  const updateUserRoles = useUpdateUserRoles();
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && user) {
        setEmail(user.email || '');
        setSelectedRoles(user.roleIds || []);
        setDepartmentId(user.department_id || '');
        setAssignmentId(user.assignment_id || '');
      } else {
        resetForm();
      }
    }
  }, [isOpen, mode, user]);

  // Set defaults for capacity context
  useEffect(() => {
    if (!isOpen || context !== 'capacity') return;
    
    if (!departmentId && departments?.length > 0) {
      const delivery = departments.find((d) => d.name?.toLowerCase() === 'delivery');
      if (delivery) setDepartmentId(delivery.id);
    }
    
    if (!assignmentId && resourceAssignments.length > 0) {
      const target = ['senaei bau', 'senai bau'];
      const defaultAssignment = resourceAssignments.find((a) =>
        target.includes(a.name?.toLowerCase().trim() || '')
      );
      if (defaultAssignment) setAssignmentId(defaultAssignment.id);
      else if (resourceAssignments[0]) setAssignmentId(resourceAssignments[0].id);
    }
  }, [isOpen, context, departments, resourceAssignments, departmentId, assignmentId]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setSelectedRoles([]);
    setSelectedUserIds([]);
    setDepartmentId('');
    setAssignmentId('');
    setAllocationPercentage(100);
    setError(null);
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (mode === 'create' && context === 'admin') {
      if (!firstName.trim()) errors.firstName = 'First name is required';
      if (!lastName.trim()) errors.lastName = 'Last name is required';
      if (!email.trim()) errors.email = 'Email is required';
      else if (!validateEmail(email)) errors.email = 'Please enter a valid email address';
      if (selectedRoles.length === 0) errors.roles = 'At least one role must be selected';
    }

    if (mode === 'create' && context === 'capacity') {
      if (selectedUserIds.length === 0) errors.users = 'Select at least one user';
      if (!assignmentId) errors.assignment = 'Assignment is required';
      if (!departmentId) errors.department = 'Department is required';
    }

    if (mode === 'edit') {
      if (selectedRoles.length === 0) errors.roles = 'At least one role must be selected';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
    if (fieldErrors.roles) {
      setFieldErrors(prev => ({ ...prev, roles: '' }));
    }
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (context === 'admin') {
        // Create new user via edge function
        const input: CreateUserInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          roleIds: selectedRoles,
        };
        await createUser.mutateAsync(input);
        toast.success('User created successfully');
      } else {
        // Capacity Planner: Add existing users to capacity planner
        const startDate = new Date().toISOString().split('T')[0];

        // Create assignments
        const { error: assignmentError } = await typedQuery('assignments').insert(
          selectedUserIds.map((userId) => ({
            user_id: userId,
            project_id: null,
            allocation_percentage: allocationPercentage,
            start_date: startDate,
            status: 'active',
            work_item_type: 'project',
          }))
        );
        if (assignmentError) throw assignmentError;

        // Update profiles with department
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ department_id: departmentId })
          .in('id', selectedUserIds);
        if (profileError) throw profileError;

        // Update/create resource_inventory entries
        for (const userId of selectedUserIds) {
          const userInfo = availableUsers.find(u => u.id === userId);
          const name = userInfo?.name || 'Unknown';

          const { data: updatedRows, error: updateError } = await supabase
            .from('resource_inventory')
            .update({ assignment_id: assignmentId, updated_at: new Date().toISOString() })
            .eq('profile_id', userId)
            .select('id');

          if (updateError) throw updateError;

          if (!updatedRows || updatedRows.length === 0) {
            const { error: insertError } = await supabase.from('resource_inventory').insert({
              profile_id: userId,
              name,
              assignment_id: assignmentId,
              is_active: true,
            });
            if (insertError) throw insertError;
          }
        }

        queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
        toast.success(`Added ${selectedUserIds.length} resource${selectedUserIds.length === 1 ? '' : 's'}`);
      }

      handleClose();
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred';
      if (errorMessage.includes('already exists')) {
        setError('A user with this email already exists.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm() || !user) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Update user roles
      await updateUserRoles.mutateAsync({
        userId: user.id,
        roleIds: selectedRoles,
      });

      // Update department and assignment if in capacity context
      if (context === 'capacity') {
        if (departmentId) {
          await supabase
            .from('profiles')
            .update({ department_id: departmentId, updated_at: new Date().toISOString() })
            .eq('id', user.id);
        }

        if (assignmentId) {
          const { data: existing } = await supabase
            .from('resource_inventory')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('resource_inventory')
              .update({ assignment_id: assignmentId, updated_at: new Date().toISOString() })
              .eq('profile_id', user.id);
          } else {
            await supabase.from('resource_inventory').insert({
              profile_id: user.id,
              name: user.name,
              assignment_id: assignmentId,
              is_active: true,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      }

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      handleSubmitCreate();
    } else {
      handleSubmitEdit();
    }
  };

  const dialogTitle = mode === 'create'
    ? context === 'admin' ? 'Add New User' : 'Add Resources to Capacity Planner'
    : 'Edit Resource';

  const dialogDescription = mode === 'create'
    ? context === 'admin' ? 'Create a new user account and assign roles.' : 'Select users to add to the capacity planner.'
    : 'Update resource details and roles.';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Create mode: Admin - First/Last/Email fields */}
          {mode === 'create' && context === 'admin' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' }));
                    }}
                    placeholder="Enter first name"
                    className={fieldErrors.firstName ? 'border-destructive' : ''}
                  />
                  {fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: '' }));
                    }}
                    placeholder="Enter last name"
                    className={fieldErrors.lastName ? 'border-destructive' : ''}
                  />
                  {fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  placeholder="Enter email address"
                  className={fieldErrors.email ? 'border-destructive' : ''}
                />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>
            </>
          )}

          {/* Create mode: Capacity - User selection list */}
          {mode === 'create' && context === 'capacity' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Users ({selectedUserIds.length} selected)</Label>
                {availableUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedUserIds.length === availableUsers.length) {
                        setSelectedUserIds([]);
                      } else {
                        setSelectedUserIds(availableUsers.map(u => u.id));
                      }
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedUserIds.length === availableUsers.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              <ScrollArea className={cn(
                "h-[200px] border rounded-lg",
                fieldErrors.users ? 'border-destructive' : 'border-border'
              )}>
                {availableUsers.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                    All users are already assigned to the Capacity Planner
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {availableUsers.map((availableUser) => {
                      const isSelected = selectedUserIds.includes(availableUser.id);
                      const initials = availableUser.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
                      const userRoles = roles?.filter(r => availableUser.roleIds?.includes(r.id));
                      const roleName = userRoles?.[0]?.name || availableUser.role || 'No role';

                      return (
                        <label
                          key={availableUser.id}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                            isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, availableUser.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter(id => id !== availableUser.id));
                              }
                              if (fieldErrors.users) setFieldErrors(prev => ({ ...prev, users: '' }));
                            }}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <div className="w-8 h-8 rounded-full bg-[#d4b896] flex items-center justify-center text-xs font-semibold text-[#4a3f35]">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{availableUser.name}</p>
                            {availableUser.email && (
                              <p className="text-[11px] text-muted-foreground/70 truncate">{availableUser.email}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">{roleName}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{availableUser.department || 'Unassigned'}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              {fieldErrors.users && <p className="text-xs text-destructive">{fieldErrors.users}</p>}
            </div>
          )}

          {/* Edit mode: Show email (read-only in capacity context) */}
          {mode === 'edit' && user && (
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={email}
                onChange={context === 'admin' ? (e) => setEmail(e.target.value) : undefined}
                readOnly={context === 'capacity'}
                disabled={context === 'capacity'}
                className={context === 'capacity' ? 'bg-muted cursor-not-allowed' : ''}
              />
            </div>
          )}

          {/* Product Roles selection - shown in create/admin and all edit modes */}
          {(mode === 'edit' || (mode === 'create' && context === 'admin')) && (
            <div className="space-y-2">
              <Label>Product Roles *</Label>
              <div className={cn(
                "border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto",
                fieldErrors.roles ? 'border-destructive' : ''
              )}>
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  roles?.map((role) => (
                    <div key={role.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`role-${role.id}`} className="text-sm font-medium cursor-pointer">
                          {role.name}
                        </label>
                        {role.description && (
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {fieldErrors.roles && <p className="text-xs text-destructive">{fieldErrors.roles}</p>}
            </div>
          )}

          {/* Capacity-specific fields: Assignment & Department */}
          {context === 'capacity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assignment {mode === 'create' ? '*' : ''}</Label>
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger className={fieldErrors.assignment ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select assignment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceAssignments.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.assignment && <p className="text-xs text-destructive">{fieldErrors.assignment}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Department {mode === 'create' ? '*' : ''}</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className={fieldErrors.department ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.department && <p className="text-xs text-destructive">{fieldErrors.department}</p>}
                </div>
              </div>

              {mode === 'create' && (
                <div className="space-y-2">
                  <Label>Allocation %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={allocationPercentage}
                    onChange={(e) => setAllocationPercentage(Number(e.target.value))}
                  />
                </div>
              )}
            </>
          )}

          {/* Resource Cost Section - only in edit mode */}
          {mode === 'edit' && user && (
            <ResourceCostSection resourceId={user.id} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary-hover"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : mode === 'create' ? (
                context === 'admin' ? 'Create User' : `Add ${selectedUserIds.length > 0 ? `${selectedUserIds.length} ` : ''}to Capacity Planner`
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
