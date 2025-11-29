import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Grid3x3, List, Filter, Rocket } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function EnterpriseReleaseVehicles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['enterprise-release-vehicles', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('release_vehicles' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
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
      'planned': 'bg-secondary',
      'in-progress': 'bg-primary',
      'released': 'bg-accent',
      'archived': 'bg-muted',
    };
    return colors[status?.toLowerCase()] || 'bg-muted';
  };

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex items-center justify-between mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <h1 className="text-2xl font-semibold">Release Vehicles</h1>
        <div className="flex items-center gap-3">
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Release Vehicle</Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search release vehicles..."
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
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
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
      ) : !vehicles || vehicles.length === 0 ? (
        <Card className="p-8 text-center">
          <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No release vehicles found</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle: any) => (
            <Card key={vehicle.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium">{vehicle.name}</h3>
                <Badge className={getStatusColor(vehicle.status)}>{vehicle.status || 'N/A'}</Badge>
              </div>
              {vehicle.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{vehicle.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Version: {vehicle.version || 'N/A'}</span>
                {vehicle.release_date && <span>{new Date(vehicle.release_date).toLocaleDateString()}</span>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Version</th>
                  <th className="p-4 font-medium">Release Date</th>
                  <th className="p-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle: any) => (
                  <tr key={vehicle.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="p-4 font-medium">{vehicle.name}</td>
                    <td className="p-4">
                      <Badge className={getStatusColor(vehicle.status)}>{vehicle.status || 'N/A'}</Badge>
                    </td>
                    <td className="p-4">{vehicle.version || 'N/A'}</td>
                    <td className="p-4">
                      {vehicle.release_date ? new Date(vehicle.release_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4 text-muted-foreground">{vehicle.description || '—'}</td>
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
