import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Grid3x3, List, Filter, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function EnterpriseSprints() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: sprints, isLoading } = useQuery({
    queryKey: ['enterprise-sprints', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('iterations')
        .select('*')
        .order('start_date', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`);
      }

      if (statusFilter !== 'all') {
        const now = new Date().toISOString();
        if (statusFilter === 'active') {
          query = query.lte('start_date', now).gte('end_date', now);
        } else if (statusFilter === 'upcoming') {
          query = query.gt('start_date', now);
        } else if (statusFilter === 'completed') {
          query = query.lt('end_date', now);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getSprintStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return { label: 'Upcoming', color: 'bg-secondary' };
    if (now > end) return { label: 'Completed', color: 'bg-muted' };
    return { label: 'Active', color: 'bg-primary' };
  };

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex items-center justify-between mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <h1 className="text-2xl font-semibold">Sprints</h1>
        <div className="flex items-center gap-3">
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Sprint</Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sprints..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : !sprints || sprints.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No sprints found</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint: any) => {
            const status = getSprintStatus(sprint.start_date, sprint.end_date);
            return (
              <Card key={sprint.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{sprint.name}</h3>
                    <p className="text-sm text-muted-foreground">{sprint.code}</p>
                  </div>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>Start: {new Date(sprint.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>End: {new Date(sprint.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Start Date</th>
                  <th className="p-4 font-medium">End Date</th>
                </tr>
              </thead>
              <tbody>
                {sprints.map((sprint: any) => {
                  const status = getSprintStatus(sprint.start_date, sprint.end_date);
                  return (
                    <tr key={sprint.id} className="border-b hover:bg-muted/50 cursor-pointer">
                      <td className="p-4 font-medium">{sprint.name}</td>
                      <td className="p-4">{sprint.code}</td>
                      <td className="p-4">
                        <Badge className={status.color}>{status.label}</Badge>
                      </td>
                      <td className="p-4">{new Date(sprint.start_date).toLocaleDateString()}</td>
                      <td className="p-4">{new Date(sprint.end_date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
