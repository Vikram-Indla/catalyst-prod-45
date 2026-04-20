/**
 * Enterprise Defect Kanban View
 * 5-column configurable layout with 16 workflow statuses
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Settings, Eye, EyeOff, ChevronDown } from "lucide-react";
import { Lozenge } from "@/components/ads";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SeverityBadge } from "./SeverityBadge";
import { DefectStatusBadge } from "./DefectStatusBadge";
import { Defect } from "@/data/defectsData";
import { 
  DEFAULT_KANBAN_COLUMNS, 
  KanbanColumn as KanbanColumnType,
  getStatusesByColumn,
  WORKFLOW_COLORS,
  mapLegacyStatus
} from "@/config/defectWorkflow";
import { cn } from "@/lib/utils";

interface DefectKanbanViewProps {
  defects: Defect[];
  onUpdateStatus: (defectId: string, status: string) => void;
}

export function DefectKanbanView({ defects, onUpdateStatus }: DefectKanbanViewProps) {
  const [columns, setColumns] = useState(DEFAULT_KANBAN_COLUMNS);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  
  // Group defects by column based on their status
  const defectsByColumn = useMemo(() => {
    const grouped: Record<string, Defect[]> = {};
    
    columns.forEach(col => {
      grouped[col.id] = defects.filter(d => {
        const mappedStatus = mapLegacyStatus(d.status);
        return col.statuses.includes(mappedStatus);
      });
    });
    
    return grouped;
  }, [defects, columns]);
  
  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
    ));
  };
  
  const visibleColumns = columns.filter(c => c.isVisible);
  
  const columnHeaderColors: Record<string, string> = {
    gray: 'bg-gray-100 border-t-gray-400',
    blue: 'bg-blue-50 border-t-blue-500',
    teal: 'bg-teal-50 border-t-teal-500',
    green: 'bg-green-50 border-t-green-500',
    orange: 'bg-orange-50 border-t-orange-500',
    red: 'bg-red-50 border-t-red-500',
    amber: 'bg-amber-50 border-t-amber-500',
  };

  return (
    <div className="space-y-4">
      {/* Column Configuration Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {visibleColumns.length} of {columns.length} columns
        </div>
        
        <Popover open={showColumnConfig} onOpenChange={setShowColumnConfig}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Configure Columns
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-white dark:bg-[#1A1A1A]" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">Show/Hide Columns</p>
              {columns.map(col => (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleColumnVisibility(col.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      WORKFLOW_COLORS[col.color].solid
                    )} />
                    <span className="text-sm">{col.name}</span>
                    <Lozenge appearance="default">
                      {defectsByColumn[col.id]?.length || 0}
                    </Lozenge>
                  </div>
                  {col.isVisible ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Drag columns to reorder (coming in Phase 2)
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleColumns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            defects={defectsByColumn[column.id] || []}
            headerColorClass={columnHeaderColors[column.color]}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: KanbanColumnType;
  defects: Defect[];
  headerColorClass: string;
}

function KanbanColumn({ column, defects, headerColorClass }: KanbanColumnProps) {
  const statuses = getStatusesByColumn(column.id);
  
  // Group defects by status within column for sub-counts
  const defectsByStatus = useMemo(() => {
    const grouped: Record<string, Defect[]> = {};
    statuses.forEach(s => {
      grouped[s.id] = defects.filter(d => {
        const mappedStatus = mapLegacyStatus(d.status);
        return mappedStatus === s.id;
      });
    });
    return grouped;
  }, [defects, statuses]);
  
  return (
    <div className={cn(
      "flex-shrink-0 w-80 rounded-lg border-t-4",
      headerColorClass
    )}>
      {/* Column Header */}
      <div className="p-3 border-b border-gray-200 dark:border-[#2E2E2E] bg-white/50 dark:bg-[#1A1A1A]/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">{column.name}</h3>
          <Lozenge appearance="inprogress">{defects.length}</Lozenge>
        </div>
        
        {/* Sub-status counts */}
        {statuses.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {statuses.map(status => {
              const count = defectsByStatus[status.id]?.length || 0;
              if (count === 0) return null;
              return (
                <span
                  key={status.id}
                  className="text-[10px] text-muted-foreground bg-white dark:bg-[#1A1A1A] px-1.5 py-0.5 rounded"
                >
                  {status.name}: {count}
                </span>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto bg-gray-50/50">
        {defects.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No defects
          </div>
        ) : (
          defects.map(defect => (
            <DefectKanbanCard key={defect.id} defect={defect} />
          ))
        )}
      </div>
    </div>
  );
}

interface DefectKanbanCardProps {
  defect: Defect;
}

function DefectKanbanCard({ defect }: DefectKanbanCardProps) {
  const navigate = useNavigate();
  
  const avatarColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  
  return (
    <div 
      className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-3 hover:shadow-md cursor-pointer transition-all"
      onClick={() => navigate(`/releases/defects/${defect.id}`)}
    >
      {/* Header: ID + Severity */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-semibold text-blue-600">{defect.id}</span>
        <SeverityBadge severity={defect.severity} />
      </div>
      
      {/* Title */}
      <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{defect.title}</p>
      
      {/* Status Badge */}
      <div className="mb-2">
        <DefectStatusBadge status={defect.status} size="sm" />
      </div>
      
      {/* Release & Test */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <span>{defect.releaseId}</span>
        {defect.linkedTestId && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              <span>{defect.linkedTestId}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Footer: Assignee + Time */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
            avatarColors[defect.assignee.color] || avatarColors.gray
          )}>
            {defect.assignee.initials}
          </div>
          <span className="text-xs text-gray-500">{defect.assignee.name}</span>
        </div>
        <span className="text-xs text-gray-400">{defect.createdAt}</span>
      </div>
    </div>
  );
}
