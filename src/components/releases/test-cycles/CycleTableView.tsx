import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Play, Pencil, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const cycleStatusAppearance = (status: string): LozengeAppearance => {
  switch (status) {
    case 'active':
    case 'in_progress':
      return 'inprogress';
    case 'completed':
      return 'success';
    case 'paused':
      return 'moved';
    case 'aborted':
      return 'removed';
    case 'draft':
    case 'planned':
    case 'archived':
    default:
      return 'default';
  }
};

const envAppearance = (env: string): LozengeAppearance => {
  switch (env) {
    case 'production':
    case 'prod':
      return 'removed';
    case 'staging':
    case 'beta':
      return 'moved';
    case 'dev':
    case 'qa':
    case 'uat':
      return 'inprogress';
    default:
      return 'default';
  }
};

interface TestCycle {
  id: string;
  name: string;
  releaseId: string;
  releaseName?: string;
  environment: string;
  status: string;
  progress: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests?: number;
  pendingTests?: number;
  passRate?: number | null;
  duration?: string;
  assignee: {
    name: string;
    initials: string;
    color: string;
  };
  createdAt?: string;
  updatedAt?: string;
  _originalId?: string;
}

interface CycleTableViewProps {
  cycles: TestCycle[];
  onEdit: (cycle: TestCycle) => void;
  onDuplicate: (cycle: TestCycle) => void;
  onDelete: (cycleId: string) => void;
}

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
};

// Format date for display
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function CycleTableView({ cycles, onEdit, onDuplicate, onDelete }: CycleTableViewProps) {
  const navigate = useNavigate();

  const handleRowClick = (cycle: TestCycle) => {
    const id = cycle._originalId || cycle.id;
    navigate(`/testhub/cycles/${id}`);
  };

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cycle</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Release</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Environment</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Progress</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tests</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Pass Rate</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Assignee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Updated</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cycles.map(cycle => {
            // Pass rate display: show -% if null (no passed+failed), otherwise show %
            const passRateDisplay = cycle.passRate === null || cycle.passRate === undefined 
              ? '-%' 
              : `${cycle.passRate}%`;
            const passRateNum = typeof cycle.passRate === 'number' ? cycle.passRate : 0;
            
            return (
              <tr 
                key={cycle.id} 
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => handleRowClick(cycle)}
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="font-mono text-sm font-medium text-primary">{cycle.id}</span>
                    <p className="text-sm text-muted-foreground">{cycle.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {cycle.releaseName || cycle.releaseId || '-'}
                </td>
                <td className="px-4 py-3">
                  {cycle.environment ? (
                    <Lozenge appearance={envAppearance(cycle.environment)}>
                      {cycle.environment}
                    </Lozenge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Lozenge appearance={cycleStatusAppearance(cycle.status)}>
                    {cycle.status.replace('_', ' ')}
                  </Lozenge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${cycle.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{cycle.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">{cycle.passedTests}✓</span>
                    <span className="text-red-600">{cycle.failedTests}✗</span>
                    <span className="text-muted-foreground">/{cycle.totalTests}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-sm font-medium",
                    cycle.passRate === null || cycle.passRate === undefined ? "text-muted-foreground" :
                    passRateNum >= 90 ? "text-green-600" : 
                    passRateNum >= 70 ? "text-blue-600" : "text-red-600"
                  )}>
                    {passRateDisplay}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[cycle.assignee.color] || 'bg-blue-100 text-blue-700'
                    )}>
                      {cycle.assignee.initials}
                    </div>
                    <span className="text-sm text-muted-foreground">{cycle.assignee.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(cycle.updatedAt)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background">
                      <DropdownMenuItem onClick={() => handleRowClick(cycle)}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/testhub/cycles/${cycle._originalId || cycle.id}/execute`)}>
                        <Play className="w-4 h-4 mr-2" /> Start Execution
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(cycle)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(cycle)}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onDelete(cycle.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
