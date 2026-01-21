/**
 * Phase 5C: Access Audit Log Component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  FileText,
  Eye,
  Download,
  Edit,
  Trash2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAccessAudit } from '../../hooks/useAccessAudit';
import { format } from 'date-fns';

const actionIcons: Record<string, React.ElementType> = {
  view: Eye,
  export: Download,
  modify: Edit,
  delete: Trash2,
};

const actionColors: Record<string, string> = {
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  export: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  modify: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function AccessAuditLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  
  const { auditLogs, isLoading, stats } = useAccessAudit({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    limit: 100,
  });

  const filteredLogs = auditLogs.filter(log =>
    log.data_set_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Data Access Audit Log</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.totalLogs} entries</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard 
            icon={Eye} 
            label="Views" 
            value={stats.viewCount}
            color="text-blue-500"
          />
          <StatCard 
            icon={Download} 
            label="Exports" 
            value={stats.exportCount}
            color="text-green-500"
          />
          <StatCard 
            icon={Edit} 
            label="Modifications" 
            value={stats.modifyCount}
            color="text-amber-500"
          />
          <StatCard 
            icon={Trash2} 
            label="Deletions" 
            value={stats.deleteCount}
            color="text-red-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by data set or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="modify">Modify</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              className="w-[140px]"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              className="w-[140px]"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          {(dateRange.start || dateRange.end) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDateRange({})}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || actionFilter !== 'all' 
              ? 'No logs match your filters' 
              : 'No audit logs recorded yet'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Data Set</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Eye;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {log.user_name || 'Unknown User'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`gap-1 ${actionColors[log.action] || ''}`}
                      >
                        <ActionIcon className="h-3 w-3" />
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.data_set_name || (
                        <span className="text-muted-foreground italic">Deleted</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details && (
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                          {JSON.stringify(log.details).slice(0, 50)}...
                        </code>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
