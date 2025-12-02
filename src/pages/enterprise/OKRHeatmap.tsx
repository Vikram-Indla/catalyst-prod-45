import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useOKRHeatmap } from '@/hooks/useOKRHeatmap';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { HeatmapCell } from '@/components/okr/HeatmapCell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function OKRHeatmap() {
  const [searchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshotId') || undefined;
  const piIdsParam = searchParams.get('piIds');
  const piIds = piIdsParam?.split(',').filter(Boolean) || [];
  const [statusFilter, setStatusFilter] = useState('all-status');
  const [ownerFilter, setOwnerFilter] = useState('all-owners');
  const [searchQuery, setSearchQuery] = useState('');

  // If no piIds in URL, fetch top 2 PIs from database
  const { data: defaultPIs } = useQuery({
    queryKey: ['default-pis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id')
        .order('start_date', { ascending: false })
        .limit(2);
      if (error) throw error;
      return data?.map(pi => pi.id) || [];
    },
    enabled: piIds.length === 0,
  });

  const effectivePiIds = piIds.length > 0 ? piIds : (defaultPIs || []);
  const { data: heatmapData, isLoading } = useOKRHeatmap(snapshotId, effectivePiIds);
  
  const numPIs = heatmapData?.programIncrements?.length || 2;
  const gridColumns = `repeat(${numPIs}, 1fr) 200px 100px`;
  
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--s3)] mb-[var(--s6)]" style={{ height: 'var(--toolbar-h)' }}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">All Status</SelectItem>
            <SelectItem value="on-track">On track</SelectItem>
            <SelectItem value="at-risk">At risk</SelectItem>
            <SelectItem value="off-track">Off track</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-owners">All Owners</SelectItem>
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ height: 'var(--grid-row)' }}
          />
        </div>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader>
          <CardTitle>OKR Heatmap by Program Increment</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-[var(--s4)]">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !heatmapData || heatmapData.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No OKR data available. Select a snapshot and program increments to view the heatmap.
            </div>
          ) : (
            <div className="space-y-[var(--s4)]">
              {/* Header Row */}
              <div className="grid gap-[var(--s2)]" style={{
                gridTemplateColumns: gridColumns
              }}>
                {heatmapData.programIncrements.map((pi) => (
                  <div key={pi.id} className="font-medium text-sm text-center">
                    {pi.name}
                  </div>
                ))}
                <div className="font-medium text-sm">Level</div>
                <div className="font-medium text-sm text-center">Item Count</div>
              </div>

              {/* Data Rows */}
              {heatmapData.rows.map((row) => (
                <div key={row.level}>
                  <div className="grid gap-[var(--s2)]" style={{ 
                    gridTemplateColumns: row.spanAllColumns 
                      ? `repeat(${numPIs}, 1fr) 200px 100px` 
                      : gridColumns
                  }}>
                    {row.spanAllColumns ? (
                      <>
                        <div style={{ gridColumn: `span ${numPIs}` }}>
                          <HeatmapCell 
                            percentage={row.cells[0]?.percentage} 
                            avgScore={row.cells[0]?.avgScore}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{row.level}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <Badge variant="outline" className="text-xs">
                            {row.itemCount}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <>
                        {row.cells.map((cell, idx) => (
                          <HeatmapCell 
                            key={idx} 
                            percentage={cell.percentage} 
                            avgScore={cell.avgScore}
                          />
                        ))}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{row.level}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <Badge variant="outline" className="text-xs">
                            {row.itemCount}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}