/**
 * Version Card Component
 * Displays a single version with progress and actions
 */

import React from 'react';
import { 
  Package, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Archive,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Rocket,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { VersionWithProgress } from '../../hooks/useVersions';

interface VersionCardProps {
  version: VersionWithProgress;
  onEdit: (version: VersionWithProgress) => void;
  onRelease: (versionId: string) => void;
  onUnrelease: (versionId: string) => void;
  onArchive: (versionId: string) => void;
  onUnarchive: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onViewDetails: (versionId: string) => void;
}

function getVersionStatus(version: VersionWithProgress) {
  if (version.archived) {
    return { label: 'Archived', icon: Archive, colorClass: 'text-muted-foreground' };
  }
  if (version.released) {
    return { label: 'Released', icon: CheckCircle2, colorClass: 'text-green-600 dark:text-green-400' };
  }
  
  if (version.progress >= 75) {
    return { label: 'On Track', icon: Clock, colorClass: 'text-blue-600 dark:text-blue-400' };
  }
  if (version.progress >= 50) {
    return { label: 'In Progress', icon: Clock, colorClass: 'text-yellow-600 dark:text-yellow-400' };
  }
  return { label: 'At Risk', icon: AlertCircle, colorClass: 'text-orange-600 dark:text-orange-400' };
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function VersionCard({
  version,
  onEdit,
  onRelease,
  onUnrelease,
  onArchive,
  onUnarchive,
  onDelete,
  onViewDetails,
}: VersionCardProps) {
  const status = getVersionStatus(version);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {version.name}
                </h3>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs gap-1", status.colorClass)}
                >
                  <status.icon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              {version.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {version.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(version.id)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(version)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit version
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              {!version.released && !version.archived && (
                <DropdownMenuItem onClick={() => onRelease(version.id)}>
                  <Rocket className="h-4 w-4 mr-2" />
                  Release
                </DropdownMenuItem>
              )}
              
              {version.released && !version.archived && (
                <DropdownMenuItem onClick={() => onUnrelease(version.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Unrelease
                </DropdownMenuItem>
              )}
              
              {!version.archived ? (
                <DropdownMenuItem onClick={() => onArchive(version.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onUnarchive(version.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(version.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-6 mb-3 text-sm text-muted-foreground">
          {version.startDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Start: {formatDate(version.startDate)}</span>
            </div>
          )}
          {version.releaseDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Release: {formatDate(version.releaseDate)}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">{version.progress}%</span>
          </div>
          <Progress value={version.progress} className="h-2" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Done: {version.doneCount}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              In Progress: {version.inProgressCount}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              To Do: {version.toDoCount}
            </span>
            <span className="ml-auto">
              Total: {version.issueCount} issues
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
