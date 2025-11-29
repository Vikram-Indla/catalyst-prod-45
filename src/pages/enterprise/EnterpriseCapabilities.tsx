import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Download, Upload, Grid3X3, List } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function EnterpriseCapabilities() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: capabilities = [], isLoading } = useQuery({
    queryKey: ['enterprise-capabilities', stateFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('capabilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (stateFilter !== 'all') {
        query = query.eq('state', stateFilter as any);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      backlog: 'bg-gray-100 text-gray-800 border-gray-200',
      analyzing: 'bg-blue-100 text-blue-800 border-blue-200',
      implementing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      done: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[state] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Capabilities</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage capabilities across the enterprise
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Capability
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search capabilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="analyzing">Analyzing</SelectItem>
              <SelectItem value="implementing">Implementing</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : capabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground text-lg mb-2">No capabilities found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || stateFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first capability to get started'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((capability: any) => (
              <div
                key={capability.id}
                className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-foreground line-clamp-2">
                    {capability.name}
                  </h3>
                  <Badge className={getStateColor(capability.state || 'backlog')}>
                    {capability.state || 'Backlog'}
                  </Badge>
                </div>
                {capability.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {capability.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>ID: {capability.capability_key || capability.id.slice(0, 8)}</span>
                  <span>{new Date(capability.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    State
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y">
                {capabilities.map((capability: any) => (
                  <tr
                    key={capability.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono">
                      {capability.capability_key || capability.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{capability.name}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStateColor(capability.state || 'backlog')}>
                        {capability.state || 'Backlog'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(capability.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
