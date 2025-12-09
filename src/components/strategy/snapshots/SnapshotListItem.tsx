import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Play, Archive, Trash2, Calendar, Layers, Users, Pencil, Settings, CalendarRange } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { RenameSnapshotModal } from './RenameSnapshotModal';
import { EditSnapshotDetailsModal } from './EditSnapshotDetailsModal';
import { ManageQuartersDrawer } from './ManageQuartersDrawer';
import { ActivateSnapshotModal } from './ActivateSnapshotModal';
import { ArchiveSnapshotModal } from './ArchiveSnapshotModal';

interface SnapshotListItemProps {
  snapshot: StrategicSnapshot;
  onViewDetails: (snapshot: StrategicSnapshot) => void;
  onDelete: (snapshot: StrategicSnapshot) => void;
}

export function SnapshotListItem({ snapshot, onViewDetails, onDelete }: SnapshotListItemProps) {
  const navigate = useNavigate();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [manageQuartersOpen, setManageQuartersOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const { data: links } = useSnapshotStrategyLinks(snapshot.id);

  const isArchived = snapshot.status === 'ARCHIVED';
  const isActive = snapshot.status === 'ACTIVE';
  const isDraft = snapshot.status === 'DRAFT';

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

  const getStatusBadgeStyles = () => {
    if (isActive) return 'bg-brand-gold/10 text-brand-gold border-brand-gold/30';
    if (isArchived) return 'bg-muted text-muted-foreground border-muted';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-accent/50 cursor-pointer transition-colors',
          isArchived && 'opacity-70 bg-muted/30',
          isActive && 'ring-l-2 ring-brand-gold/30 bg-brand-gold/5'
        )}
        onClick={() => onViewDetails(snapshot)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{snapshot.name}</span>
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', getStatusBadgeStyles())}
              >
                {snapshot.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {snapshot.description || 'No description'}
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
            </div>
            
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setManageQuartersOpen(true);
              }}
            >
              <Layers className="h-3.5 w-3.5 text-brand-gold" />
              <span>{quarterCount} Quarters</span>
            </div>
            
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/enterprise/strategic-backlog?snapshot=${snapshot.id}&tab=themes`);
              }}
            >
              <Users className="h-3.5 w-3.5 text-brand-gold" />
              <span>{themeCount} Themes</span>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
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
      </div>

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
