import { Button } from '@/components/ui/button';
import { Download, Settings2, Edit3 } from 'lucide-react';

interface ListScreenToolbarProps {
  onColumnChooser?: () => void;
  onBulkEdit?: () => void;
  onExport?: () => void;
  selectedCount?: number;
}

export function ListScreenToolbar({ 
  onColumnChooser, 
  onBulkEdit, 
  onExport,
  selectedCount = 0 
}: ListScreenToolbarProps) {
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
        {onBulkEdit && (
          <Button variant="outline" size="sm" onClick={onBulkEdit} disabled={selectedCount === 0}>
            <Edit3 className="h-4 w-4 mr-2" />
            Bulk Edit
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
