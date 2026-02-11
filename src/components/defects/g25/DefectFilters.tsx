import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DefectFilters as DefectFiltersType } from '@/types/defects';

interface Props {
  filters: DefectFiltersType;
  onChange: (f: DefectFiltersType) => void;
  users: { id: string; full_name: string }[];
}

export function DefectFilters({ filters, onChange, users }: Props) {
  const hasFilters = !!(filters.search || filters.status?.length || filters.severity?.length || filters.priority?.length || filters.assignedTo);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search defects..." value={filters.search || ''} onChange={e => onChange({ ...filters, search: e.target.value })} className="pl-10" />
      </div>

      <Select value={filters.status?.[0] || 'all'} onValueChange={v => onChange({ ...filters, status: v === 'all' ? undefined : [v as any] })}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="fixed">Fixed</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="reopened">Reopened</SelectItem>
          <SelectItem value="deferred">Deferred</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.severity?.[0] || 'all'} onValueChange={v => onChange({ ...filters, severity: v === 'all' ? undefined : [v as any] })}>
        <SelectTrigger className="w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severity</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority?.[0] || 'all'} onValueChange={v => onChange({ ...filters, priority: v === 'all' ? undefined : [v as any] })}>
        <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assignedTo || 'all'} onValueChange={v => onChange({ ...filters, assignedTo: v === 'all' ? undefined : v })}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="h-4 w-4 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}
