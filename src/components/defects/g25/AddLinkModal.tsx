import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateDefectLinkG25 } from '@/hooks/useDefectsG25';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  defectId: string;
}

export function AddLinkModal({ open, onClose, defectId }: Props) {
  const [linkType, setLinkType] = useState('test_case');
  const [search, setSearch] = useState('');
  const createLink = useCreateDefectLinkG25();

  const { data: testCases, isLoading } = useQuery({
    queryKey: ['th-test-cases-search', search],
    queryFn: async () => {
      let query = supabase
        .from('th_test_cases' as any)
        .select('id, case_key, title')
        .order('case_key', { ascending: true })
        .limit(20);
      if (search) {
        query = query.or(`title.ilike.%${search}%,case_key.ilike.%${search}%`);
      }
      const { data } = await query;
      return (data || []) as unknown as { id: string; case_key: string; title: string }[];
    },
    enabled: open && linkType === 'test_case',
  });

  const handleSelect = async (linkedId: string) => {
    await createLink.mutateAsync({ defectId, linkType, linkedId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link Type</Label>
            <Select value={linkType} onValueChange={setLinkType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="test_case">Test Case</SelectItem>
                <SelectItem value="execution">Execution</SelectItem>
                <SelectItem value="requirement">Requirement</SelectItem>
                <SelectItem value="related_defect">Related Defect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {linkType === 'test_case' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search test cases..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {isLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : testCases?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No test cases found</p>
                ) : (
                  testCases?.map(tc => (
                    <button
                      key={tc.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-left transition-colors"
                      onClick={() => handleSelect(tc.id)}
                      disabled={createLink.isPending}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono text-sm text-primary">{tc.case_key}</span>
                        <p className="text-sm truncate">{tc.title}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
