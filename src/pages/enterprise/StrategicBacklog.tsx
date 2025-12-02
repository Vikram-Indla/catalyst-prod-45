import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download } from 'lucide-react';

export default function StrategicBacklog() {
  const epics = [
    { id: 'E-001', title: 'Digital Transformation Initiative', theme: 'Innovation', points: 89, progress: 45 },
    { id: 'E-002', title: 'Customer Experience Platform', theme: 'Customer', points: 144, progress: 23 },
    { id: 'E-003', title: 'Cloud Migration Project', theme: 'Infrastructure', points: 55, progress: 78 },
  ];

  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--s3)] mb-[var(--s6)]" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search epics..."
            className="pl-9"
            style={{ height: 'var(--grid-row)' }}
          />
        </div>
        
        <Select defaultValue="all-themes">
          <SelectTrigger className="w-[180px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-themes">All Themes</SelectItem>
            <SelectItem value="innovation">Innovation</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="infrastructure">Infrastructure</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Epic Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50" style={{ height: 'var(--grid-hdr)' }}>
                <th className="text-left px-4 text-sm font-medium">ID</th>
                <th className="text-left px-4 text-sm font-medium">Title</th>
                <th className="text-left px-4 text-sm font-medium">Theme</th>
                <th className="text-left px-4 text-sm font-medium">Story Points</th>
                <th className="text-left px-4 text-sm font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {epics.map((epic) => (
                <tr key={epic.id} className="border-b hover:bg-accent cursor-pointer" style={{ height: 'var(--grid-row)' }}>
                  <td className="px-4 text-sm font-mono">{epic.id}</td>
                  <td className="px-4 text-sm font-medium">{epic.title}</td>
                  <td className="px-4 text-sm">{epic.theme}</td>
                  <td className="px-4 text-sm">{epic.points}</td>
                  <td className="px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${epic.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{epic.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
