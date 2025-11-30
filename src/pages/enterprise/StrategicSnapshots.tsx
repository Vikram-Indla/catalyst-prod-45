import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Grid3x3, List } from 'lucide-react';
import { useState } from 'react';

export default function StrategicSnapshots() {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const snapshots = [
    { id: '1', name: 'Corporate Strategy 2024', date: '2024-01-01', status: 'Active' },
    { id: '2', name: 'Acme Snapshot 2023', date: '2023-01-01', status: 'Archived' },
    { id: '3', name: 'Corporate Strategy 2020', date: '2020-01-01', status: 'Archived' },
  ];

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search snapshots..."
              className="pl-9 h-8 sm:h-9"
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
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {snapshots.map((snapshot) => (
            <Card key={snapshot.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{snapshot.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Created: {snapshot.date}</div>
                  <div>Status: <span className={snapshot.status === 'Active' ? 'text-success' : 'text-muted-foreground'}>{snapshot.status}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="p-4 hover:bg-accent cursor-pointer flex items-center justify-between">
                  <div>
                    <div className="font-medium">{snapshot.name}</div>
                    <div className="text-sm text-muted-foreground">Created: {snapshot.date}</div>
                  </div>
                  <div className={`text-sm ${snapshot.status === 'Active' ? 'text-success' : 'text-muted-foreground'}`}>
                    {snapshot.status}
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
