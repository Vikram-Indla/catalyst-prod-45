import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';

export default function WorkSpendGrid() {
  const [selectedPiId, setSelectedPiId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [workItemType, setWorkItemType] = useState<'epic' | 'feature' | 'all'>('all');

  const { data: pis, isLoading: pisLoading } = useQuery({
    queryKey: ['program-increments-spend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: epics, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-spend', selectedPiId],
    enabled: !!selectedPiId && (workItemType === 'epic' || workItemType === 'all'),
    queryFn: async () => {
      const { data: epicPIs } = await supabase
        .from('epic_program_increments')
        .select('epic_id')
        .eq('pi_id', selectedPiId);

      if (!epicPIs || epicPIs.length === 0) return [];

      const epicIds = epicPIs.map(ep => ep.epic_id);

      const { data, error } = await supabase
        .from('epics')
        .select(`
          id,
          name,
          epic_key,
          epic_spend (
            forecasted_spend,
            estimated_spend,
            accepted_spend
          )
        `)
        .in('id', epicIds);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['features-spend', selectedPiId],
    enabled: !!selectedPiId && (workItemType === 'feature' || workItemType === 'all'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          name,
          display_id,
          estimate_points,
          pi_id
        `)
        .eq('pi_id', selectedPiId);

      if (error) throw error;
      return data || [];
    },
  });

  const filteredEpics = epics?.filter(epic =>
    epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.epic_key?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredFeatures = features?.filter(feature =>
    feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalForecastedSpend = filteredEpics.reduce((sum, epic) => 
    sum + (epic.epic_spend?.[0]?.forecasted_spend || 0), 0
  );

  const totalEstimatedSpend = filteredEpics.reduce((sum, epic) => 
    sum + (epic.epic_spend?.[0]?.estimated_spend || 0), 0
  );

  const totalAcceptedSpend = filteredEpics.reduce((sum, epic) => 
    sum + (epic.epic_spend?.[0]?.accepted_spend || 0), 0
  );

  const handleExport = () => {
    const csvContent = [
      ['Work Item Type', 'ID', 'Name', 'Forecasted Spend', 'Estimated Spend', 'Accepted Spend'],
      ...filteredEpics.map(epic => [
        'Epic',
        epic.epic_key || '',
        epic.name,
        epic.epic_spend?.[0]?.forecasted_spend || 0,
        epic.epic_spend?.[0]?.estimated_spend || 0,
        epic.epic_spend?.[0]?.accepted_spend || 0,
      ]),
      ...filteredFeatures.map(feature => [
        'Feature',
        feature.display_id || '',
        feature.name,
        '',
        feature.estimate_points || 0,
        '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-spend-grid-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">Work Spend Grid</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View forecasted, estimated, and accepted spend across work items
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Program Increment</label>
                  <Select value={selectedPiId} onValueChange={setSelectedPiId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PI" />
                    </SelectTrigger>
                    <SelectContent>
                      {pisLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        pis?.map((pi) => (
                          <SelectItem key={pi.id} value={pi.id}>
                            {pi.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Item Type</label>
                  <Select value={workItemType} onValueChange={(v) => setWorkItemType(v as 'epic' | 'feature' | 'all')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="epic">Epics</SelectItem>
                      <SelectItem value="feature">Features</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search work items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {selectedPiId && (workItemType === 'epic' || workItemType === 'all') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Forecasted Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-brand-gold">
                    ${totalForecastedSpend.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Estimated Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-brand-gold">
                    ${totalEstimatedSpend.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Accepted Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-brand-gold">
                    ${totalAcceptedSpend.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Data Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Work Items</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPiId ? (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a Program Increment to view spend data
                </div>
              ) : epicsLoading || featuresLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 text-sm font-medium">Type</th>
                        <th className="text-left p-3 text-sm font-medium">ID</th>
                        <th className="text-left p-3 text-sm font-medium">Name</th>
                        <th className="text-right p-3 text-sm font-medium">Forecasted Spend</th>
                        <th className="text-right p-3 text-sm font-medium">Estimated Spend</th>
                        <th className="text-right p-3 text-sm font-medium">Accepted Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(workItemType === 'epic' || workItemType === 'all') && filteredEpics.map((epic) => (
                        <tr key={epic.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-sm">Epic</td>
                          <td className="p-3 text-sm font-mono">{epic.epic_key}</td>
                          <td className="p-3 text-sm">{epic.name}</td>
                          <td className="p-3 text-sm text-right">
                            ${(epic.epic_spend?.[0]?.forecasted_spend || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-right">
                            ${(epic.epic_spend?.[0]?.estimated_spend || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-right">
                            ${(epic.epic_spend?.[0]?.accepted_spend || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {(workItemType === 'feature' || workItemType === 'all') && filteredFeatures.map((feature) => (
                        <tr key={feature.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-sm">Feature</td>
                          <td className="p-3 text-sm font-mono">{feature.display_id}</td>
                          <td className="p-3 text-sm">{feature.name}</td>
                          <td className="p-3 text-sm text-right">—</td>
                          <td className="p-3 text-sm text-right">
                            {feature.estimate_points || 0} pts
                          </td>
                          <td className="p-3 text-sm text-right">—</td>
                        </tr>
                      ))}
                      {filteredEpics.length === 0 && filteredFeatures.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No work items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
