/**
 * ═══════════════════════════════════════════════════════════════════
 * SchemeSelector — Dropdown for selecting/managing notification schemes
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import Button from '@atlaskit/button/new';
import AdsSelect from '@atlaskit/select';
import AddIcon from '@atlaskit/icon/core/add';
import CopyIcon from '@atlaskit/icon/core/copy';
import EditIcon from '@atlaskit/icon/core/edit';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import TrashIcon from '@atlaskit/icon/glyph/trash';
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
      <div style={{ minWidth: '200px' }}>
        <AdsSelect
          value={{
            label: selectedScheme?.name ?? 'Global Defaults',
            value: selectedSchemeId ?? 'global',
          }}
          options={[
            { label: 'Global Defaults', value: 'global' },
            ...(schemes?.map(s => ({ label: s.name, value: s.id })) || []),
          ]}
          placeholder="Select scheme..."
          onChange={(opt) => onSchemeChange(opt?.value === 'global' ? null : opt?.value ?? null)}
          isLoading={isLoading}
        />
      </div>

      {/* Actions for selected scheme */}
      {selectedScheme && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button appearance="default" iconBefore={ShowMoreHorizontalIcon} >{null}</Button>
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
                  className="text-[var(--ds-text-danger,var(--cp-danger, #DC2626))] focus:text-[var(--ds-text-danger,var(--cp-danger, #DC2626))]"
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
        appearance="default"
        onClick={() => setShowCreate(true)}
        iconBefore={AddIcon}
      >
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
