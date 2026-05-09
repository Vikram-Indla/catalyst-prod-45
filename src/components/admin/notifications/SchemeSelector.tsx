/**
 * ═══════════════════════════════════════════════════════════════════
 * SchemeSelector — Dropdown for selecting/managing notification schemes
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
import AddIcon from '@atlaskit/icon/core/add';
import CopyIcon from '@atlaskit/icon/core/copy';
import EditIcon from '@atlaskit/icon/core/edit';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import TrashIcon from '@atlaskit/icon/glyph/trash';
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useSchemes,
  useDeleteScheme,
  useCloneScheme,
} from '@/hooks/useNotificationSchemes';
import { CreateSchemeModal } from './CreateSchemeModal';
import type { NotificationScheme } from '@/types/notification-triggers';

interface SchemeSelectorProps {
  selectedSchemeId: string | null;
  onSchemeChange: (schemeId: string | null) => void;
}

export function SchemeSelector({ selectedSchemeId, onSchemeChange }: SchemeSelectorProps) {
  const { data: schemes, isLoading } = useSchemes();
  const deleteScheme = useDeleteScheme();
  const cloneScheme = useCloneScheme();
  const [showCreate, setShowCreate] = useState(false);
  const [editScheme, setEditScheme] = useState<NotificationScheme | null>(null);

  const selectedScheme = schemes?.find((s) => s.id === selectedSchemeId) ?? null;

  const handleClone = (scheme: NotificationScheme) => {
    cloneScheme.mutate({
      sourceId: scheme.id,
      newName: `${scheme.name} (Copy)`,
    });
  };

  const handleDelete = (scheme: NotificationScheme) => {
    if (scheme.is_default) return;
    deleteScheme.mutate(scheme.id, {
      onSuccess: () => {
        if (selectedSchemeId === scheme.id) {
          onSchemeChange(null);
        }
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Scheme dropdown */}
      <Select
        value={selectedSchemeId ?? 'global'}
        onValueChange={(v) => onSchemeChange(v === 'global' ? null : v)}
      >
        <SelectTrigger className="w-[200px] h-9 text-sm">
          <SelectValue placeholder="Select scheme..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="global">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--ds-text-success,#16A34A)]" />
              Global Defaults
            </span>
          </SelectItem>
          {schemes?.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-2">
                {s.is_default && <span className="h-2 w-2 rounded-full bg-[var(--ds-text-brand,#2563EB)]" />}
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Actions for selected scheme */}
      {selectedScheme && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ShowMoreHorizontalIcon label="" size="small" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setEditScheme(selectedScheme)}>
              <EditIcon label="" size="small" />
              Edit Scheme
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClone(selectedScheme)}>
              <CopyIcon label="" size="small" />
              Clone Scheme
            </DropdownMenuItem>
            {!selectedScheme.is_default && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(selectedScheme)}
                  className="text-[var(--ds-text-danger,#DC2626)] focus:text-[var(--ds-text-danger,#DC2626)]"
                >
                  <TrashIcon label="" size="small" />
                  Delete Scheme
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Create new scheme button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-xs"
        onClick={() => setShowCreate(true)}
      >
        <AddIcon label="" size="small" />
        New Scheme
      </Button>

      {/* Create/Edit modal */}
      {(showCreate || editScheme) && (
        <CreateSchemeModal
          scheme={editScheme}
          open={showCreate || !!editScheme}
          onClose={() => {
            setShowCreate(false);
            setEditScheme(null);
          }}
          onCreated={(newScheme) => {
            onSchemeChange(newScheme.id);
            setShowCreate(false);
            setEditScheme(null);
          }}
        />
      )}
    </div>
  );
}
