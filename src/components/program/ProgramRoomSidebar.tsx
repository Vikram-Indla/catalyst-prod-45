import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Layers, Zap, Database, Map, Lightbulb, Network, BarChart3, Menu, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ProgramRoomSidebarProps {
  programId: string;
}

export function ProgramRoomSidebar({ programId }: ProgramRoomSidebarProps) {
  const navigate = useNavigate();
  const params = useParams();
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [moreItemsOpen, setMoreItemsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [morePagesOpen, setMorePagesOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);

  // Fetch program details
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            name
          )
        `)
        .eq('id', programId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Fetch program increments for the program's portfolio
  const { data: programIncrements, isLoading: piLoading } = useQuery({
    queryKey: ['program-increments', program?.portfolio_id],
    queryFn: async () => {
      if (!program?.portfolio_id) return [];
      
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, start_date, end_date')
        .eq('portfolio_id', program.portfolio_id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!program?.portfolio_id,
  });

  const menuItems = [
    { id: 'room', label: 'Program Room', icon: Layers, path: `/programs/${programId}/room` },
    { id: 'features', label: 'Features', icon: Zap, path: `/programs/${programId}/features` },
    { id: 'backlog', label: 'Backlog', icon: Database, path: `/programs/${programId}/backlog` },
    { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: `/programs/${programId}/roadmaps` },
    { id: 'objective-tree', label: 'Objective Tree', icon: Lightbulb, path: `/programs/${programId}/objective-tree` },
    { id: 'work-tree', label: 'Work Tree', icon: Network, path: `/programs/${programId}/work-tree` },
    { id: 'program-board', label: 'Program Board', icon: BarChart3, path: `/programs/${programId}/program-board` },
    { id: 'forecast', label: 'Forecast', icon: Map, path: `/programs/${programId}/forecast` },
    { id: 'capacity', label: 'Capacity', icon: Users, path: `/programs/${programId}/capacity` },
  ];

  const isActive = (path: string) => {
    return window.location.pathname === path;
  };

  if (programLoading) {
    return (
      <aside className="w-60 border-r bg-card flex flex-col">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </aside>
    );
  }

  if (!program) return null;

  return (
    <aside className="w-60 border-r bg-card flex flex-col">
      <ScrollArea className="flex-1">
        {/* Program Selector */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{program.name}</div>
              <div className="text-xs text-muted-foreground">Program</div>
            </div>
          </div>

          {/* Program Increment Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">PROGRAM INCREMENT</label>
            {piLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={selectedPI} onValueChange={setSelectedPI}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select PI..." />
                </SelectTrigger>
                <SelectContent>
                  {programIncrements?.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="p-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 mb-1",
                isActive(item.path) && "bg-accent text-accent-foreground font-medium"
              )}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}

          {/* More Items Expandable */}
          <Collapsible open={moreItemsOpen} onOpenChange={setMoreItemsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  More items
                </div>
                {moreItemsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => navigate('/items/epics')}
              >
                Epics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => navigate('/items/stories')}
              >
                Stories
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => navigate('/dependencies')}
              >
                Dependencies
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Reports Expandable */}
          <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Reports
                </div>
                {reportsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                Program Reports
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* More Pages Expandable */}
          <Collapsible open={morePagesOpen} onOpenChange={setMorePagesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  More pages
                </div>
                {morePagesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                Additional Pages
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Teams Expandable */}
          <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Teams
                </div>
                {teamsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                View Teams
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Programs Settings at Bottom */}
        <div className="p-2 border-t mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => navigate(`/programs/${programId}/settings`)}
          >
            <Settings className="h-4 w-4" />
            Programs settings
          </Button>
        </div>
      </ScrollArea>
    </aside>
  );
}
