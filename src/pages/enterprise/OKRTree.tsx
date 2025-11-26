import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight } from 'lucide-react';

export default function OKRTree() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals/objectives/KRs..."
            className="pl-9"
            style={{ height: 'var(--grid-row)' }}
          />
        </div>
        
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
      </div>

      {/* TODO (needs confirmation): Tree view with hierarchical goal/objective/KR structure */}
      <Card>
        <CardHeader>
          <CardTitle>OKR Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center gap-2 p-2 hover:bg-accent rounded" style={{ height: 'var(--grid-row)' }}>
              <ChevronRight className="h-4 w-4" />
              <span className="text-sm font-medium">Strategic Goal</span>
            </div>
            <div className="flex items-center gap-2 p-2 hover:bg-accent rounded" style={{ height: 'var(--grid-row)', paddingLeft: 'var(--s4)' }}>
              <ChevronRight className="h-4 w-4" />
              <span className="text-sm">Portfolio Objective</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}