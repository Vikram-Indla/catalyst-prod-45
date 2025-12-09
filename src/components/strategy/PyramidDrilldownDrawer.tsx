import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, CheckCircle2, AlertTriangle, Unlink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PyramidDrilldownDrawerProps {
  open: boolean;
  onClose: () => void;
  layer: string | null;
  snapshotId?: string;
}

export function PyramidDrilldownDrawer({
  open,
  onClose,
  layer,
  snapshotId,
}: PyramidDrilldownDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'included' | 'misaligned' | 'unaligned'>('included');

  // Determine which items to fetch based on layer
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pyramid-drilldown', layer, snapshotId],
    queryFn: async () => {
      if (!layer || !snapshotId) return [];

      const isMisalignedView = layer.includes('Misaligned');
      const cleanLayer = layer.replace(' (Misaligned)', '');

      if (cleanLayer === 'Strategic Goals') {
        const { data } = await supabase
          .from('strategic_goals')
          .select('id, title, description, health_status')
          .eq('snapshot_id', snapshotId);
        return data?.map(g => ({
          id: g.id,
          name: g.title,
          type: 'goal',
          status: g.health_status || 'unknown',
          aligned: true,
        })) || [];
      }

      if (cleanLayer === 'Themes') {
        // Fetch themes linked to snapshot
        const { data: links } = await supabase
          .from('snapshot_strategy_links')
          .select('theme_ids')
          .eq('snapshot_id', snapshotId)
          .maybeSingle();
        
        const themeIds = links?.theme_ids || [];
        if (themeIds.length === 0) return [];

        const { data } = await supabase
          .from('strategic_themes')
          .select('id, name, status')
          .in('id', themeIds);
        
        return data?.map(t => ({
          id: t.id,
          name: t.name,
          type: 'theme',
          status: t.status || 'active',
          aligned: true,
        })) || [];
      }

      if (cleanLayer === 'Epics') {
        // Fetch aligned epics via theme_epic_links and objective_epic_links
        const { data: links } = await supabase
          .from('snapshot_strategy_links')
          .select('theme_ids')
          .eq('snapshot_id', snapshotId)
          .maybeSingle();
        
        const themeIds = links?.theme_ids || [];
        
        const { data: themeEpicLinks } = await supabase
          .from('theme_epic_links')
          .select('epic_id')
          .in('theme_id', themeIds.length > 0 ? themeIds : ['__none__']);
        
        const { data: objectiveEpicLinks } = await supabase
          .from('objective_epic_links')
          .select('epic_id');

        const alignedEpicIds = new Set([
          ...(themeEpicLinks?.map(l => l.epic_id) || []),
          ...(objectiveEpicLinks?.map(l => l.epic_id) || []),
        ]);

        const { data: epics } = await supabase
          .from('epics')
          .select('id, name, state, primary_program_id, programs:primary_program_id(name)');

        return epics?.map((e: any) => ({
          id: e.id,
          name: e.name,
          type: 'epic',
          status: e.state || 'unknown',
          programName: e.programs?.name,
          aligned: alignedEpicIds.has(e.id),
        })) || [];
      }

      if (cleanLayer === 'Features') {
        const { data: features } = await supabase
          .from('features')
          .select('id, name, status, epic_id, epics:epic_id(name)');
        
        return features?.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: 'feature',
          status: f.status || 'unknown',
          epicName: f.epics?.name,
          aligned: true, // Simplified
        })) || [];
      }

      return [];
    },
    enabled: open && !!layer && !!snapshotId,
  });

  // Filter based on tab and search
  const filteredItems = items.filter((item: any) => {
    const matchesSearch = !searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'included') return matchesSearch && item.aligned;
    if (activeTab === 'misaligned') return matchesSearch && !item.aligned;
    if (activeTab === 'unaligned') return matchesSearch && !item.aligned;
    
    return matchesSearch;
  });

  const includedCount = items.filter((i: any) => i.aligned).length;
  const misalignedCount = items.filter((i: any) => !i.aligned).length;

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      done: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      proposed: 'bg-amber-100 text-amber-700',
      unknown: 'bg-gray-100 text-gray-700',
    };
    return (
      <Badge className={`${statusColors[status.toLowerCase()] || statusColors.unknown} text-xs`}>
        {status}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <SheetTitle>{layer || 'Drilldown'}</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="p-4 pb-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 grid grid-cols-3 h-9">
            <TabsTrigger value="included" className="text-xs gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Included ({includedCount})
            </TabsTrigger>
            <TabsTrigger value="misaligned" className="text-xs gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Misaligned ({misalignedCount})
            </TabsTrigger>
            <TabsTrigger value="unaligned" className="text-xs gap-1">
              <Unlink className="h-3.5 w-3.5" />
              Unaligned
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-auto m-0 p-0">
            {isLoading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Unlink className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No items found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
