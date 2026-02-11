import { useState } from 'react';
import { Folder, Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddToScope, usePlanScope } from '@/hooks/useTestPlansG26';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props { open: boolean; onClose: () => void; planId: string; }

export function FolderSelector({ open, onClose, planId }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: existingScope } = usePlanScope(planId);
  const addToScope = useAddToScope();

  const { data: folders } = useQuery({
    queryKey: ['tm-folders-all'],
    queryFn: async () => {
      const { data } = await supabase.from('tm_folders' as any).select('id, name').order('name');
      return (data || []) as unknown as { id: string; name: string }[];
    },
    enabled: open,
  });

  const existingIds = new Set(existingScope?.filter(s => s.scope_type === 'folder').map(s => s.entity_id));
  const filtered = folders?.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) && !existingIds.has(f.id));

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const handleAdd = async () => {
    for (const id of selected) { await addToScope.mutateAsync({ planId, scopeType: 'folder', entityId: id }); }
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Folder className="h-5 w-5" />Add Folders to Scope</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search folders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
            {filtered?.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No folders available</p> : filtered?.map(f => (
              <label key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggle(f.id)} />
                <Folder className="h-4 w-4 text-blue-500" /><span className="text-sm">{f.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAdd} disabled={selected.size === 0 || addToScope.isPending}><Check className="h-4 w-4 mr-2" />Add {selected.size > 0 ? `(${selected.size})` : ''}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
