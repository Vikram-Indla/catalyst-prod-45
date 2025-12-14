import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, Archive, CheckCircle2, LayoutGrid, ListTree, Boxes, Target } from 'lucide-react';
import { OverviewTab } from '@/components/strategic-backlog/OverviewTab';
import { ThemesTab } from '@/components/strategic-backlog/ThemesTab';
import { EpicsTab } from '@/components/strategic-backlog/EpicsTab';
import { CreateThemeDialog } from '@/components/strategic-backlog/CreateThemeDialog';
import { OKRHubV1 } from '@/modules/okr-v2/components/OKRHubV1';
import {
  useStrategyMissions,
  useStrategyVisions,
  useStrategyValues,
  useStrategicGoals,
  useStrategicThemes,
  useSnapshotStrategyLinks,
} from '@/hooks/useStrategicBacklog';

type CreateType = 'theme' | null;

export default function StrategicBacklog() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [createType, setCreateType] = useState<CreateType>(null);

  // Fetch snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['strategy-snapshots-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select first snapshot
  const currentSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[0];
  const snapshotId = currentSnapshot?.id || '';
  const isArchived = currentSnapshot?.status === 'ARCHIVED';

  // Fetch strategy data
  const { data: missions = [] } = useStrategyMissions();
  const { data: visions = [] } = useStrategyVisions();
  const { data: values = [] } = useStrategyValues();
  const { data: goals = [] } = useStrategicGoals(snapshotId);
  const { data: themes = [] } = useStrategicThemes(snapshotId);
  const { data: links } = useSnapshotStrategyLinks(snapshotId);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Row - NO toolbar, so NO divider */}
      <div className="h-[44px] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-secondary-green">Strategic Backlog</h1>
          {currentSnapshot && (
            <Badge variant={isArchived ? 'secondary' : 'outline'} className={!isArchived ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30' : ''}>
              {isArchived ? <Archive className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              {isArchived ? 'Archived (read-only)' : currentSnapshot.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Snapshot Selector */}
          <Select value={snapshotId} onValueChange={setSelectedSnapshotId}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Select snapshot" />
            </SelectTrigger>
            <SelectContent className="z-[400]">
              {snapshots.map((snap) => (
                <SelectItem key={snap.id} value={snap.id}>
                  <div className="flex items-center gap-2">
                    {snap.status === 'ARCHIVED' && <Archive className="h-3 w-3 text-muted-foreground" />}
                    {snap.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create Dropdown */}
          {!isArchived && snapshotId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-brand-gold hover:bg-brand-gold/90 px-3">
                  <Plus className="h-4 w-4" />
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[400] bg-background border-border">
                <DropdownMenuItem onClick={() => setCreateType('theme')}>Theme</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      {!snapshotId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Select a snapshot to manage strategic objects.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto bg-transparent p-0 pb-3 rounded-none w-full justify-start gap-1 border-b border-border">
              <TabsTrigger 
                value="overview" 
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="themes" 
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
              >
                <ListTree className="h-3.5 w-3.5" />
                Themes
                {themes.length === 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-1 rounded-full">!</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="objectives"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
              >
                <Target className="h-3.5 w-3.5" />
                Objectives
              </TabsTrigger>
              <TabsTrigger 
                value="epics"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
              >
                <Boxes className="h-3.5 w-3.5" />
                Epics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab
                missions={missions}
                visions={visions}
                values={values}
                goals={goals}
                themes={themes}
                links={links || null}
                isArchived={isArchived}
                snapshotId={snapshotId}
              />
            </TabsContent>

            <TabsContent value="themes" className="mt-6">
              <ThemesTab
                themes={themes}
                snapshotId={snapshotId}
                isArchived={isArchived}
              />
            </TabsContent>

            <TabsContent value="objectives" className="mt-6">
              <OKRHubV1 snapshotId={snapshotId} />
            </TabsContent>

            <TabsContent value="epics" className="mt-6">
              <EpicsTab
                snapshotId={snapshotId}
                links={links || null}
                themes={themes}
                isArchived={isArchived}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Create Dialogs */}
      {createType === 'theme' && (
        <CreateThemeDialog
          open={true}
          onOpenChange={(open) => !open && setCreateType(null)}
          snapshotId={snapshotId}
        />
      )}
    </div>
  );
}
