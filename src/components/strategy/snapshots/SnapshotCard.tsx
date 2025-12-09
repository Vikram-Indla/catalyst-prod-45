import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Play, Archive, Trash2, Calendar, Clock, Layers, Users, Pencil, Settings, CalendarRange } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, useActivateSnapshot, useArchiveSnapshot } from '@/hooks/useStrategicSnapshots';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RenameSnapshotModal } from './RenameSnapshotModal';
import { EditSnapshotDetailsModal } from './EditSnapshotDetailsModal';
import { ManageQuartersDrawer } from './ManageQuartersDrawer';

interface SnapshotCardProps {
  snapshot: StrategicSnapshot;
  onViewDetails: (snapshot: StrategicSnapshot) => void;
  onDelete: (snapshot: StrategicSnapshot) => void;
}

export function SnapshotCard({ snapshot, onViewDetails, onDelete }: SnapshotCardProps) {
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [manageQuartersOpen, setManageQuartersOpen] = useState(false);
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const activateSnapshot = useActivateSnapshot();
  const archiveSnapshot = useArchiveSnapshot();

  const isArchived = snapshot.status === 'ARCHIVED';
  const isActive = snapshot.status === 'ACTIVE';
  const isDraft = snapshot.status === 'DRAFT';

  const canActivate = !isArchived && configuration?.quarters?.length > 0 && configuration?.themes?.length > 0;
  const canArchive = !isArchived;

  const handleActivate = async () => {
    await activateSnapshot.mutateAsync(snapshot.id);
  };

  const handleArchive = async () => {
    await archiveSnapshot.mutateAsync(snapshot.id);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
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
              className={cn(
                'text-xs',
                isActive && 'bg-green-50 text-green-700 border-green-200',
                isArchived && 'bg-gray-100 text-gray-600 border-gray-200',
                isDraft && 'bg-amber-50 text-amber-700 border-amber-200'
              )}
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
          <DropdownMenuContent align="end">
            {!isArchived && (
              <DropdownMenuItem onClick={() => setRenameModalOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {!isArchived && (
              <DropdownMenuItem onClick={() => setEditDetailsModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit details
              </DropdownMenuItem>
            )}
            {!isArchived && (
              <DropdownMenuItem onClick={() => setManageQuartersOpen(true)}>
                <CalendarRange className="h-4 w-4 mr-2" />
                Manage quarters
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onViewDetails(snapshot)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canActivate && !isActive && (
              <DropdownMenuItem onClick={handleActivate}>
                <Play className="h-4 w-4 mr-2" />
                Set Active
              </DropdownMenuItem>
            )}
            {canArchive && (
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            {!isArchived && (
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
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand-gold" />
              <span className="text-xs font-medium">
                {configuration?.quarters?.length || 0} Quarters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-brand-gold" />
              <span className="text-xs font-medium">
                {configuration?.themes?.length || 0} Themes
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
    </>
  );
}
