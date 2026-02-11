import { useNavigate } from 'react-router-dom';
import { Calendar, Users, BarChart3, MoreVertical, Trash2, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlanStatusBadge } from './PlanStatusBadge';
import { TestPlan } from '@/types/testPlans';
import { usePlanProgress } from '@/hooks/useTestPlansG26';
import { format } from 'date-fns';

interface Props { plan: TestPlan; onDelete: () => void; }

export function TestPlanCard({ plan, onDelete }: Props) {
  const navigate = useNavigate();
  const { data: progress } = usePlanProgress(plan.id);

  const dateRange = () => {
    if (!plan.planned_start_date && !plan.planned_end_date) return 'Not scheduled';
    const s = plan.planned_start_date ? format(new Date(plan.planned_start_date), 'MMM d') : '?';
    const e = plan.planned_end_date ? format(new Date(plan.planned_end_date), 'MMM d') : '?';
    return `${s} – ${e}`;
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/testhub/test-plans/${plan.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-primary">{plan.plan_key}</span>
              <span className="text-muted-foreground">·</span>
              <h3 className="font-medium truncate">{plan.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{plan.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <PlanStatusBadge status={plan.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={e => e.stopPropagation()}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{dateRange()}</div>
          <div className="flex items-center gap-1"><Users className="h-4 w-4" />{plan.release?.name || 'No release'}</div>
        </div>
        {progress && progress.total_tests > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Progress</span>
              <span>{progress.progress_percent}%</span>
            </div>
            <Progress value={progress.progress_percent} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
