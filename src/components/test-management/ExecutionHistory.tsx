/**
 * Execution History - Shows audit trail of test executions
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  PlayCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ExecutionHistoryEntry {
  id: string;
  testCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  cycleId: string;
  cycleName: string;
  previousStatus: string | null;
  newStatus: string;
  executedBy: string;
  executedByName: string;
  executedAt: string;
  duration?: number;
  comment?: string;
  defectsLinked?: string[];
}

interface ExecutionHistoryProps {
  entries: ExecutionHistoryEntry[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  passed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  blocked: <AlertCircle className="h-4 w-4 text-amber-500" />,
  skipped: <MinusCircle className="h-4 w-4 text-blue-500" />,
  in_progress: <PlayCircle className="h-4 w-4 text-yellow-500" />,
  not_executed: <Clock className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_COLORS: Record<string, string> = {
  passed: 'bg-green-500/10 text-green-500 border-green-500/30',
  failed: 'bg-red-500/10 text-red-500 border-red-500/30',
  blocked: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  skipped: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  not_executed: 'bg-muted text-muted-foreground border-muted',
};

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
  entries,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchQuery === '' ||
      entry.testCaseKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.testCaseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.cycleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.executedByName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || entry.newStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-gold" />
            Execution History
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => toggleExpanded(entry.id)}
                >
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
                      {entry.executedByName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{entry.executedByName}</span>
                      <span className="text-muted-foreground">executed</span>
                      <span className="font-medium text-brand-gold">{entry.testCaseKey}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {entry.testCaseTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(entry.executedAt)}</span>
                      <span>•</span>
                      <span>{entry.cycleName}</span>
                      {entry.duration && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(entry.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.previousStatus && (
                      <>
                        <Badge variant="outline" className={STATUS_COLORS[entry.previousStatus]}>
                          {STATUS_ICONS[entry.previousStatus]}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge variant="outline" className={STATUS_COLORS[entry.newStatus]}>
                      {STATUS_ICONS[entry.newStatus]}
                      <span className="ml-1 capitalize">{entry.newStatus.replace('_', ' ')}</span>
                    </Badge>
                    {expandedEntries.has(entry.id) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedEntries.has(entry.id) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {entry.comment && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Comment:</span>
                        <p className="text-sm mt-1">{entry.comment}</p>
                      </div>
                    )}
                    {entry.defectsLinked && entry.defectsLinked.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Linked Defects:</span>
                        <div className="flex gap-2 mt-1">
                          {entry.defectsLinked.map((defect) => (
                            <Badge key={defect} variant="outline" className="text-red-500">
                              {defect}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Full timestamp: {new Date(entry.executedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No execution history found</p>
              </div>
            )}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
