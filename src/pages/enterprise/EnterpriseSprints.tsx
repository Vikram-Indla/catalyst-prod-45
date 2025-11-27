import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';

export default function EnterpriseSprints() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sprints..." className="pl-9" style={{ height: 'var(--grid-row)' }} />
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Sprint</Button>
      </div>

      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Enterprise Sprints</h2>
        <p className="text-muted-foreground">View sprints across all teams</p>
      </Card>
    </div>
  );
}
