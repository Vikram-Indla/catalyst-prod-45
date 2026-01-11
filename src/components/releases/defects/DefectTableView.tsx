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
  onUpdateStatus: (defectId: string, status: Defect['status']) => void;
  onDelete: (defectId: string) => void;
}

export function DefectTableView({ defects, onUpdateStatus, onDelete }: DefectTableViewProps) {
  const navigate = useNavigate();

  const avatarColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Release</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Linked Test</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Assignee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reporter</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {defects.map(defect => (
              <tr 
                key={defect.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/releases/defects/${defect.id}`)}
              >
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <Checkbox />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-red-600">{defect.id}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{defect.title}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={defect.severity} />
                </td>
                <td className="px-4 py-3">
                  <DefectStatusBadge status={defect.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{defect.releaseId}</td>
                <td className="px-4 py-3">
                  {defect.linkedTestId ? (
                    <span className="text-sm text-primary hover:underline">{defect.linkedTestId}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[defect.assignee.color]
                    )}>
                      {defect.assignee.initials}
                    </div>
                    <span className="text-sm text-gray-600">{defect.assignee.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[defect.reporter.color]
                    )}>
                      {defect.reporter.initials}
                    </div>
                    <span className="text-sm text-gray-600">{defect.reporter.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{defect.createdAt}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
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
          <p className="text-gray-500">No defects found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
