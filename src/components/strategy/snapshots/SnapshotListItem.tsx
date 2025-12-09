import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Play, Archive, Trash2, Calendar, Layers, Users } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, useActivateSnapshot, useArchiveSnapshot } from '@/hooks/useStrategicSnapshots';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SnapshotListItemProps {
  snapshot: StrategicSnapshot;
  onViewDetails: (snapshot: StrategicSnapshot) => void;
  onDelete: (snapshot: StrategicSnapshot) => void;
}

export function SnapshotListItem({ snapshot, onViewDetails, onDelete }: SnapshotListItemProps) {
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const activateSnapshot = useActivateSnapshot();
  const archiveSnapshot = useArchiveSnapshot();

  const isArchived = snapshot.status === 'ARCHIVED';
  const isActive = snapshot.status === 'ACTIVE';
  const isDraft = snapshot.status === 'DRAFT';

  const canActivate = !isArchived && configuration?.quarters?.length > 0 && configuration?.themes?.length > 0;
  const canArchive = !isArchived;

  const handleActivate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await activateSnapshot.mutateAsync(snapshot.id);
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div
      className={cn(
        'flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-accent/50 cursor-pointer transition-colors',
        isArchived && 'opacity-70 bg-muted/30',
        isActive && 'bg-green-50/50'
      )}
      onClick={() => onViewDetails(snapshot)}
    >
      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{snapshot.name}</span>
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
          <p className="text-sm text-muted-foreground truncate">
            {snapshot.description || 'No description'}
          </p>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-gold" />
            <span>{configuration?.quarters?.length || 0} Quarters</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-brand-gold" />
            <span>{configuration?.themes?.length || 0} Themes</span>
          </div>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(snapshot); }}>
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
  );
}
