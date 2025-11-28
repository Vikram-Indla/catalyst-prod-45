import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  MessageSquare,
  Bell,
  GitBranch,
  Users,
  Search,
  FileText,
  Network,
  History,
  Link,
  Archive,
  Split,
  Trash2,
  Ban,
  Copy,
  Trello,
  Calendar,
  Grid3x3,
} from 'lucide-react';

interface EpicsAdditionalOptionsMenuProps {
  epicId: string;
  onDiscussions: () => void;
  onSubscribe: () => void;
  onUpdateChildSteps: () => void;
  onResponsibilityMatrix: () => void;
  onTrace: () => void;
  onStatusReport: () => void;
  onRequirementHierarchy: () => void;
  onAuditLog: () => void;
  onLinks: () => void;
  onDrop: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onAddToKanban: () => void;
  onEpicPlanning: () => void;
  onWorkTree: () => void;
}

export function EpicsAdditionalOptionsMenu({
  onDiscussions,
  onSubscribe,
  onUpdateChildSteps,
  onResponsibilityMatrix,
  onTrace,
  onStatusReport,
  onRequirementHierarchy,
  onAuditLog,
  onLinks,
  onDrop,
  onSplit,
  onDelete,
  onCancel,
  onCopy,
  onAddToKanban,
  onEpicPlanning,
  onWorkTree,
}: EpicsAdditionalOptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDiscussions}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Discussions
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSubscribe}>
          <Bell className="h-4 w-4 mr-2" />
          Subscribe
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onUpdateChildSteps}>
          <GitBranch className="h-4 w-4 mr-2" />
          Update Child Process Steps
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResponsibilityMatrix}>
          <Users className="h-4 w-4 mr-2" />
          Responsibility Matrix
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onTrace}>
          <Search className="h-4 w-4 mr-2" />
          Trace This Epic
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onStatusReport}>
          <FileText className="h-4 w-4 mr-2" />
          Status Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRequirementHierarchy}>
          <Network className="h-4 w-4 mr-2" />
          Requirement Hierarchy
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAuditLog}>
          <History className="h-4 w-4 mr-2" />
          Audit Log
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLinks}>
          <Link className="h-4 w-4 mr-2" />
          Links
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDrop}>
          <Archive className="h-4 w-4 mr-2" />
          Drop
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSplit}>
          <Split className="h-4 w-4 mr-2" />
          Split
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCancel}>
          <Ban className="h-4 w-4 mr-2" />
          Cancel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddToKanban}>
          <Trello className="h-4 w-4 mr-2" />
          Add to Kanban Board
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEpicPlanning}>
          <Calendar className="h-4 w-4 mr-2" />
          Epic Planning
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onWorkTree}>
          <Grid3x3 className="h-4 w-4 mr-2" />
          Work Tree
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
