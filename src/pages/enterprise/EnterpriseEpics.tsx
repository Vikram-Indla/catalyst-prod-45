import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter } from 'lucide-react';

export default function EnterpriseEpics() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search epics..." className="pl-9" style={{ height: 'var(--grid-row)' }} />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filters</Button>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Epic</Button>
      </div>

      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Enterprise Epics</h2>
        <p className="text-muted-foreground">View and manage epics across all portfolios</p>
      </Card>
    </div>
  );
}
