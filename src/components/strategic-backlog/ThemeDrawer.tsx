import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Palette } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { useUpdateTheme, useDeleteTheme } from '@/hooks/useStrategicBacklog';
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

const COLOR_OPTIONS = [
  { value: '#c69c6d', label: 'Gold' },
  { value: '#5c7c5c', label: 'Olive' },
  { value: '#8b7355', label: 'Bronze' },
  { value: '#d4b896', label: 'Champagne' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#14b8a6', label: 'Teal' },
];

interface ThemeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: StrategicTheme | null;
  isArchived: boolean;
}

export function ThemeDrawer({ open, onOpenChange, theme, isArchived }: ThemeDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorTag, setColorTag] = useState('#c69c6d');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateTheme = useUpdateTheme();
  const deleteTheme = useDeleteTheme();

  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setDescription(theme.description || '');
      setColorTag(theme.color_tag || '#c69c6d');
      setStatus((theme.status as 'active' | 'draft' | 'archived') || 'active');
    }
  }, [theme]);

  const handleSave = async () => {
    if (!theme?.id || isArchived) return;

    await updateTheme.mutateAsync({
      id: theme.id,
      name,
      description,
      color_tag: colorTag,
      status,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!theme?.id || isArchived) return;
    await deleteTheme.mutateAsync(theme.id);
    setDeleteOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-brand-gold" />
              <SheetTitle className="text-lg">Theme Details</SheetTitle>
            </div>
          </SheetHeader>

          <div className="py-6 space-y-5">
            <div className="space-y-2">
              <Label>Theme Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isArchived}
                placeholder="Enter theme name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isArchived}
                placeholder="Enter theme description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Color Tag</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    disabled={isArchived}
                    onClick={() => setColorTag(color.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      colorTag === color.value ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)} disabled={isArchived}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {theme && (
              <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                <p>Created: {new Date(theme.created_at).toLocaleDateString()}</p>
                <p>Updated: {new Date(theme.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
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
            <AlertDialogTitle>Delete theme?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this theme. Snapshots may require at least one theme to be activated.
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
