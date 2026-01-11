import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "./SeverityBadge";
import { Defect } from "@/data/defectsData";
import { cn } from "@/lib/utils";

interface DefectKanbanViewProps {
  defects: Defect[];
  onUpdateStatus: (defectId: string, status: Defect['status']) => void;
}

interface GroupedDefects {
  open: Defect[];
  in_progress: Defect[];
  resolved: Defect[];
  closed: Defect[];
}

export function DefectKanbanView({ defects, onUpdateStatus }: DefectKanbanViewProps) {
  const groupedDefects: GroupedDefects = {
    open: defects.filter(d => d.status === 'open' || d.status === 'reopened'),
    in_progress: defects.filter(d => d.status === 'in_progress'),
    resolved: defects.filter(d => d.status === 'resolved'),
    closed: defects.filter(d => d.status === 'closed')
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <KanbanColumn 
        title="Open" 
        count={groupedDefects.open.length}
        color="red"
        defects={groupedDefects.open}
      />
      <KanbanColumn 
        title="In Progress" 
        count={groupedDefects.in_progress.length}
        color="blue"
        defects={groupedDefects.in_progress}
      />
      <KanbanColumn 
        title="Resolved" 
        count={groupedDefects.resolved.length}
        color="green"
        defects={groupedDefects.resolved}
      />
      <KanbanColumn 
        title="Closed" 
        count={groupedDefects.closed.length}
        color="gray"
        defects={groupedDefects.closed}
      />
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  count: number;
  color: 'red' | 'blue' | 'green' | 'gray';
  defects: Defect[];
}

function KanbanColumn({ title, count, color, defects }: KanbanColumnProps) {
  const colorStyles = {
    red: 'border-t-red-500',
    blue: 'border-t-blue-500',
    green: 'border-t-green-500',
    gray: 'border-t-gray-400'
  };
  
  return (
    <div className={cn(
      "flex-shrink-0 w-80 bg-gray-50 rounded-lg border-t-4",
      colorStyles[color]
    )}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </div>
      
      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
        {defects.map(defect => (
          <KanbanCard key={defect.id} defect={defect} />
        ))}
        {defects.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No defects
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  defect: Defect;
}

function KanbanCard({ defect }: KanbanCardProps) {
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
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md cursor-pointer transition-all"
      onClick={() => navigate(`/releases/defects/${defect.id}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-semibold text-red-600">{defect.id}</span>
        <SeverityBadge severity={defect.severity} />
      </div>
      
      {/* Title */}
      <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{defect.title}</p>
      
      {/* Release */}
      <div className="text-xs text-gray-500 mb-2">{defect.releaseId}</div>
      
      {/* Linked Test */}
      {defect.linkedTestId && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Link2 className="w-3 h-3" />
          <span>{defect.linkedTestId}</span>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
            avatarColors[defect.assignee.color]
          )}>
            {defect.assignee.initials}
          </div>
        </div>
        <span className="text-xs text-gray-400">{defect.createdAt}</span>
      </div>
    </div>
  );
}
