import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { EpicKanbanView } from '@/components/items/epics/EpicKanbanView';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Columns, 
  LayoutList, 
  LayoutGrid,
  Download,
  Upload,
  Calculator,
  Trash2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function EnterpriseEpics() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const { data: epics, isLoading } = useQuery({
    queryKey: ['enterprise-epics', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs!primary_program_id(name),
          portfolios(name)
        `)
        .is('deleted_at', null)
        .order('global_rank', { ascending: true, nullsFirst: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedEpic = epics?.find(e => e.id === selectedEpicId);

  const getStateBadge = (state: string | null) => {
    if (!state) return <Badge variant="secondary">New</Badge>;
    const colors: Record<string, string> = {
      'funnel': 'bg-gray-500',
      'analyzing': 'bg-blue-500',
      'portfolio_backlog': 'bg-purple-500',
      'implementing': 'bg-amber-500',
      'validating_in_production': 'bg-cyan-500',
      'done': 'bg-green-500',
    };
    return (
      <Badge variant="secondary" className={`${colors[state] || 'bg-gray-500'} text-white`}>
        {state.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Enterprise Epics</h1>
          <p className="text-sm text-muted-foreground">
            View and manage epics across all portfolios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/items/epics?create=true')}>
            <Plus className="h-4 w-4 mr-2" />
            New Epic
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search epics..." 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="list">
                <LayoutList className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/items/epics/estimation')}>
                <Calculator className="h-4 w-4 mr-2" />
                Technical Scoring
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Epics
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                Import Epics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/items/epics/recycle-bin')}>
                <Trash2 className="h-4 w-4 mr-2" />
                Recycle Bin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/items/epics/canceled')}>
                <XCircle className="h-4 w-4 mr-2" />
                Canceled Items
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <Card className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-32">State</TableHead>
                <TableHead className="w-32">Health</TableHead>
                <TableHead className="w-40">Theme</TableHead>
                <TableHead className="w-40">Program</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading epics...
                  </TableCell>
                </TableRow>
              ) : epics?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No epics found
                  </TableCell>
                </TableRow>
              ) : (
                epics?.map(epic => (
                  <TableRow 
                    key={epic.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEpicId(epic.id)}
                  >
                    <TableCell className="font-mono text-sm">
                      {epic.epic_key || epic.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{epic.name}</TableCell>
                    <TableCell>{getStateBadge(epic.state)}</TableCell>
                    <TableCell><HealthBadge health={epic.health} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {epic.strategic_themes?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {epic.programs?.name || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="flex-1 overflow-auto">
          <EpicKanbanView 
            epics={epics || []} 
            onEpicClick={(epic: any) => setSelectedEpicId(epic.id)}
            onContextMenu={() => {}}
          />
        </div>
      )}

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={!!selectedEpicId}
          onClose={() => setSelectedEpicId(null)}
        />
      )}
    </div>
  );
}
