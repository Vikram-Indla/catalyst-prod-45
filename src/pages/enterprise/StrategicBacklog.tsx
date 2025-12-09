import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, Archive, CheckCircle2, LayoutGrid, Target, Palette, ListTree, Boxes } from 'lucide-react';
import { OverviewTab } from '@/components/strategic-backlog/OverviewTab';
import { MVVTab } from '@/components/strategic-backlog/MVVTab';
import { GoalsTab } from '@/components/strategic-backlog/GoalsTab';
import { ThemesTab } from '@/components/strategic-backlog/ThemesTab';
import { EpicsTab } from '@/components/strategic-backlog/EpicsTab';
import { CreateStrategyObjectDialog } from '@/components/strategic-backlog/CreateStrategyObjectDialog';
import { CreateGoalDialog } from '@/components/strategic-backlog/CreateGoalDialog';
import { CreateThemeDialog } from '@/components/strategic-backlog/CreateThemeDialog';
import {
  useStrategyMissions,
  useStrategyVisions,
  useStrategyValues,
  useStrategicGoals,
  useStrategicThemes,
  useSnapshotStrategyLinks,
} from '@/hooks/useStrategicBacklog';

type CreateType = 'mission' | 'vision' | 'value' | 'goal' | 'theme' | null;

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
      {/* Header - align header pattern */}
      <div className="h-[72px] border-b border-border bg-background flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">Strategic Backlog</h1>
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
            <SelectContent>
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
                <Button className="bg-brand-gold hover:bg-brand-gold/90">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateType('mission')}>Mission</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateType('vision')}>Vision</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateType('value')}>Value</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateType('goal')}>Strategic Goal</DropdownMenuItem>
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
            <TabsList className="mb-6 h-auto p-1.5 bg-muted/30 rounded-full border border-border/50 gap-1">
              <TabsTrigger 
                value="overview" 
                className="rounded-full px-5 py-2.5 data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-2 text-muted-foreground data-[state=active]:font-medium"
              >
                <LayoutGrid className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="mvv"
                className="rounded-full px-5 py-2.5 data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-2 text-muted-foreground data-[state=active]:font-medium"
              >
                <Target className="h-4 w-4" />
                Mission / Vision / Values
              </TabsTrigger>
              <TabsTrigger 
                value="goals"
                className="rounded-full px-5 py-2.5 data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-2 text-muted-foreground data-[state=active]:font-medium"
              >
                <Palette className="h-4 w-4" />
                Strategic Goals
              </TabsTrigger>
              <TabsTrigger 
                value="themes" 
                className="rounded-full px-5 py-2.5 data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-2 text-muted-foreground data-[state=active]:font-medium"
              >
                <ListTree className="h-4 w-4" />
                Themes
                {themes.length === 0 && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 ml-1">Required</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="epics"
                className="rounded-full px-5 py-2.5 data-[state=active]:bg-brand-gold data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-2 text-muted-foreground data-[state=active]:font-medium"
              >
                <Boxes className="h-4 w-4" />
                Epics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                missions={missions}
                visions={visions}
                values={values}
                goals={goals}
                themes={themes}
                links={links || null}
                isArchived={isArchived}
              />
            </TabsContent>

            <TabsContent value="mvv">
              <MVVTab
                missions={missions}
                visions={visions}
                values={values}
                links={links || null}
                snapshotId={snapshotId}
                isArchived={isArchived}
              />
            </TabsContent>

            <TabsContent value="goals">
              <GoalsTab
                goals={goals}
                links={links || null}
                snapshotId={snapshotId}
                isArchived={isArchived}
              />
            </TabsContent>

            <TabsContent value="themes">
              <ThemesTab
                themes={themes}
                snapshotId={snapshotId}
                isArchived={isArchived}
              />
            </TabsContent>

            <TabsContent value="epics">
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
      {(createType === 'mission' || createType === 'vision' || createType === 'value') && (
        <CreateStrategyObjectDialog
          open={true}
          onOpenChange={(open) => !open && setCreateType(null)}
          type={createType}
          snapshotId={snapshotId}
        />
      )}

      {createType === 'goal' && (
        <CreateGoalDialog
          open={true}
          onOpenChange={(open) => !open && setCreateType(null)}
          snapshotId={snapshotId}
        />
      )}

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
