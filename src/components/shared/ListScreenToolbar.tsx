import { Button } from '@/components/ui/button';
import { Download, Upload, Settings2, Edit3 } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import type { Database } from '@/integrations/supabase/types';

type PermissionAction = Database['public']['Enums']['permission_action'];
type PermissionScope = Database['public']['Enums']['permission_scope'];

interface ListScreenToolbarProps {
  onColumnChooser?: () => void;
  onBulkEdit?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  selectedCount?: number;
  entityType?: string;
  requiredEditAction?: PermissionAction;
  requiredImportAction?: PermissionAction;
  scopeType?: PermissionScope;
  scopeId?: string;
}

export function ListScreenToolbar({ 
  onColumnChooser, 
  onBulkEdit, 
  onExport,
  onImport,
  selectedCount = 0,
  entityType,
  requiredEditAction = 'edit',
  requiredImportAction = 'create',
  scopeType = 'global',
  scopeId
}: ListScreenToolbarProps) {
  // Check permissions for bulk edit and import operations
  const { hasPermission: canBulkEdit } = usePermission(
    entityType || '',
    requiredEditAction,
    scopeType,
    scopeId
  );
  
  const { hasPermission: canImport } = usePermission(
    entityType || '',
    requiredImportAction,
    scopeType,
    scopeId
  );

  // If no entityType is provided, show all buttons (backward compatibility)
  const shouldShowBulkEdit = !entityType || canBulkEdit;
  const shouldShowImport = !entityType || canImport;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onBulkEdit && shouldShowBulkEdit && (
          <Button variant="outline" size="sm" onClick={onBulkEdit} disabled={selectedCount === 0}>
            <Edit3 className="h-4 w-4 mr-2" />
            Bulk Edit
          </Button>
        )}
        
        {onImport && shouldShowImport && (
          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
        
        {onColumnChooser && (
          <Button variant="outline" size="sm" onClick={onColumnChooser}>
            <Settings2 className="h-4 w-4 mr-2" />
            Columns
          </Button>
        )}
        
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
