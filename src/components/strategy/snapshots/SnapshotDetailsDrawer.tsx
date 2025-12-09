import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Calendar, Clock, Layers, Users, ExternalLink } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SnapshotDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot | null;
}

export function SnapshotDetailsDrawer({ open, onClose, snapshot }: SnapshotDetailsDrawerProps) {
  const navigate = useNavigate();
  const { data: configuration } = useSnapshotConfiguration(snapshot?.id || null);
  const { data: links } = useSnapshotStrategyLinks(snapshot?.id);

  if (!snapshot) return null;

  const isActive = snapshot.status === 'ACTIVE';
  const isArchived = snapshot.status === 'ARCHIVED';
  const isDraft = snapshot.status === 'DRAFT';

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

  const themeCount = links?.theme_ids?.length || configuration?.themes?.length || 0;
  const quarterCount = configuration?.quarters?.length || 0;

  const handleNavigateToStrategyRoom = () => {
    navigate(`/enterprise/strategy-room?snapshot=${snapshot.id}`);
    onClose();
  };

  const handleNavigateToBacklogThemes = () => {
    navigate(`/enterprise/strategic-backlog?snapshot=${snapshot.id}&tab=themes`);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" width="medium" className="flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{snapshot.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', getStatusBadgeStyles())}
                >
                  {snapshot.status}
                </Badge>
                {isArchived && (
                  <span className="text-xs text-muted-foreground">Read-only</span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-brand-gold/30 flex-shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <SheetBody className="flex-1">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {snapshot.description || 'No description provided.'}
              </p>
            </div>

            <Separator />

            {/* Date Range */}
            <div>
              <h4 className="text-sm font-medium mb-3">Date Range</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-medium mb-3">Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatDate(snapshot.created_at)}</span>
                </div>
                {snapshot.active_since && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Active since {formatDate(snapshot.active_since)}</span>
                  </div>
                )}
                {snapshot.archived_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Archived {formatDate(snapshot.archived_at)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Scope Counts */}
            <div>
              <h4 className="text-sm font-medium mb-3">Scope</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-brand-gold" />
                    <span className="text-sm font-medium">{quarterCount} Quarters</span>
                  </div>
                  {quarterCount > 0 && configuration?.quarters && (
                    <p className="text-xs text-muted-foreground truncate">
                      {configuration.quarters.slice(0, 3).join(', ')}
                      {configuration.quarters.length > 3 && '...'}
                    </p>
                  )}
                </div>
                
                <button 
                  className="p-3 bg-muted/50 rounded-md text-left hover:bg-muted transition-colors"
                  onClick={handleNavigateToBacklogThemes}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-brand-gold" />
                    <span className="text-sm font-medium">{themeCount} Themes</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click to manage themes
                  </p>
                </button>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={handleNavigateToStrategyRoom}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Strategy Room
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={handleNavigateToBacklogThemes}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Strategic Backlog
                </Button>
              </div>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
