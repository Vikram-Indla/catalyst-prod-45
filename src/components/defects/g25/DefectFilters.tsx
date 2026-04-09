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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8993A4' }} />
        <Input
          placeholder="Search by title, key, Jira ID..."
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-10"
          style={{ height: 32, fontSize: 13, fontFamily: 'Inter, sans-serif', borderColor: '#DFE1E6', borderRadius: 4, color: '#172B4D' }}
        />
      </div>

      <Select value={filters.status?.[0] || 'all'} onValueChange={v => onChange({ ...filters, status: v === 'all' ? undefined : [v as any] })}>
        <SelectTrigger style={{ width: 144, height: 32, fontSize: 13, fontFamily: 'Inter, sans-serif', borderColor: '#DFE1E6', borderRadius: 4, color: '#172B4D', backgroundColor: '#FFFFFF' }}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
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
        <SelectTrigger style={{ width: 128, height: 32, fontSize: 13, fontFamily: 'Inter, sans-serif', borderColor: '#DFE1E6', borderRadius: 4, color: '#172B4D', backgroundColor: '#FFFFFF' }}>
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severity</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority?.[0] || 'all'} onValueChange={v => onChange({ ...filters, priority: v === 'all' ? undefined : [v as any] })}>
        <SelectTrigger style={{ width: 128, height: 32, fontSize: 13, fontFamily: 'Inter, sans-serif', borderColor: '#DFE1E6', borderRadius: 4, color: '#172B4D', backgroundColor: '#FFFFFF' }}>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assignedTo || 'all'} onValueChange={v => onChange({ ...filters, assignedTo: v === 'all' ? undefined : v })}>
        <SelectTrigger style={{ width: 160, height: 32, fontSize: 13, fontFamily: 'Inter, sans-serif', borderColor: '#DFE1E6', borderRadius: 4, color: '#172B4D', backgroundColor: '#FFFFFF' }}>
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
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
