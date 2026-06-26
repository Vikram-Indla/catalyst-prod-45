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
import Tooltip from '@atlaskit/tooltip';
import { ProductRole } from '@/hooks/useProductRoles';

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
          {/* Role name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="rbac-role-name" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
              Role name <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
            </label>
            <Textfield
              id="rbac-role-name"
              value={name}
              onChange={(e) => { setName((e.target as HTMLInputElement).value); if (errors.name) setErrors({}); }}
              placeholder="e.g. Release Manager"
              isInvalid={!!errors.name}
            />
            {errors.name && <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)' }}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="rbac-role-desc" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
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

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: 4 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Active</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>Inactive roles cannot be assigned</p>
            </div>
            <Toggle
              id="rbac-role-active"
              isChecked={isActive}
              onChange={() => setIsActive(v => !v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={onClose}>
            Cancel
          </Button>
          <Tooltip content="Role creation coming soon" position="top">
            <Button
              appearance="primary"
              isDisabled
              onClick={() => { if (validate()) { /* Slice 2: wire mutation */ } }}
            >
              {isEditing ? 'Save changes' : 'Create role'}
            </Button>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
