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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
          <DialogDescription className="text-sm text-[#475569]">
            {isEdit
              ? 'Update the scheme name and settings.'
              : 'Create a new notification scheme that can be assigned to projects. Schemes define which triggers are active and their channel/recipient configurations.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="scheme-name" className="text-xs font-medium text-[rgba(237,237,237,0.93)]">
              Scheme Name
            </Label>
            <Input
              id="scheme-name"
              placeholder="e.g. Development Team, QA Team, Minimal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="scheme-desc" className="text-xs font-medium text-[rgba(237,237,237,0.93)]">
              Description
            </Label>
            <Textarea
              id="scheme-desc"
              placeholder="Describe what this scheme is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* Default toggle */}
          <div className="flex items-center justify-between rounded-md border border-[var(--bd-default, rgba(255,255,255,0.10))] px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-[rgba(237,237,237,0.93)]">Set as Default Scheme</p>
              <p className="text-[11px] text-[#475569] mt-0.5">
                New projects will automatically use this scheme.
              </p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
              className="data-[state=checked]:bg-[#2563EB]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending} className="text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm"
          >
            {isPending
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
                ? 'Save Changes'
                : 'Create Scheme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
