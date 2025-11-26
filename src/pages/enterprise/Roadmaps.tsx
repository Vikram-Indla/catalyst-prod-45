import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Calendar, Grid3x3 } from 'lucide-react';

export default function Roadmaps() {
  return (
    <div className="h-full flex flex-col" style={{ padding: 'var(--s6)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6" style={{ height: 'var(--toolbar-h)' }}>
        <div className="flex items-center gap-3">
          <Select defaultValue="work">
            <SelectTrigger style={{ height: 'var(--grid-row)', minWidth: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="pi">Program Increment</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="feature-by">
            <SelectTrigger style={{ height: 'var(--grid-row)', minWidth: '200px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature-by">Feature by Program</SelectItem>
              <SelectItem value="epic">Epic by Portfolio</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="all-programs">
            <SelectTrigger style={{ height: 'var(--grid-row)', minWidth: '240px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-programs">All Programs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" style={{ height: 'var(--grid-row)', width: 'var(--grid-row)' }}>
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" style={{ height: 'var(--grid-row)', width: 'var(--grid-row)' }}>
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" style={{ height: 'var(--grid-row)' }}>
            View Configuration
          </Button>
          <Button variant="outline" size="sm" style={{ height: 'var(--grid-row)' }}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* TODO (needs confirmation): Split view with left grid and right timeline */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Roadmaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            TODO (needs confirmation): Implement split view with left grid columns (Expand/Icon/Title/Items/Story Points/State) 
            and right scrollable timeline with PI/sprint headers, feature bars, milestone flags, and objective markers.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}