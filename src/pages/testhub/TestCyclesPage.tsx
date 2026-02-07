/**
 * Test Cycles Page — TestHub Module (Database Wired)
 * Route: /testhub/cycles
 */

import { useState } from 'react';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestCycles } from '@/hooks/test-management';
import { cn } from '@/lib/utils';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function TestCyclesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: cycles = [], isLoading, refetch } = useTestCycles(DEFAULT_PROJECT_ID);
  const filteredCycles = cycles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 p-6 overflow-auto bg-surface-1">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Test Cycles</h1>
            <p className="text-sm text-text-secondary">{cycles.length} cycles</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Cycle</Button>
        </div>
      </div>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search cycles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-36" />)}</div>
      ) : filteredCycles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>No cycles found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCycles.map(cycle => (
            <Card key={cycle.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex justify-between"><CardTitle className="text-base">{cycle.name}</CardTitle><Badge variant="outline" className="capitalize">{cycle.status}</Badge></div>
                <CardDescription className="font-mono text-xs">{cycle.key}</CardDescription>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">{cycle.total_cases || 0} test cases</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
