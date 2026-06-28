import React, { useEffect, useState } from 'react';
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
import { ProductRole, useCreateRole, useUpdateRole } from '@/hooks/useProductRoles';

interface CreateEditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: ProductRole | null;
}

export function CreateEditRoleModal({ isOpen, onClose, role }: CreateEditRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const isEditing = !!role;
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const isPending = createRole.isPending || updateRole.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setIsActive(role?.is_active ?? true);
    setErrors({});
  }, [isOpen, role]);

  function validate(): boolean {
    const e: { name?: string } = {};
    if (!name.trim()) e.name = 'Role name is required';
    else if (name.trim().length < 2) e.name = 'At least 2 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || isPending) return;
    try {
      if (isEditing && role) {
        await updateRole.mutateAsync({ id: role.id, name: name.trim(), description: description.trim(), is_active: isActive });
      } else {
        await createRole.mutateAsync({ name: name.trim(), description: description.trim(), is_active: isActive });
      }
      onClose();
    } catch {
      // toast already fired by mutation onError
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit role' : 'Create role'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update role details. Permission changes are made in the permissions matrix.'
              : 'Define a new role. Permissions are assigned separately in the matrix.'}
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="rbac-role-name" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text)' }}>
              Role name <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
            </label>
            <Textfield
              id="rbac-role-name"
              value={name}
              onChange={(e) => { setName((e.target as HTMLInputElement).value); if (errors.name) setErrors({}); }}
              placeholder="e.g. Release Manager"
              isInvalid={!!errors.name}
            />
            {errors.name && <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-danger)' }}>{errors.name}</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="rbac-role-desc" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text)' }}>
              Description
            </label>
            <TextArea
              id="rbac-role-desc"
              value={description}
              onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Brief description of this role's responsibilities…"
              minimumRows={3}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--ds-border)', borderRadius: 4 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ds-text)' }}>Active</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ds-text-subtle)' }}>Inactive roles cannot be assigned</p>
            </div>
            <Toggle
              id="rbac-role-active"
              isChecked={isActive}
              onChange={() => setIsActive(v => !v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={onClose} isDisabled={isPending}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            isLoading={isPending}
            onClick={handleSave}
          >
            {isEditing ? 'Save changes' : 'Create role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
