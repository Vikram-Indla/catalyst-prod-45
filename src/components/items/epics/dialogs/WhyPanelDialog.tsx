import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Award, Target, TrendingUp, FileText, Briefcase } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhyPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epic: any;
}

export function WhyPanelDialog({ open, onOpenChange, epic }: WhyPanelDialogProps) {
  // Fetch parent theme
  const { data: theme } = useQuery({
    queryKey: ['theme-for-why', epic?.theme_id],
    queryFn: async () => {
      if (!epic?.theme_id) return null;
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', epic.theme_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!epic?.theme_id && open,
  });

  // Fetch WSJF scores
  const { data: wsjfScores } = useQuery({
    queryKey: ['wsjf-for-why', epic?.id],
    queryFn: async () => {
      if (!epic?.id) return null;
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!epic?.id && open,
  });

  // Fetch value metrics
  const { data: valueMetrics } = useQuery({
    queryKey: ['value-metrics-for-why', epic?.id],
    queryFn: async () => {
      if (!epic?.id) return null;
      const { data, error } = await supabase
        .from('epic_value_metrics')
        .select('*')
        .eq('epic_id', epic.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!epic?.id && open,
  });

  // Get epic state display
  const getStateDisplay = (state: string | null) => {
    const states: Record<string, { label: string; color: string }> = {
      funnel: { label: '1 - Funnel', color: 'bg-gray-500' },
      analysis: { label: '2 - Analysis', color: 'bg-blue-500' },
      backlog: { label: '3 - Backlog', color: 'bg-yellow-500' },
      implementing: { label: '4 - Implementing', color: 'bg-orange-500' },
      done: { label: '5 - Done', color: 'bg-green-500' },
    };
    return states[state || 'funnel'] || states.funnel;
  };

  const epicState = getStateDisplay(epic?.state);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto bg-[#f8f8f8]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-semibold text-[#1a1a1a] flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Why are we building this?
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Context and rationale for this epic
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* WHY Epic Section */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                <Target className="h-4 w-4" />
                WHY Epic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={`${epicState.color} text-white`}>
                  {epicState.label}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="font-medium text-[#1a1a1a]">{epic?.name}</span>
              </div>
              {valueMetrics ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className="text-lg font-semibold text-primary">{valueMetrics.business_value || 0}</div>
                    <div className="text-xs text-muted-foreground">Business Value</div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className="text-lg font-semibold text-primary">{valueMetrics.risk_reduction || 0}</div>
                    <div className="text-xs text-muted-foreground">Risk Reduction</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No value currently linked to this epic.</p>
              )}
            </CardContent>
          </Card>

          {/* WHY Theme Section */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                <Award className="h-4 w-4" />
                WHY Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {theme ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">
                      {theme.status || 'Not Set'}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-[#1a1a1a]">{theme.name}</div>
                  
                  {wsjfScores?.global_rank && wsjfScores.global_rank <= 10 && (
                    <Alert className="bg-primary/10 border-primary/20">
                      <AlertDescription className="text-sm">
                        <span className="font-semibold text-primary">IS A TOP 10 RANKED</span> item (rank {wsjfScores.global_rank})
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {theme.description && (
                    <div className="text-sm text-muted-foreground">
                      {theme.description}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No theme currently linked to this epic.</p>
              )}
            </CardContent>
          </Card>

          {/* WSJF Scoring Section */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                WSJF Scoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wsjfScores ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{wsjfScores.wsjf_score?.toFixed(1) || '0.0'}</div>
                      <div className="text-xs text-muted-foreground">WSJF Score</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-[#1a1a1a]">#{wsjfScores.global_rank || '-'}</div>
                      <div className="text-xs text-muted-foreground">Global Rank</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold">{wsjfScores.business_value || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Business Value</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{wsjfScores.time_value || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Time Criticality</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{wsjfScores.rroe_value || 0}</div>
                      <div className="text-[10px] text-muted-foreground">RR/OE</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{wsjfScores.job_size || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Job Size</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No WSJF scoring currently linked to this epic.</p>
              )}
            </CardContent>
          </Card>

          {/* WHY Success Measurement Section */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                <FileText className="h-4 w-4" />
                WHY Success Measurement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                No success criteria currently linked to this item.
              </p>
            </CardContent>
          </Card>

          {/* WHY Business Case Section */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                <Briefcase className="h-4 w-4" />
                WHY Business Case
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                A business case is not currently linked to this item.
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
