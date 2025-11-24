import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DependencyRisk() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: dependencies } = useQuery({
    queryKey: ['dependency-risks', selectedProgramId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(name, program_id),
          to_feature:features!dependencies_to_feature_id_fkey(name, program_id)
        `);
      
      if (error) throw error;
      
      // Filter by program if selected
      if (selectedProgramId) {
        return data?.filter(d => 
          d.from_feature?.program_id === selectedProgramId || 
          d.to_feature?.program_id === selectedProgramId
        );
      }
      
      return data;
    },
  });

  const getRiskMetrics = () => {
    const total = dependencies?.length || 0;
    const high = dependencies?.filter(d => d.risk_level === 'high').length || 0;
    const med = dependencies?.filter(d => d.risk_level === 'med').length || 0;
    const low = dependencies?.filter(d => d.risk_level === 'low').length || 0;
    const open = dependencies?.filter(d => d.status === 'open').length || 0;
    
    return { total, high, med, low, open };
  };

  const metrics = getRiskMetrics();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dependency Risk Analysis</h1>
        <p className="text-muted-foreground">Track and manage dependency risks</p>
      </div>

      <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="All Programs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Programs</SelectItem>
          {programs?.map((program) => (
            <SelectItem key={program.id} value={program.id}>
              {program.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-4 gap-4">
        <KPIWidgetCard
          title="Total Dependencies"
          value={metrics.total}
          subtitle={`${metrics.open} open`}
          icon={AlertCircle}
        />
        <KPIWidgetCard
          title="High Risk"
          value={metrics.high}
          subtitle="Critical dependencies"
          icon={AlertCircle}
        />
        <KPIWidgetCard
          title="Medium Risk"
          value={metrics.med}
          subtitle="Moderate risk"
          icon={AlertTriangle}
        />
        <KPIWidgetCard
          title="Low Risk"
          value={metrics.low}
          subtitle="Minimal impact"
          icon={CheckCircle}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2 text-center p-6 border rounded-lg border-destructive/20 bg-destructive/5">
              <div className="text-4xl font-bold text-destructive">{metrics.high}</div>
              <div className="text-sm font-medium">High Risk</div>
              <div className="text-xs text-muted-foreground">
                {metrics.total > 0 ? `${Math.round((metrics.high / metrics.total) * 100)}%` : '0%'} of total
              </div>
            </div>
            <div className="space-y-2 text-center p-6 border rounded-lg border-warning/20 bg-warning/5">
              <div className="text-4xl font-bold text-warning">{metrics.med}</div>
              <div className="text-sm font-medium">Medium Risk</div>
              <div className="text-xs text-muted-foreground">
                {metrics.total > 0 ? `${Math.round((metrics.med / metrics.total) * 100)}%` : '0%'} of total
              </div>
            </div>
            <div className="space-y-2 text-center p-6 border rounded-lg border-success/20 bg-success/5">
              <div className="text-4xl font-bold text-success">{metrics.low}</div>
              <div className="text-sm font-medium">Low Risk</div>
              <div className="text-xs text-muted-foreground">
                {metrics.total > 0 ? `${Math.round((metrics.low / metrics.total) * 100)}%` : '0%'} of total
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>High Risk Dependencies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dependencies
              ?.filter(d => d.risk_level === 'high')
              .slice(0, 10)
              .map((dep) => (
                <div key={dep.id} className="flex items-center justify-between p-3 border rounded-lg border-destructive/20">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {dep.from_feature?.name} → {dep.to_feature?.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Type: {dep.type} • Status: {dep.status}
                    </div>
                  </div>
                  <Badge className="bg-destructive">High Risk</Badge>
                </div>
              ))}
            {(!dependencies || dependencies.filter(d => d.risk_level === 'high').length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                No high-risk dependencies found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
