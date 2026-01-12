// ============================================================
// ACTIVE INITIATIVES LIST - Sidebar Component
// ============================================================

import { Layers, ChevronRight, FolderOpen, Plus, Lightbulb, ThumbsUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Initiative {
  id: string;
  title: string;
  status: string;
  ideas_count: number;
  total_votes: number;
  progress?: number;
}

interface ActiveInitiativesListProps {
  initiatives: Initiative[];
  loading?: boolean;
  onInitiativeClick?: (id: string) => void;
  onManageClick?: () => void;
  onCreateClick?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  collecting: 'bg-blue-100 text-blue-700',
  evaluating: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};

export function ActiveInitiativesList({
  initiatives,
  loading = false,
  onInitiativeClick,
  onManageClick,
  onCreateClick,
}: ActiveInitiativesListProps) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <CardTitle className="text-sm font-semibold text-slate-900">
            Active Initiatives
          </CardTitle>
        </div>
        {onManageClick && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs text-slate-500"
            onClick={onManageClick}
          >
            Manage
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : initiatives.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No active initiatives</p>
            <p className="text-xs text-slate-500 mb-4">Create one to collect themed ideas</p>
            {onCreateClick && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onCreateClick}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Create Initiative
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {initiatives.slice(0, 3).map((initiative) => (
              <div
                key={initiative.id}
                onClick={() => onInitiativeClick?.(initiative.id)}
                className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-900 truncate flex-1 mr-2">
                    {initiative.title}
                  </h4>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-[10px] shrink-0 capitalize",
                      STATUS_COLORS[initiative.status] || STATUS_COLORS.active
                    )}
                  >
                    {initiative.status}
                  </Badge>
                </div>
                
                <Progress 
                  value={initiative.progress || Math.min(100, (initiative.ideas_count / 20) * 100)} 
                  className="h-1.5 mb-3" 
                />
                
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {initiative.ideas_count} ideas
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {initiative.total_votes} votes
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
