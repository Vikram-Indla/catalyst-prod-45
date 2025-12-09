import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarRange, Layers, ExternalLink } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, useActivateSnapshot, useStrategicSnapshots } from '@/hooks/useStrategicSnapshots';
import { cn } from '@/lib/utils';

interface ActivateSnapshotModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot;
  onOpenQuarters: () => void;
}

export function ActivateSnapshotModal({ open, onClose, snapshot, onOpenQuarters }: ActivateSnapshotModalProps) {
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const { data: allSnapshots } = useStrategicSnapshots(true);
  const activateSnapshot = useActivateSnapshot();
  const [activating, setActivating] = useState(false);

  const hasQuarters = (configuration?.quarters?.length || 0) > 0;
  const hasThemes = (configuration?.themes?.length || 0) > 0;
  const canActivate = hasQuarters && hasThemes;
  
  const currentActiveSnapshot = allSnapshots?.find(s => s.status === 'ACTIVE' && s.id !== snapshot.id);

  const handleActivate = async () => {
    if (!canActivate) return;
    setActivating(true);
    try {
      await activateSnapshot.mutateAsync(snapshot.id);
      onClose();
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Activate snapshot?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Only one snapshot can be active at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current active snapshot warning */}
          {currentActiveSnapshot && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Another snapshot is currently active</p>
                <p className="text-amber-700 mt-1">
                  "{currentActiveSnapshot.name}" will be set back to DRAFT when you activate this snapshot.
                </p>
              </div>
            </div>
          )}

          {/* Validation requirements */}
          {!canActivate && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Requirements to activate:</p>
              
              <div className={cn(
                'flex items-center justify-between p-3 rounded-md border',
                hasQuarters ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              )}>
                <div className="flex items-center gap-2">
                  <CalendarRange className={cn('h-4 w-4', hasQuarters ? 'text-green-600' : 'text-red-600')} />
                  <span className={cn('text-sm', hasQuarters ? 'text-green-800' : 'text-red-800')}>
                    At least 1 Quarter assigned
                  </span>
                </div>
                {!hasQuarters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs text-red-700 hover:text-red-800"
                    onClick={() => {
                      onClose();
                      setTimeout(onOpenQuarters, 100);
                    }}
                  >
                    Add <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>

              <div className={cn(
                'flex items-center justify-between p-3 rounded-md border',
                hasThemes ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              )}>
                <div className="flex items-center gap-2">
                  <Layers className={cn('h-4 w-4', hasThemes ? 'text-green-600' : 'text-red-600')} />
                  <span className={cn('text-sm', hasThemes ? 'text-green-800' : 'text-red-800')}>
                    At least 1 Theme linked
                  </span>
                </div>
                {!hasThemes && (
                  <span className="text-xs text-muted-foreground">
                    Link via Strategic Backlog → Themes
                  </span>
                )}
              </div>
            </div>
          )}

          {canActivate && !currentActiveSnapshot && (
            <p className="text-sm text-muted-foreground">
              Activating this snapshot will make it the current working snapshot across Strategy Room and Strategic Backlog.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleActivate} 
            disabled={!canActivate || activating}
          >
            {activating ? 'Activating...' : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
