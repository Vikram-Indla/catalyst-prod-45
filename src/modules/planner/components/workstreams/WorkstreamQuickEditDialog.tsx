import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Workstream, useUpdateWorkstream } from '../../hooks/usePlannerWorkstreams';

function cleanPrefix(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

export function WorkstreamQuickEditDialog({
  open,
  onOpenChange,
  workstream,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workstream: Workstream | null;
}) {
  const updateWorkstream = useUpdateWorkstream();
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');

  useEffect(() => {
    if (!workstream) return;
    setName(workstream.name);
    setPrefix(workstream.key_prefix || workstream.code || '');
  }, [workstream?.id]);

  const trimmedName = name.trim();
  const clean = useMemo(() => cleanPrefix(prefix), [prefix]);
  const canSave = !!workstream && trimmedName.length > 0 && clean.length >= 3;

  async function onSave() {
    if (!workstream) return;
    const nextPrefix = cleanPrefix(prefix);
    await updateWorkstream.mutateAsync({
      id: workstream.id,
      updates: {
        name: trimmedName,
        key_prefix: nextPrefix,
      },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] z-[120]">
        <DialogHeader>
          <DialogTitle>Edit workstream</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workstream name"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ws-prefix">Task key prefix</Label>
            <Input
              id="ws-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="CAT"
              maxLength={5}
            />
            <div className="text-xs text-muted-foreground">
              Prefix must be at least 3 characters. Changing it updates all task keys in this workstream.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!canSave || updateWorkstream.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
