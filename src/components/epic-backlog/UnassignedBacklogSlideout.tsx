import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  points_estimate?: number;
  mvp?: boolean;
}

interface UnassignedBacklogSlideoutProps {
  open: boolean;
  onClose: () => void;
  epics: Epic[];
  onEpicSelect: (id: string) => void;
}

export function UnassignedBacklogSlideout({ open, onClose, epics, onEpicSelect }: UnassignedBacklogSlideoutProps) {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'not_started': return 'secondary';
      case 'in_progress': return 'default';
      case 'accepted': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Unassigned Backlog ({epics.length})</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Epics not assigned to any Program Increment</p>
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-20">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {epics.map((epic) => (
                <TableRow
                  key={epic.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    onEpicSelect(epic.id);
                    onClose();
                  }}
                >
                  <TableCell className="text-sm font-mono">{epic.epic_key || epic.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{epic.name}</div>
                      <div className="flex gap-2">
                        {epic.mvp && <Badge variant="secondary" className="text-xs">MVP</Badge>}
                        {epic.points_estimate && (
                          <Badge variant="outline" className="text-xs">{epic.points_estimate} pts</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStateColor(epic.state)} className="text-xs">
                      {epic.state.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {epics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No unassigned epics
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
