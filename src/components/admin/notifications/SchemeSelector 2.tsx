/**
 * ═══════════════════════════════════════════════════════════════════
 * SchemeSelector — Dropdown for selecting/managing notification schemes
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
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
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              Global Defaults
            </span>
          </SelectItem>
          {schemes?.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-2">
                {s.is_default && <span className="h-2 w-2 rounded-full bg-[#2563EB]" />}
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
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setEditScheme(selectedScheme)}>
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              Edit Scheme
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClone(selectedScheme)}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Clone Scheme
            </DropdownMenuItem>
            {!selectedScheme.is_default && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(selectedScheme)}
                  className="text-[#DC2626] focus:text-[#DC2626]"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
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
        <Plus className="h-3.5 w-3.5 mr-1" />
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
