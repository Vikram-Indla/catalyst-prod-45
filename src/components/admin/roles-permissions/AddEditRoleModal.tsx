import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
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
            <label htmlFor="role-name" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
              Role Name <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
            </label>
            <Textfield
              id="role-name"
              value={name}
              onChange={(e) => {
                setName((e.target as HTMLInputElement).value);
                if (errors.name) setErrors({});
              }}
              placeholder="e.g. Business Analyst"
              isDisabled={isPending}
              isInvalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="role-description" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Description</label>
            <TextArea
              id="role-description"
              value={description}
              onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Brief description of this role's responsibilities..."
              minimumRows={3}
              isDisabled={isPending}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--ds-border, #DCDFE4)' }}>
            <div className="space-y-0.5">
              <label htmlFor="role-active" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Active Status</label>
              <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                Inactive roles cannot be assigned to users
              </p>
            </div>
            <Toggle
              id="role-active"
              isChecked={isActive}
              onChange={() => setIsActive(v => !v)}
              isDisabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            appearance="default"
            onClick={handleCancel}
            isDisabled={isPending}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSubmit}
            isDisabled={isPending}
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
