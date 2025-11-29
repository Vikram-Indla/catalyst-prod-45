import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Grid3x3, List, Filter, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function EnterpriseSuccessCriteria() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data: criteria, isLoading } = useQuery({
    queryKey: ['enterprise-success-criteria', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('success_criteria' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'draft': 'bg-secondary',
      'active': 'bg-primary',
      'met': 'bg-accent',
      'not-met': 'bg-destructive',
    };
    return colors[status?.toLowerCase()] || 'bg-muted';
  };

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex items-center justify-between mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <h1 className="text-2xl font-semibold">Success Criteria</h1>
        <div className="flex items-center gap-3">
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Criteria</Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search success criteria..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="met">Met</SelectItem>
              <SelectItem value="not-met">Not Met</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : !criteria || criteria.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No success criteria found</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criteria.map((item: any) => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium">{item.title}</h3>
                <Badge className={getStatusColor(item.status)}>{item.status || 'N/A'}</Badge>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
              )}
              {item.metric && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <span className="font-medium">Metric: </span>
                  <span className="text-muted-foreground">{item.metric}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Metric</th>
                  <th className="p-4 font-medium">Target Value</th>
                  <th className="p-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="p-4 font-medium">{item.title}</td>
                    <td className="p-4">
                      <Badge className={getStatusColor(item.status)}>{item.status || 'N/A'}</Badge>
                    </td>
                    <td className="p-4">{item.metric || '—'}</td>
                    <td className="p-4">{item.target_value || '—'}</td>
                    <td className="p-4 text-muted-foreground">{item.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
