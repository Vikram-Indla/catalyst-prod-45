import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Briefcase, 
  Layers, 
  TrendingUp, 
  FileText, 
  Rocket, 
  CheckSquare, 
  AlertCircle,
  CheckCircle2,
  Circle
} from 'lucide-react';

export default function PortfolioRoom() {
  const { data: themes, isLoading: themesLoading } = useQuery({
    queryKey: ['strategic_themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: initiatives, isLoading: initiativesLoading } = useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('*, strategic_themes(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: brs, isLoading: brsLoading } = useQuery({
    queryKey: ['business_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: epics, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      active: { variant: 'default', icon: CheckCircle2 },
      proposed: { variant: 'secondary', icon: Circle },
      in_progress: { variant: 'default', icon: TrendingUp },
      implementing: { variant: 'default', icon: TrendingUp },
      done: { variant: 'outline', icon: CheckCircle2 },
      cancelled: { variant: 'destructive', icon: AlertCircle },
    };
    
    const config = statusMap[status] || { variant: 'outline', icon: Circle };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getHealthBadge = (health: string) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    };
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[health as keyof typeof colors] || colors.green}`} />
        <span className="text-sm capitalize">{health}</span>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Portfolio Room</h1>
        <p className="text-muted-foreground">Strategic overview and portfolio health</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{themesLoading ? '...' : themes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Strategic themes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initiativesLoading ? '...' : initiatives?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active initiatives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Business Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brsLoading ? '...' : brs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Epics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{epicsLoading ? '...' : epics?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total epics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuresLoading ? '...' : features?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total features</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Themes */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Themes</CardTitle>
          <CardDescription>High-level strategic investment areas</CardDescription>
        </CardHeader>
        <CardContent>
          {themesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : themes && themes.length > 0 ? (
            <div className="space-y-3">
              {themes.map((theme) => (
                <div key={theme.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{theme.name}</h3>
                        {getStatusBadge(theme.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
                    </div>
                    {theme.color_tag && (
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: theme.color_tag }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No strategic themes found</p>
          )}
        </CardContent>
      </Card>

      {/* Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle>Initiatives</CardTitle>
          <CardDescription>Active initiatives driving portfolio goals</CardDescription>
        </CardHeader>
        <CardContent>
          {initiativesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : initiatives && initiatives.length > 0 ? (
            <div className="space-y-3">
              {initiatives.map((initiative) => (
                <div key={initiative.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{initiative.name}</h3>
                        {getStatusBadge(initiative.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{initiative.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">WSJF:</span>
                      <span className="ml-1 font-medium">{initiative.wsjf_score}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Benefit:</span>
                      <span className="ml-1 font-medium">{initiative.benefit_score}</span>
                    </div>
                    {initiative.strategic_themes && (
                      <div>
                        <span className="text-muted-foreground">Theme:</span>
                        <span className="ml-1 font-medium">{initiative.strategic_themes.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No initiatives found</p>
          )}
        </CardContent>
      </Card>

      {/* Features Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Features in Progress</CardTitle>
          <CardDescription>Active features across programs</CardDescription>
        </CardHeader>
        <CardContent>
          {featuresLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : features && features.length > 0 ? (
            <div className="space-y-2">
              {features.slice(0, 5).map((feature) => (
                <div key={feature.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{feature.name}</h4>
                      {getStatusBadge(feature.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getHealthBadge(feature.health)}
                    <div className="text-sm">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="ml-1 font-medium">{feature.progress_pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No features found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
