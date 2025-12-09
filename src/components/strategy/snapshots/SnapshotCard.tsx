import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Play, Archive, Trash2, Calendar, Clock, Layers, Users, Pencil, Settings, CalendarRange } from 'lucide-react';
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

  const getStatusBadgeStyles = () => {
    if (isActive) return 'bg-brand-gold/10 text-brand-gold border-brand-gold/30';
    if (isArchived) return 'bg-muted text-muted-foreground border-muted';
    return 'bg-amber-50 text-amber-700 border-amber-200'; // DRAFT
  };

  return (
    <>
      <Card className={cn(
        'cursor-pointer hover:shadow-lg transition-all duration-200 border',
        isArchived && 'opacity-70 bg-muted/30',
        isActive && 'ring-2 ring-brand-gold/30'
      )}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate">{snapshot.name}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', getStatusBadgeStyles())}
            >
              {snapshot.status}
            </Badge>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {/* DRAFT or ACTIVE: show edit actions */}
            {!isArchived && (
              <>
                <DropdownMenuItem onClick={() => setRenameModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditDetailsModalOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManageQuartersOpen(true)}>
                  <CalendarRange className="h-4 w-4 mr-2" />
                  Manage quarters
                </DropdownMenuItem>
              </>
            )}
            
            {/* Always show View Details */}
            <DropdownMenuItem onClick={() => onViewDetails(snapshot)}>
              <Eye className="h-4 w-4 mr-2" />
              View details
            </DropdownMenuItem>
            
            {/* DRAFT only: Activate */}
            {isDraft && (
              <DropdownMenuItem onClick={() => setActivateModalOpen(true)}>
                <Play className="h-4 w-4 mr-2" />
                Activate snapshot
              </DropdownMenuItem>
            )}
            
            {/* DRAFT or ACTIVE: Archive */}
            {!isArchived && (
              <DropdownMenuItem onClick={() => setArchiveModalOpen(true)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive snapshot
              </DropdownMenuItem>
            )}
            
            {/* DRAFT only: Delete */}
            {isDraft && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(snapshot)}
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
      
      <CardContent className="pt-0" onClick={() => onViewDetails(snapshot)}>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {snapshot.description || 'No description'}
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Created {formatDate(snapshot.created_at)}</span>
          </div>
          
          <div className="flex items-center gap-4 mt-3 pt-3 border-t">
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                setManageQuartersOpen(true);
              }}
            >
              <Layers className="h-3.5 w-3.5 text-brand-gold" />
              <span className="text-xs font-medium">
                {quarterCount} Quarters
              </span>
            </div>
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/enterprise/strategic-backlog?snapshot=${snapshot.id}&tab=themes`);
              }}
            >
              <Users className="h-3.5 w-3.5 text-brand-gold" />
              <span className="text-xs font-medium">
                {themeCount} Themes
              </span>
            </div>
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
