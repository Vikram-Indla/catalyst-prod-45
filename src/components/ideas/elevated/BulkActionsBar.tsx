// ============================================================
// BULK ACTIONS BAR - World Class Design
// ============================================================

import { Button } from "@/components/ui/button";
import { Zap, Link2, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  totalCount: number;
  selectedCount: number;
  onMarkQuickWin?: () => void;
  onLinkInitiative?: () => void;
  onDelete?: () => void;
  onClearSelection?: () => void;
  className?: string;
}

export function BulkActionsBar({ 
  totalCount, 
  selectedCount, 
  onMarkQuickWin, 
  onLinkInitiative,
  onDelete,
  onClearSelection,
  className 
}: BulkActionsBarProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-900">{totalCount}</span> ideas
      </span>
      
      {selectedCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-600">
            {selectedCount} selected
          </span>
          
          <div className="flex items-center gap-2">
            {onMarkQuickWin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onMarkQuickWin}
                className="gap-1.5 h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                <Zap className="w-3.5 h-3.5" />
                Mark as Quick Win
              </Button>
            )}
            
            {onLinkInitiative && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLinkInitiative}
                className="gap-1.5 h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
              >
                <Link2 className="w-3.5 h-3.5" />
                Link to Initiative
              </Button>
            )}
            
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="gap-1.5 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            )}
          </div>

          {onClearSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear selection
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
