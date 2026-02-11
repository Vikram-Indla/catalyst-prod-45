import { useState } from 'react';
import { FileText, Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddToScope, usePlanScope } from '@/hooks/useTestPlansG26';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props { open: boolean; onClose: () => void; planId: string; }

export function TestCaseSelector({ open, onClose, planId }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: existingScope } = usePlanScope(planId);
  const addToScope = useAddToScope();

  const { data: testCases } = useQuery({
    queryKey: ['tm-test-cases-for-scope', search],
    queryFn: async () => {
      let query = supabase.from('tm_test_cases' as any).select('id, case_key, title').eq('is_active', true).order('case_key').limit(50);
      if (search) query = query.or(`title.ilike.%${search}%,case_key.ilike.%${search}%`);
      const { data } = await query;
      return (data || []) as unknown as { id: string; case_key: string; title: string }[];
    },
    enabled: open,
  });

  const existingIds = new Set(existingScope?.filter(s => s.scope_type === 'test_case').map(s => s.entity_id));
  const filtered = testCases?.filter(tc => !existingIds.has(tc.id));

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const handleAdd = async () => {
    for (const id of selected) { await addToScope.mutateAsync({ planId, scopeType: 'test_case', entityId: id }); }
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Add Test Cases to Scope</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search test cases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          <div className="max-h-72 overflow-y-auto space-y-1 border rounded-lg p-2">
            {filtered?.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No test cases available</p> : filtered?.map(tc => (
              <label key={tc.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selected.has(tc.id)} onCheckedChange={() => toggle(tc.id)} />
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-xs text-primary">{tc.case_key}</span><span className="text-sm truncate">{tc.title}</span></div></div>
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
