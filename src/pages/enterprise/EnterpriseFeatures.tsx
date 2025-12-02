import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';

export default function EnterpriseFeatures() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--s3)] mb-[var(--s6)]" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search features..." className="pl-9" style={{ height: 'var(--grid-row)' }} />
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Feature</Button>
      </div>

      <Card className="p-[var(--s6)] sm:p-[var(--s8)] text-center">
        <h2 className="text-xl font-semibold mb-2">Enterprise Features</h2>
        <p className="text-muted-foreground">Track features across all programs</p>
      </Card>
    </div>
  );
}
