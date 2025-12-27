import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Play, Archive, Trash2, Calendar, Clock, Layers, Users, Pencil, Settings, CalendarRange } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { RenameSnapshotModal } from './RenameSnapshotModal';
import { EditSnapshotDetailsModal } from './EditSnapshotDetailsModal';
import { ManageQuartersDrawer } from './ManageQuartersDrawer';
import { ActivateSnapshotModal } from './ActivateSnapshotModal';
import { ArchiveSnapshotModal } from './ArchiveSnapshotModal';

interface SnapshotCardProps {
  snapshot: StrategicSnapshot;
  onViewDetails: (snapshot: StrategicSnapshot) => void;
  onDelete: (snapshot: StrategicSnapshot) => void;
}

export function SnapshotCard({ snapshot, onViewDetails, onDelete }: SnapshotCardProps) {
  const navigate = useNavigate();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [manageQuartersOpen, setManageQuartersOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const { data: links } = useSnapshotStrategyLinks(snapshot.id);
  const { isAdmin } = useUserRole();

  const isArchived = snapshot.status === 'ARCHIVED';
  const isActive = snapshot.status === 'ACTIVE';
  const isDraft = snapshot.status === 'DRAFT';
  
  // Theme count from SnapshotStrategyLinks (primary) or configuration (fallback)
  const themeCount = links?.theme_ids?.length || configuration?.themes?.length || 0;
  const quarterCount = configuration?.quarters?.length || 0;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = () => {
    if (isActive) {
      return (
        <Badge className="bg-[rgba(13,148,136,0.1)] dark:bg-[rgba(13,148,136,0.15)] text-[#0d9488] dark:text-[#14b8a6] border border-[rgba(13,148,136,0.3)] text-[10px] font-semibold uppercase tracking-wider">
          ACTIVE
        </Badge>
      );
    }
    if (isArchived) {
      return (
        <Badge className="bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D] text-[10px] font-semibold uppercase tracking-wider">
          ARCHIVED
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D] text-[10px] font-semibold uppercase tracking-wider">
        DRAFT
      </Badge>
    );
  };

  return (
    <>
      <Card 
        className={cn(
          "relative p-0 rounded-xl cursor-pointer transition-all duration-200",
          "bg-white dark:bg-[#161B22]",
          "border border-[#E1E4E8] dark:border-[#30363D]",
          "shadow-sm dark:shadow-none",
          "hover:shadow-md hover:border-[rgba(37,99,235,0.3)] dark:hover:border-[#3D444D]",
          isArchived && 'opacity-70',
          isActive && 'border-l-[3px] border-l-[#0d9488]'
        )}
        onClick={() => onViewDetails(snapshot)}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4">
          <div className="flex-1 min-w-0 pr-2">
            <CardTitle className="text-base font-semibold truncate text-foreground">
              {snapshot.name}
            </CardTitle>
            <div className="mt-2">
              {getStatusBadge()}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-[400]">
              {!isArchived && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameModalOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditDetailsModalOpen(true); }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setManageQuartersOpen(true); }}>
                    <CalendarRange className="h-4 w-4 mr-2" />
                    Manage quarters
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(snapshot); }}>
                <Eye className="h-4 w-4 mr-2" />
                View details
              </DropdownMenuItem>
              
              {isDraft && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivateModalOpen(true); }}>
                  <Play className="h-4 w-4 mr-2" />
                  Activate snapshot
                </DropdownMenuItem>
              )}
              
              {!isArchived && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setArchiveModalOpen(true); }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive snapshot
                </DropdownMenuItem>
              )}
              
              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(snapshot); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {snapshot.description || 'No description'}
          </p>
          
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Created {formatDate(snapshot.created_at)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#EAECEF] dark:border-[#21262D]">
            <div className="flex items-center gap-1.5">
              <Layers className={cn("h-3.5 w-3.5", quarterCount === 0 ? "text-[#2563eb]" : "text-[#2563eb]")} />
              <span className={cn("text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]", quarterCount === 0 && "text-[#2563eb]")}>
                {quarterCount} Quarters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className={cn("h-3.5 w-3.5", themeCount === 0 ? "text-[#2563eb]" : "text-[#2563eb]")} />
              <span className={cn("text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]", themeCount === 0 && "text-[#2563eb]")}>
                {themeCount} Themes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <RenameSnapshotModal
        open={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        snapshot={snapshot}
      />

      <EditSnapshotDetailsModal
        open={editDetailsModalOpen}
        onClose={() => setEditDetailsModalOpen(false)}
        snapshot={snapshot}
      />

      <ManageQuartersDrawer
        open={manageQuartersOpen}
        onClose={() => setManageQuartersOpen(false)}
        snapshot={snapshot}
        isAdmin={isAdmin}
      />

      <ActivateSnapshotModal
        open={activateModalOpen}
        onClose={() => setActivateModalOpen(false)}
        snapshot={snapshot}
        onOpenQuarters={() => setManageQuartersOpen(true)}
      />

      <ArchiveSnapshotModal
        open={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        snapshot={snapshot}
      />
    </>
  );
}
