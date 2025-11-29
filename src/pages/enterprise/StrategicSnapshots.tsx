import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Grid3x3, List } from 'lucide-react';
import { useState } from 'react';
import { useStrategySnapshots } from '@/hooks/useStrategySnapshots';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function StrategicSnapshots() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: snapshots = [], isLoading } = useStrategySnapshots();
  
  const filteredSnapshots = snapshots.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1" style={{ minWidth: '320px' }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search snapshots..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 'var(--grid-row)' }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Snapshot
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredSnapshots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No snapshots found
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnapshots.map((snapshot) => (
            <Card key={snapshot.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{snapshot.name}</CardTitle>
                  {snapshot.is_active && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  {snapshot.description && (
                    <p className="text-muted-foreground line-clamp-2">{snapshot.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created: {format(new Date(snapshot.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                  {snapshot.start_date && snapshot.end_date && (
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(snapshot.start_date), 'MMM yyyy')} - {format(new Date(snapshot.end_date), 'MMM yyyy')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="p-4 hover:bg-accent cursor-pointer flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{snapshot.name}</div>
                      {snapshot.is_active && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {format(new Date(snapshot.created_at), 'MMM dd, yyyy')}
                      {snapshot.start_date && snapshot.end_date && (
                        <> • {format(new Date(snapshot.start_date), 'MMM yyyy')} - {format(new Date(snapshot.end_date), 'MMM yyyy')}</>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
