// Bulk Selection Toolbar - Shows when items are selected
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, ArrowRightLeft, Trash2, ChevronDown, X } from 'lucide-react';
import { BulkOperationType, BulkOperationConfig } from './types';

interface BulkSelectionToolbarProps {
  selectedCount: number;
  config: BulkOperationConfig;
  onAction: (action: BulkOperationType) => void;
  onClearSelection: () => void;
}

export function BulkSelectionToolbar({
  selectedCount,
  config,
  onAction,
  onClearSelection,
}: BulkSelectionToolbarProps) {
  if (selectedCount === 0) return null;

  const { allowedOperations, entityLabelPlural } = config;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg">
      <Badge variant="secondary" className="bg-brand-gold text-white text-sm px-3 py-1">
        {selectedCount} selected
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>

      <div className="h-4 w-px bg-border mx-2" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold/10">
            Bulk Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {allowedOperations.includes('edit') && (
            <DropdownMenuItem onClick={() => onAction('edit')} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Fields
              <span className="ml-auto text-xs text-muted-foreground">
                Update {selectedCount} {selectedCount === 1 ? config.entityLabel : entityLabelPlural}
              </span>
            </DropdownMenuItem>
          )}
          
          {allowedOperations.includes('transition') && (
            <DropdownMenuItem onClick={() => onAction('transition')} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Change Status
              <span className="ml-auto text-xs text-muted-foreground">
                Transition workflow
              </span>
            </DropdownMenuItem>
          )}
          
          {(allowedOperations.includes('edit') || allowedOperations.includes('transition')) && 
            allowedOperations.includes('delete') && <DropdownMenuSeparator />}
          
          {allowedOperations.includes('delete') && (
            <DropdownMenuItem 
              onClick={() => onAction('delete')} 
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
              <span className="ml-auto text-xs">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
