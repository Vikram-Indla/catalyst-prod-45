import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  ProductRole, 
  useCreateRole, 
  useUpdateRole 
} from '@/hooks/useProductRoles';

interface AddEditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: ProductRole | null;
  onSuccess?: (role: ProductRole) => void;
}

export function AddEditRoleModal({ 
  isOpen, 
  onClose, 
  role,
  onSuccess 
}: AddEditRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const isEditing = !!role;
  const isPending = createRole.isPending || updateRole.isPending;

  // Reset form when modal opens/closes or role changes
  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
        setDescription(role.description || '');
        setIsActive(role.is_active);
      } else {
        setName('');
        setDescription('');
        setIsActive(true);
      }
      setErrors({});
    }
  }, [isOpen, role]);

  const validate = (): boolean => {
    const newErrors: { name?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (isEditing && role) {
        const updated = await updateRole.mutateAsync({
          id: role.id,
          name: name.trim(),
          description: description.trim(),
          is_active: isActive
        });
        onSuccess?.(updated);
      } else {
        const created = await createRole.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          is_active: isActive
        });
        onSuccess?.(created);
      }
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setIsActive(true);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Role' : 'Add New Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update role details. Permission changes are made in the matrix configuration.'
              : 'Create a new product role with default permissions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="role-name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({});
              }}
              placeholder="e.g. Business Analyst"
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's responsibilities..."
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="role-active">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Inactive roles cannot be assigned to users
              </p>
            </div>
            <Switch
              id="role-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending 
              ? (isEditing ? 'Saving...' : 'Creating...') 
              : (isEditing ? 'Save Changes' : 'Create Role')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
