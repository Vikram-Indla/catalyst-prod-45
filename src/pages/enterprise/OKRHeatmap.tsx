import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function OKRHeatmap() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <Select defaultValue="all-status">
          <SelectTrigger className="w-[180px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">All Status</SelectItem>
            <SelectItem value="on-track">On track</SelectItem>
            <SelectItem value="at-risk">At risk</SelectItem>
            <SelectItem value="off-track">Off track</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="all-owners">
          <SelectTrigger className="w-[180px]" style={{ height: 'var(--grid-row)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-owners">All Owners</SelectItem>
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            className="pl-9"
            style={{ height: 'var(--grid-row)' }}
          />
        </div>
      </div>

      {/* TODO (needs confirmation): Heatmap grid layout and data fetching */}
      <Card>
        <CardHeader>
          <CardTitle>OKR Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2" style={{
            gridTemplateColumns: 'repeat(auto-fill, 160px)',
            gap: 'var(--s2)'
          }}>
            <div className="border rounded p-3" style={{ height: '72px' }}>
              <div className="text-sm font-medium">Sample Objective</div>
              <div className="text-xs text-muted-foreground mt-2">85% complete</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}