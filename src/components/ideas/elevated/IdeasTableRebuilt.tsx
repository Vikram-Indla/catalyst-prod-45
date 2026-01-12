// ============================================================
// IDEAS TABLE REBUILT - List View with Full Features
// ============================================================

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Zap, Box, ThumbsUp, ThumbsDown, Eye, MoreVertical, ArrowUpDown, Edit, Clipboard, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ImprovementIdea } from "@/types/improvement-ideas";

interface IdeasTableRebuiltProps {
  ideas: ImprovementIdea[];
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onSort?: (column: string) => void;
  onRowClick?: (idea: ImprovementIdea) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  triaged: "bg-indigo-100 text-indigo-700",
  scoring: "bg-purple-100 text-purple-700",
  quick_win_approved: "bg-emerald-100 text-emerald-700",
  approved: "bg-green-100 text-green-700",
  converted: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-700",
  deferred: "bg-slate-100 text-slate-600",
};

const typeConfig: Record<string, { icon: typeof Zap | null; label: string; colors: string }> = {
  quick_win: { icon: Zap, label: "Quick Win", colors: "bg-green-100 text-green-700" },
  strategic: { icon: Box, label: "Strategic", colors: "bg-blue-100 text-blue-600" },
  standard: { icon: null, label: "Standard", colors: "bg-slate-100 text-slate-600" }
};

const getInitials = (name: string) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
};

export function IdeasTableRebuilt({ 
  ideas, 
  selectedIds, 
  onSelect, 
  onSelectAll, 
  onSort,
  onRowClick,
  className 
}: IdeasTableRebuiltProps) {
  const allSelected = ideas.length > 0 && selectedIds.length === ideas.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < ideas.length;

  return (
    <Card className={cn("bg-white border-slate-200 overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as any).indeterminate = someSelected;
                }}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                className="h-4 w-4"
              />
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Idea</TableHead>
            <TableHead className="font-semibold text-slate-700 w-28">Type</TableHead>
            <TableHead className="font-semibold text-slate-700 w-28">Status</TableHead>
            <TableHead className="font-semibold text-slate-700 w-36">
              <button 
                onClick={() => onSort?.('impact')}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors"
              >
                IMPACT <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700 w-24">
              <button 
                onClick={() => onSort?.('votes')}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors"
              >
                Votes <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700 w-40">Submitter</TableHead>
            <TableHead className="font-semibold text-slate-700 w-24">Date</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map(idea => {
            const score = idea.impact_score?.calculated_score ?? 0;
            const displayScore = score > 5 ? score / 20 : score;
            const TypeIcon = typeConfig[idea.idea_type]?.icon;
            const submitterName = idea.is_anonymous 
              ? 'Anonymous' 
              : idea.submitter?.full_name || idea.submitter_name || 'Unknown';
            const isSelected = selectedIds.includes(idea.id);
            
            return (
              <TableRow 
                key={idea.id}
                onClick={() => onRowClick?.(idea)}
                className={cn(
                  "cursor-pointer hover:bg-slate-50 transition-colors",
                  isSelected && "bg-blue-50/50"
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(idea.id, !!checked)}
                    className="h-4 w-4"
                  />
                </TableCell>
                
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-900 text-sm line-clamp-1 hover:text-blue-600 transition-colors">
                      {idea.title}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{idea.code}</p>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium gap-1",
                      typeConfig[idea.idea_type]?.colors
                    )}
                  >
                    {TypeIcon && <TypeIcon className="w-3 h-3" />}
                    {typeConfig[idea.idea_type]?.label}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium capitalize",
                      statusColors[idea.status] || statusColors.submitted
                    )}
                  >
                    {idea.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          displayScore >= 4 ? "bg-emerald-500" :
                          displayScore >= 3 ? "bg-blue-500" :
                          displayScore >= 2 ? "bg-amber-500" :
                          "bg-slate-300"
                        )}
                        style={{ width: `${(displayScore / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-8 text-right">
                      {displayScore.toFixed(1)}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-medium text-slate-700">{idea.for_votes || 0}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                      <span className="font-medium text-slate-500">{idea.against_votes || 0}</span>
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                      {getInitials(submitterName)}
                    </div>
                    <span className="text-sm text-slate-600 truncate max-w-[100px]">
                      {submitterName}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell className="text-sm text-slate-500">
                  {format(new Date(idea.submitted_at || idea.created_at), 'MMM d')}
                </TableCell>
                
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white w-40">
                      <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                        <Eye className="w-4 h-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                        <Edit className="w-4 h-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                        <Clipboard className="w-4 h-4" /> Triage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
