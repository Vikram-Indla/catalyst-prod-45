import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Download, MoreVertical, Grid3x3, List } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Theme {
  id: string;
  name: string;
  description: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  color_tag: string;
  start_date: string;
  end_date: string;
}

export default function EnterpriseThemes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['enterprise-themes', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'active' | 'cancelled' | 'done' | 'proposed');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'proposed': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'done': return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
      case 'cancelled': return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default: return 'bg-muted';
    }
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  const handleImport = () => {
    toast.info('Import feature coming soon');
  };

  const handleNewTheme = () => {
    toast.info('Create theme feature coming soon');
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Strategic Themes</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4 mr-2" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImport}>
                Import Themes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={handleNewTheme}>
            <Plus className="h-4 w-4 mr-2" />
            New Theme
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-muted/30">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : themes.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No themes found
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <Card
                key={theme.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-base line-clamp-2">
                      {theme.name}
                    </h3>
                    <Badge className={`text-xs ml-2 ${getStatusColor(theme.status)}`}>
                      {theme.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {theme.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {theme.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Created {format(new Date(theme.created_at), 'MMM dd, yyyy')}</span>
                    <span className="font-mono">{theme.id.slice(0, 8)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50" style={{ height: 'var(--grid-hdr)' }}>
                    <th className="text-left px-4 text-sm font-medium">ID</th>
                    <th className="text-left px-4 text-sm font-medium">Name</th>
                    <th className="text-left px-4 text-sm font-medium">Status</th>
                    <th className="text-left px-4 text-sm font-medium">Description</th>
                    <th className="text-left px-4 text-sm font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {themes.map((theme) => (
                    <tr
                      key={theme.id}
                      className="border-b hover:bg-accent cursor-pointer"
                      style={{ height: 'var(--grid-row)' }}
                    >
                      <td className="px-4 text-sm font-mono">{theme.id.slice(0, 8)}</td>
                      <td className="px-4 text-sm font-medium">{theme.name}</td>
                      <td className="px-4">
                        <Badge className={`text-xs ${getStatusColor(theme.status)}`}>
                          {theme.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 text-sm text-muted-foreground max-w-xs truncate">
                        {theme.description || '—'}
                      </td>
                      <td className="px-4 text-sm text-muted-foreground">
                        {format(new Date(theme.created_at), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
