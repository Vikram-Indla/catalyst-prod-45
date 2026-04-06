import { useNavigate } from 'react-router-dom';
import { MoreVertical, ExternalLink } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Defect } from '@/types/defects';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  defects: Defect[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (defect: Defect) => void;
}

export function DefectTable({ defects, selectedIds, onSelectionChange, onDelete }: Props) {
  const navigate = useNavigate();

  const toggleAll = () => {
    onSelectionChange(selectedIds.size === defects.length ? new Set() : new Set(defects.map(d => d.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    onSelectionChange(s);
  };
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-9" style={{ backgroundColor: 'var(--bg-1, #F8FAFC)' }}>
          <TableHead className="w-10" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}><Checkbox checked={defects.length > 0 && selectedIds.size === defects.length} onCheckedChange={toggleAll} /></TableHead>
          <TableHead className="w-28" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Key</TableHead>
          <TableHead style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Title</TableHead>
          <TableHead className="w-24" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Severity</TableHead>
          <TableHead className="w-24" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Priority</TableHead>
          <TableHead className="w-28" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Status</TableHead>
          <TableHead className="w-36" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Assignee</TableHead>
          <TableHead className="w-24" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>Age</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {defects.map(d => (
          <TableRow key={d.id} className={cn("cursor-pointer hover:bg-muted/50", selectedIds.has(d.id) && "bg-primary/5")} style={{ height: 36, maxHeight: 36, minHeight: 36 }} onClick={() => navigate(`/testhub/defects/${d.id}`)}>
            <TableCell style={{ padding: '0 12px' }} onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => toggleOne(d.id)} /></TableCell>
            <TableCell style={{ padding: '0 12px' }} className="font-mono text-sm text-primary">{d.defect_key}</TableCell>
            <TableCell style={{ padding: '0 12px' }} className="max-w-md truncate font-medium">{d.title}</TableCell>
            <TableCell style={{ padding: '0 12px' }}><SeverityBadge severity={d.severity} /></TableCell>
            <TableCell style={{ padding: '0 12px' }}><PriorityBadge priority={d.priority} /></TableCell>
            <TableCell style={{ padding: '0 12px' }}><StatusBadge status={d.status} /></TableCell>
            <TableCell style={{ padding: '0 12px' }}>
              {d.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarImage src={d.assignee.avatar_url || undefined} /><AvatarFallback className="text-xs">{initials(d.assignee.full_name)}</AvatarFallback></Avatar>
                  <span className="text-sm truncate">{d.assignee.full_name}</span>
                </div>
              ) : <span className="text-sm text-muted-foreground">Unassigned</span>}
            </TableCell>
            <TableCell style={{ padding: '0 12px' }} className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: false })}</TableCell>
            <TableCell style={{ padding: '0 12px' }} onClick={e => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/testhub/defects/${d.id}`)}>View Details</DropdownMenuItem>
                  {d.external_url && <DropdownMenuItem onClick={() => window.open(d.external_url!, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Open External</DropdownMenuItem>}
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(d)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
