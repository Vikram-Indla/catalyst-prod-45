import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Shield } from 'lucide-react';

export default function EnterpriseImpediments() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search impediments..." className="pl-9" style={{ height: 'var(--grid-row)' }} />
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Impediment</Button>
      </div>

      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Enterprise Impediments</h2>
        <p className="text-muted-foreground">Track and resolve blockers across the organization</p>
      </Card>
    </div>
  );
}
