import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, CheckSquare, Plus, Minus, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { usePIProgress } from '@/hooks/usePIProgress';

interface EpicBacklogViewProps {
  portfolioId?: string;
  piId?: string;
}

export function EpicBacklogView({ portfolioId, piId }: EpicBacklogViewProps) {
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  const [unassignedExpanded, setUnassignedExpanded] = useState(false);
  
  const { data: piProgress } = usePIProgress(piId || 'pi-5');

  // Fetch epics
  const { data: epics } = useQuery({
    queryKey: ['epic-backlog', piId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .is('deleted_at', null)
        .is('parked_at', null)
        .order('global_rank');
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (state?: string) => {
    switch (state) {
      case 'not_started':
        return 'bg-muted-foreground';
      case 'in_progress':
        return 'bg-brand-gold';
      case 'done':
        return 'bg-success';
      default:
        return 'bg-warning';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">All Programs for Digital Services</h1>

      {/* Epics for PI-5 Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEpicsExpanded(!epicsExpanded)}
              className="p-0 h-auto hover:bg-transparent"
            >
              {epicsExpanded ? (
                <Minus className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
            </Button>
            <h2 className="text-lg font-semibold">Epics for PI-5</h2>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">Total Items: {epics?.length || 30}</span>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <TrendingUp className="h-4 w-4" />
              Prioritize
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">PI Progress:</span>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-gold transition-all" 
                  style={{ width: `${piProgress?.percentage || 0}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {epicsExpanded ? (
          <div className="border rounded-lg bg-card overflow-hidden">
            {/* Quick Add Row */}
            <div className="border-b px-4 py-3 bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Input 
                    placeholder="New Epic Name..."
                    className="max-w-xs bg-background"
                  />
                  <Select>
                    <SelectTrigger className="w-[160px] bg-background">
                      <SelectValue placeholder="Select Program" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      <SelectItem value="p1">Program A</SelectItem>
                      <SelectItem value="p2">Program B</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                <Select>
                  <SelectTrigger className="w-[140px] bg-background">
                    <SelectValue placeholder="Labels" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="program">Program Labels</SelectItem>
                    <SelectItem value="parent">Parent Labels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table Header */}
            <div className="border-b bg-muted/20">
              <div className="grid grid-cols-[40px,60px,80px,1fr,120px] gap-4 px-4 py-3 text-sm font-medium text-muted-foreground">
                <div></div>
                <div className="text-center">#</div>
                <div>ID</div>
                <div>Epic</div>
                <div className="text-right">WSJF<br/>Prioritization</div>
              </div>
            </div>

            {/* Epic Rows */}
            <div>
              {[
                { id: 1, epicId: 1168, name: 'AI for Improved Call Center Interactions', wsjf: 10, badges: ['Opportunity', 'Sales O...', 'e2e', 'PI7', 'PI6', 'PI5'], color: 'bg-brand-gold' },
                { id: 2, epicId: 1110, name: 'Microservices for MDM', wsjf: 5.12, badges: ['PI9', 'PI6', 'PI5'], color: 'bg-destructive' },
                { id: 3, epicId: 3, name: 'UX Refactor', wsjf: 2.65, badges: ['PI11', 'PI7', 'PI10', 'PI6', 'PI5'], color: 'bg-primary' },
                { id: 4, epicId: 672, name: 'Virtualized sizing model', wsjf: 4.88, badges: ['PI7', 'PI6', 'PI5'], color: 'bg-brand-gold' },
                { id: 5, epicId: 1143, name: 'Quality and DevOps Automation Integrations', wsjf: 4.62, badges: ['G12', 'PI7', 'PI6', 'PI5'], color: 'bg-brand-gold' },
                { id: 6, epicId: 1141, name: 'Hadoop CSI AC5', wsjf: 4.5, badges: ['G12', 'PI5'], color: 'bg-destructive' },
                { id: 7, epicId: 1111, name: 'Interface: E2E transcription flow (with PPFW) and flow tracking / alarming', wsjf: 4.25, badges: ['PI7', 'PI6', 'PI5'], color: 'bg-muted' },
                { id: 8, epicId: 1128, name: 'Configurable Themes', wsjf: 4.25, badges: ['PI6', 'PI5'], color: 'bg-brand-gold' },
              ].map((epic) => (
                <div
                  key={epic.id}
                  className="grid grid-cols-[40px,60px,80px,1fr,120px] gap-4 px-4 py-3 border-b hover:bg-accent/10 transition-colors group"
                >
                  <div className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm text-center text-muted-foreground flex items-center justify-center">
                    {epic.id}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", epic.color)} />
                    <span className="text-sm font-mono">{epic.epicId}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">{epic.name}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {epic.badges.map((badge, idx) => (
                        <Badge
                          key={idx}
                          className={cn(
                            "text-xs px-2 py-0.5 border-0",
                            badge === 'Opportunity' && "bg-warning/20 hover:bg-warning/30 text-warning-foreground",
                            badge.startsWith('Sales') && "bg-accent hover:bg-accent/80 text-accent-foreground",
                            badge === 'e2e' && "bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground",
                            badge === 'PI7' && "bg-success hover:bg-success/80 text-success-foreground",
                            badge === 'PI6' && "bg-muted hover:bg-muted/80 text-muted-foreground",
                            badge === 'PI5' && "bg-brand-gold hover:bg-brand-gold/80 text-white",
                            badge === 'PI9' && "bg-destructive/60 hover:bg-destructive/70 text-white",
                            badge === 'PI10' && "bg-accent/60 hover:bg-accent/70 text-white",
                            badge === 'PI11' && "bg-warning/40 hover:bg-warning/50 text-warning-foreground",
                            badge === 'G12' && "bg-workitem-theme hover:bg-workitem-theme/80 text-white"
                          )}
                        >
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-semibold">{epic.wsjf}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed rounded-md py-20 bg-muted/10">
            <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Drag & Drop Items Here
            </p>
          </div>
        )}
      </div>

      {/* Unassigned Backlog Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnassignedExpanded(!unassignedExpanded)}
              className="p-0 h-auto hover:bg-transparent"
            >
              {unassignedExpanded ? (
                <Minus className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
            </Button>
            <h2 className="text-lg font-semibold">Unassigned Backlog</h2>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">Total Items: 207</span>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <TrendingUp className="h-4 w-4" />
              Prioritize
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {!unassignedExpanded && (
          <div className="border border-dashed rounded-md py-20 bg-muted/10">
            <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Drag & Drop Items Here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
