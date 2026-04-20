// =====================================================
// DEFECT TABLE ROW
// Compact 44px row with inline actions
// =====================================================

import { formatDistanceToNowStrict } from 'date-fns';
import { MoreHorizontal, Ban, RotateCcw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DEFECT_SEVERITY_COLORS, DEFECT_STATUS_COLORS } from '@/lib/catalyst-colors';
import type { DefectSummary, DefectStatus } from '@/types/defect.types';
import { STATUS_CONFIG } from '@/types/defect.types';

interface DefectTableRowProps {
  defect: DefectSummary;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onClick: () => void;
  onStatusChange: (status: DefectStatus) => void;
}

export function DefectTableRow({
  defect,
  isSelected,
  isFocused,
  onSelect,
  onClick,
  onStatusChange,
}: DefectTableRowProps) {
  const severityColors = DEFECT_SEVERITY_COLORS[defect.severity] || DEFECT_SEVERITY_COLORS.minor;
  const statusColors = DEFECT_STATUS_COLORS[defect.status] || DEFECT_STATUS_COLORS.open;
  const age = formatDistanceToNowStrict(new Date(defect.created_at), { addSuffix: false });

  return (
    <tr
      onClick={onClick}
      className={cn(
        "h-11 border-b border-slate-100 cursor-pointer transition-colors group",
        isSelected && "bg-blue-50",
        isFocused && "ring-2 ring-inset ring-blue-500",
        !isSelected && !isFocused && "hover:bg-slate-50"
      )}
    >
      {/* Checkbox */}
      <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </td>

      {/* ID */}
      <td className="w-28 px-3">
        <div className="flex items-center gap-1.5">
          {defect.jira_source && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-blue-600 text-white text-[8px] font-bold flex-shrink-0"
              title={`Jira: ${defect.jira_key}`}
            >
              J
            </span>
          )}
          <span className="font-mono text-xs font-semibold text-blue-600 hover:underline truncate">
            {defect.jira_source && defect.jira_key ? defect.jira_key : defect.defect_id}
          </span>
          {defect.jira_source && defect.external_url && (
            <a
              href={defect.external_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Open in Jira"
            >
              <ExternalLink className="h-3 w-3 text-slate-400 hover:text-blue-600" />
            </a>
          )}
        </div>
      </td>

      {/* Title */}
      <td className="px-3 max-w-xs">
        <div className="flex items-center gap-2">
          {defect.is_blocker && <Ban className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
          {defect.status === 'reopened' && <RotateCcw className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
          <span className="text-sm font-medium text-slate-900 truncate">{defect.title}</span>
        </div>
      </td>

      {/* Severity - Dot only */}
      <td className="w-24 px-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColors.dot }} />
          <span className="text-xs text-slate-600">{defect.severity}</span>
        </div>
      </td>

      {/* Status - Inline clickable */}
      <td className="w-28 px-3" onClick={(e) => e.stopPropagation()}>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: statusColors.bg,
            color: statusColors.text,
            border: `1px solid ${statusColors.border}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors.text }} />
          {STATUS_CONFIG[defect.status]?.label || defect.status}
        </button>
      </td>

      {/* Assignee */}
      <td className="w-32 px-3">
        {defect.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar src={defect.assignee.avatar_url || undefined} name={defect.assignee.full_name} size="xsmall" />
            <span className="text-xs text-slate-600 truncate">
              {defect.assignee.full_name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Unassigned</span>
        )}
      </td>

      {/* Component */}
      <td className="w-24 px-3">
        <span className="text-xs text-slate-500 truncate">{defect.component || '—'}</span>
      </td>

      {/* Age */}
      <td className="w-20 px-3">
        <span className="text-xs text-slate-500">{age}</span>
      </td>

      {/* Actions */}
      <td className="w-12 px-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Copy ID</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
