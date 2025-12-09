import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';
import { useCreateTheme } from '@/hooks/useStrategicBacklog';

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

interface CreateThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
}

export function CreateThemeDialog({ open, onOpenChange, snapshotId }: CreateThemeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorTag, setColorTag] = useState('#c69c6d');

  const createTheme = useCreateTheme();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createTheme.mutateAsync({
      name,
      description,
      color_tag: colorTag,
      snapshot_id: snapshotId,
      status: 'active',
    });

    setName('');
    setDescription('');
    setColorTag('#c69c6d');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-brand-gold" />
            <DialogTitle>Create Theme</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Theme Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter theme name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter theme description (optional)"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createTheme.isPending}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {createTheme.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
