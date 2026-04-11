import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateDefectLinkG25 } from '@/hooks/useDefectsG25';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, FileText, GitBranch, Bug, RefreshCw, BookOpen, Tag } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  defectId: string;
  projectId?: string;
}

type LinkTypeOption = {
  value: string;
  label: string;
  icon: React.ElementType;
  table: string;
  keyField: string;
  nameField: string;
  searchFields: string[];
};

const LINK_TYPE_OPTIONS: LinkTypeOption[] = [
  { value: 'test_case',      label: 'Test Case',      icon: FileText,   table: 'tm_test_cases',   keyField: 'case_key',   nameField: 'title', searchFields: ['title', 'case_key'] },
  { value: 'requirement',    label: 'Requirement',    icon: GitBranch,  table: 'tm_requirements', keyField: 'req_key',    nameField: 'title', searchFields: ['title', 'req_key'] },
  { value: 'test_cycle',     label: 'Test Cycle',     icon: RefreshCw,  table: 'tm_test_cycles',  keyField: 'cycle_key',  nameField: 'name',  searchFields: ['name', 'cycle_key'] },
  { value: 'test_plan',      label: 'Test Plan',      icon: BookOpen,   table: 'tm_test_plans',   keyField: 'plan_key',   nameField: 'name',  searchFields: ['name'] },
  { value: 'release',        label: 'Release',        icon: Tag,        table: 'releases',         keyField: 'name',       nameField: 'name',  searchFields: ['name'] },
  { value: 'related_defect', label: 'Related Defect', icon: Bug,        table: 'tm_defects',      keyField: 'defect_key', nameField: 'title', searchFields: ['title', 'defect_key'] },
];

type SearchResult = { id: string; key: string; name: string };

export function AddLinkModal({ open, onClose, defectId, projectId }: Props) {
  const [linkType, setLinkType] = useState('test_case');
  const [search, setSearch] = useState('');
  const createLink = useCreateDefectLinkG25();

  const config = LINK_TYPE_OPTIONS.find(o => o.value === linkType)!;

  const { data: results, isLoading } = useQuery({
    queryKey: ['add-link-search', linkType, search],
    queryFn: async () => {
      let query = (supabase as any)
        .from(config.table)
        .select(`id, ${config.keyField}, ${config.nameField}`)
        .order(config.nameField, { ascending: true })
        .limit(20);

      if (search) {
        const orClause = config.searchFields
          .map(f => `${f}.ilike.%${search}%`)
          .join(',');
        query = query.or(orClause);
      }

      if (projectId && ['tm_test_cases', 'tm_requirements', 'tm_test_cycles', 'tm_test_plans', 'tm_defects'].includes(config.table)) {
        query = query.eq('project_id', projectId);
      }

      const { data } = await query;
      return ((data || []) as any[]).map(row => ({
        id: row.id,
        key: row[config.keyField] || '',
        name: row[config.nameField] || '',
      })) as SearchResult[];
    },
    enabled: open,
  });

  const handleSelect = async (item: SearchResult) => {
    const entityLabel = item.key !== item.name
      ? `${item.key} — ${item.name}`
      : item.name;
    await createLink.mutateAsync({
      defectId,
      linkType,
      linkedId: item.id,
      entityLabel,
    });
    onClose();
  };

  const handleTypeChange = (val: string) => {
    setLinkType(val);
    setSearch('');
  };

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          <div className="space-y-2">
            <Label>Link Type</Label>
            <Select value={linkType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${config.label.toLowerCase()}s...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !results?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No {config.label.toLowerCase()} found
              </p>
            ) : (
              results.map(item => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-left transition-colors"
                  onClick={() => handleSelect(item)}
                  disabled={createLink.isPending}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="font-mono text-sm text-primary">{item.key}</span>
                    {item.name !== item.key && (
                      <p className="text-sm truncate text-muted-foreground">{item.name}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
