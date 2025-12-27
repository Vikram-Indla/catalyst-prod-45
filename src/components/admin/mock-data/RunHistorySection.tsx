/**
 * Run History Section - View past mock data runs
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { History, RefreshCw, MoreHorizontal, Eye, Play, Upload, Trash2, Loader2 } from 'lucide-react';
import { MockRun } from '@/hooks/useMockDataRuns';
import { format } from 'date-fns';

interface RunHistorySectionProps {
  runs: MockRun[];
  onSelectRun: (run: MockRun) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  configuring: 'outline',
  generating: 'default',
  previewing: 'secondary',
  loading: 'default',
  loaded: 'secondary',
  cleaning: 'default',
  cleaned: 'secondary',
  error: 'destructive',
};

const SOURCE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  markdown: 'Markdown',
  text: 'Plain Text',
  synthetic: 'Synthetic',
};

export function RunHistorySection({ runs, onSelectRun, onRefresh, isLoading }: RunHistorySectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Run History
            </CardTitle>
            <CardDescription>
              View and manage past mock data runs
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No mock data runs yet</p>
            <p className="text-sm mt-1">Create a new run to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs">
                    {run.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(run.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {run.creator?.full_name || run.creator?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SOURCE_LABELS[run.source_type] || run.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[run.status] || 'outline'}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectRun(run)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {run.status === 'configuring' && (
                          <DropdownMenuItem onClick={() => onSelectRun(run)}>
                            <Play className="mr-2 h-4 w-4" />
                            Re-Generate
                          </DropdownMenuItem>
                        )}
                        {run.status === 'previewing' && (
                          <DropdownMenuItem onClick={() => onSelectRun(run)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Load
                          </DropdownMenuItem>
                        )}
                        {run.status === 'loaded' && (
                          <DropdownMenuItem onClick={() => onSelectRun(run)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cleanup
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
