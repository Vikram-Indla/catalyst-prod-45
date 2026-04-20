import { useState } from 'react';
import { Search, Folder, Filter } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddTestCasesToSet, useAvailableTestCases } from '@/hooks/useTestSets';
import { useFolders } from '@/hooks/test-management/useFolders';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  testSetId: string;
  projectId: string;
  existingTestCaseIds: string[];
}

const priorityAppearance = (name: string | undefined): LozengeAppearance => {
  const n = (name || '').toLowerCase();
  if (n === 'critical' || n === 'highest') return 'removed';
  if (n === 'high') return 'moved';
  return 'default';
};

export function AddTestCasesModal({ open, onClose, testSetId, projectId, existingTestCaseIds }: Props) {
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState('all');
  const [priority, setPriority] = useState('all');

  const { data: folders } = useFolders(projectId);
  const { data: testCases, isLoading } = useAvailableTestCases(projectId, existingTestCaseIds, { search, folderId, priority });
  const addMutation = useAddTestCasesToSet();

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    await addMutation.mutateAsync({ setId: testSetId, testCaseIds: Array.from(selectedIds), addedBy: user?.id });
    setSelectedIds(new Set()); setSearch(''); setFolderId('all'); setPriority('all');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set()); setSearch(''); setFolderId('all'); setPriority('all');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Test Cases to Set</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search test cases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="w-40">
              <Folder className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {folders?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!testCases?.length && selectedIds.size === testCases?.length}
              onCheckedChange={checked => {
                if (checked && testCases) setSelectedIds(new Set(testCases.map(tc => tc.id)));
                else setSelectedIds(new Set());
              }}
            />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>
          {selectedIds.size > 0 && (
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-[300px] border border-border rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !testCases?.length ? (
            <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
              {search || folderId !== 'all' || priority !== 'all' ? 'No test cases match filters' : 'All test cases already in this set'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {testCases.map(tc => (
                <div key={tc.id}
                  className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors', selectedIds.has(tc.id) && 'bg-primary/5')}
                  onClick={() => toggle(tc.id, !selectedIds.has(tc.id))}
                >
                  <Checkbox checked={selectedIds.has(tc.id)} onCheckedChange={ch => toggle(tc.id, ch as boolean)} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-mono text-primary">{tc.case_key}</span>
                      <Lozenge appearance={priorityAppearance(tc.priority?.name)}>{tc.priority?.name || '-'}</Lozenge>
                    </div>
                    <p className="text-sm text-foreground truncate">{tc.title}</p>
                    {tc.folder && <p className="text-xs text-muted-foreground mt-0.5"><Folder className="h-3 w-3 inline mr-1" />{tc.folder.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selectedIds.size === 0 || addMutation.isPending}>
            {addMutation.isPending ? 'Adding...' : `Add ${selectedIds.size || ''} Test Case${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
