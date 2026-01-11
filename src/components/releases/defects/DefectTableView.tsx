import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Eye, Pencil, UserPlus, CheckCircle, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SeverityBadge } from "./SeverityBadge";
import { DefectStatusBadge } from "./DefectStatusBadge";
import { Defect } from "@/data/defectsData";
import { cn } from "@/lib/utils";

interface DefectTableViewProps {
  defects: Defect[];
  onUpdateStatus: (defectId: string, status: string) => void;
  onDelete: (defectId: string) => void;
}

export function DefectTableView({ defects, onUpdateStatus, onDelete }: DefectTableViewProps) {
  const navigate = useNavigate();

  const avatarColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-amber-100 text-amber-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-teal-100 text-teal-700', // Map green to teal for V5 compliance
    gray: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Release</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked Test</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reporter</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {defects.map(defect => (
              <tr 
                key={defect.id} 
                className="hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/releases/defects/${defect.id}`)}
              >
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <Checkbox />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-primary">{defect.id}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <p className="font-medium text-foreground truncate">{defect.title}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={defect.severity} />
                </td>
                <td className="px-4 py-3">
                  <DefectStatusBadge status={defect.status} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{defect.releaseId}</td>
                <td className="px-4 py-3">
                  {defect.linkedTestId ? (
                    <span className="text-sm text-primary hover:underline">{defect.linkedTestId}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[defect.assignee.color] || avatarColors.gray
                    )}>
                      {defect.assignee.initials}
                    </div>
                    <span className="text-sm text-muted-foreground">{defect.assignee.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[defect.reporter.color] || avatarColors.gray
                    )}>
                      {defect.reporter.initials}
                    </div>
                    <span className="text-sm text-muted-foreground">{defect.reporter.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{defect.createdAt}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => navigate(`/releases/defects/${defect.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="w-4 h-4 mr-2" /> Reassign
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onUpdateStatus(defect.id, 'resolved')}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(defect.id, 'closed')}>
                        <Archive className="w-4 h-4 mr-2" /> Close
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => onDelete(defect.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {defects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No defects found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
