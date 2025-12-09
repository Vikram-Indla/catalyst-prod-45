import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Target, Eye, Heart } from 'lucide-react';
import type { StrategyMission, StrategyVision, StrategyValue } from '@/types/strategicBacklog';
import { useUpdateMission, useUpdateVision, useUpdateValue, useDeleteMission, useDeleteVision, useDeleteValue } from '@/hooks/useStrategicBacklog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ObjectType = 'mission' | 'vision' | 'value';

interface StrategyObjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ObjectType;
  data?: StrategyMission | StrategyVision | StrategyValue | null;
  isArchived: boolean;
}

export function StrategyObjectDrawer({ open, onOpenChange, type, data, isArchived }: StrategyObjectDrawerProps) {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMission = useUpdateMission();
  const updateVision = useUpdateVision();
  const updateValue = useUpdateValue();
  const deleteMission = useDeleteMission();
  const deleteVision = useDeleteVision();
  const deleteValue = useDeleteValue();

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setStatement(data.statement || '');
      setStatus((data.status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED') || 'ACTIVE');
    }
  }, [data]);

  const handleSave = async () => {
    if (!data?.id || isArchived) return;

    const payload = { id: data.id, title, statement, status };

    if (type === 'mission') {
      await updateMission.mutateAsync(payload);
    } else if (type === 'vision') {
      await updateVision.mutateAsync(payload);
    } else {
      await updateValue.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!data?.id || isArchived) return;

    if (type === 'mission') {
      await deleteMission.mutateAsync(data.id);
    } else if (type === 'vision') {
      await deleteVision.mutateAsync(data.id);
    } else {
      await deleteValue.mutateAsync(data.id);
    }
    setDeleteOpen(false);
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (type) {
      case 'mission': return <Target className="h-5 w-5 text-blue-600" />;
      case 'vision': return <Eye className="h-5 w-5 text-purple-600" />;
      case 'value': return <Heart className="h-5 w-5 text-pink-600" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'mission': return 'Mission Details';
      case 'vision': return 'Vision Details';
      case 'value': return 'Value Details';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[420px] sm:max-w-[420px] flex flex-col h-full">
          <SheetHeader className="pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              {getIcon()}
              <SheetTitle className="text-lg">{getTitle()}</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-6 space-y-5">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isArchived}
                placeholder={`Enter ${type} title`}
              />
            </div>

            <div className="space-y-2">
              <Label>Statement</Label>
              <Textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                disabled={isArchived}
                placeholder={`Enter ${type} statement`}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)} disabled={isArchived}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data && (
              <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                <p>Created: {new Date(data.created_at).toLocaleDateString()}</p>
                <p>Updated: {new Date(data.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border flex-shrink-0">
            {!isArchived && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {!isArchived && (
                <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold/90">
                  Save
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {type}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
