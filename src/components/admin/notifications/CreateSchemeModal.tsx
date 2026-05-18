/**
 * ═══════════════════════════════════════════════════════════════════
 * CreateSchemeModal — Create or edit a notification scheme
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
import { useCreateScheme, useUpdateScheme } from '@/hooks/useNotificationSchemes';
import type { NotificationScheme } from '@/types/notification-triggers';

interface CreateSchemeModalProps {
  scheme: NotificationScheme | null;
  open: boolean;
  onClose: () => void;
  onCreated: (scheme: NotificationScheme) => void;
}

export function CreateSchemeModal({ scheme, open, onClose, onCreated }: CreateSchemeModalProps) {
  const isEdit = !!scheme;
  const createScheme = useCreateScheme();
  const updateScheme = useUpdateScheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Populate fields when editing
  useEffect(() => {
    if (scheme) {
      setName(scheme.name);
      setDescription(scheme.description || '');
      setIsDefault(scheme.is_default);
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
    }
  }, [scheme]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (isEdit && scheme) {
      updateScheme.mutate(
        {
          id: scheme.id,
          input: {
            name: name.trim(),
            description: description.trim() || undefined,
            is_default: isDefault,
          },
        },
        {
          onSuccess: (data) => {
            onCreated(data);
          },
        }
      );
    } else {
      createScheme.mutate(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          is_default: isDefault,
        },
        {
          onSuccess: (data) => {
            onCreated(data);
          },
        }
      );
    }
  };

  const isPending = createScheme.isPending || updateScheme.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold font-['Sora']">
            {isEdit ? 'Edit Notification Scheme' : 'Create Notification Scheme'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--ds-text-subtle,#475569)]">
            {isEdit
              ? 'Update the scheme name and settings.'
              : 'Create a new notification scheme that can be assigned to projects. Schemes define which triggers are active and their channel/recipient configurations.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="scheme-name" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
              Scheme Name
            </label>
            <Textfield
              id="scheme-name"
              placeholder="e.g. Development Team, QA Team, Minimal..."
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="scheme-desc" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
              Description
            </label>
            <TextArea
              id="scheme-desc"
              placeholder="Describe what this scheme is for..."
              value={description}
              onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              minimumRows={3}
            />
          </div>

          {/* Default toggle */}
          <div className="flex items-center justify-between rounded-md border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))] px-3 py-2.5">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Set as Default Scheme</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                New projects will automatically use this scheme.
              </p>
            </div>
            <Toggle
              isChecked={isDefault}
              onChange={() => setIsDefault(v => !v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={onClose} isDisabled={isPending}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSubmit}
            isDisabled={!name.trim() || isPending}
          >
            {isPending
              ? isEdit ? 'Saving...' : 'Creating...'
              : isEdit ? 'Save Changes' : 'Create Scheme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
