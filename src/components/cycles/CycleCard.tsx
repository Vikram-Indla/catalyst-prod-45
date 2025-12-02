/**
 * CATALYST TESTS - Cycle Card
 * Display cycle with progress, status, and context menu actions
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MoreVertical,
  Play,
  Edit,
  Copy,
  FolderInput,
  Archive,
  Trash2,
  Lock,
  Users,
} from 'lucide-react';
import { ScopeLockIndicator } from './ScopeLockIndicator';
import { CopyMoveModal } from './CopyMoveModal';
import { ArchiveModal } from './ArchiveModal';
import type { EnhancedTestCycle } from '@/types/cycleManagement';

interface CycleCardProps {
  cycle: EnhancedTestCycle;
  executionStats?: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    not_executed: number;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CycleCard({ cycle, executionStats, onEdit, onDelete }: CycleCardProps) {
  const navigate = useNavigate();
  const { programId } = useParams<{ programId: string }>();
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
      active: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-500' },
      completed: { label: 'Completed', className: 'bg-green-500/10 text-green-500' },
      on_hold: { label: 'On Hold', className: 'bg-orange-500/10 text-orange-500' },
    };
    return configs[status] || configs.not_started;
  };

  const statusConfig = getStatusConfig(cycle.status);
  
  const total = executionStats?.total || 0;
  const executed = total - (executionStats?.not_executed || 0);
  const passRate = executed > 0 
    ? Math.round((executionStats?.passed || 0) / executed * 100) 
    : 0;
  const progressPercent = total > 0 ? Math.round(executed / total * 100) : 0;

  const handleViewDetails = () => {
    navigate(`/programs/${programId}/tests/cycles/${cycle.id}`);
  };

  return (
    <>
      <Card className={`border-border hover:border-brand-gold/50 transition-colors ${cycle.archived ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">{cycle.key}</span>
                {cycle.archived && (
                  <Badge variant="outline" className="text-xs bg-muted">
                    Archived
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg text-foreground truncate">{cycle.name}</CardTitle>
              {cycle.objective && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cycle.objective}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleViewDetails}>
                    <Play className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Cycle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowCopyModal(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Cycle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowMoveModal(true)}>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowArchiveModal(true)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(cycle.start_date), 'MMM d')} - {format(new Date(cycle.end_date), 'MMM d, yyyy')}
              </span>
            </div>
            {cycle.environment && (
              <Badge variant="outline" className="text-xs capitalize">
                {cycle.environment}
              </Badge>
            )}
            {cycle.scope_locked && (
              <ScopeLockIndicator cycleId={cycle.id} isLocked={true} compact />
            )}
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {executed}/{total} executed ({progressPercent}%)
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              
              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-500">
                  ✓ {executionStats?.passed || 0} passed
                </span>
                <span className="text-destructive">
                  ✗ {executionStats?.failed || 0} failed
                </span>
                <span className="text-orange-500">
                  ⊘ {executionStats?.blocked || 0} blocked
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleViewDetails}
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      <CopyMoveModal
        open={showCopyModal}
        onOpenChange={setShowCopyModal}
        mode="copy"
        cycleId={cycle.id}
        cycleName={cycle.name}
      />

      <CopyMoveModal
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        mode="move"
        cycleId={cycle.id}
        cycleName={cycle.name}
      />

      <ArchiveModal
        open={showArchiveModal}
        onOpenChange={setShowArchiveModal}
        cycleIds={[cycle.id]}
        cycleNames={[cycle.name]}
      />
    </>
  );
}
