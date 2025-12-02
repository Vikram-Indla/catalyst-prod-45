import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyWork } from '@/hooks/useTestDashboard';
import { FileText, Play, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

type FilterType = 'all' | 'cases' | 'executions' | 'cycles';

const typeIcons = {
  test_case: FileText,
  test_execution: Play,
  test_cycle: RefreshCw,
};

const priorityColors = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
} as const;

export function MyWorkSection() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: workItems, isLoading } = useMyWork(filter);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Work</CardTitle>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'cases' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('cases')}
            >
              Cases
            </Button>
            <Button
              variant={filter === 'executions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('executions')}
            >
              Executions
            </Button>
            <Button
              variant={filter === 'cycles' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('cycles')}
            >
              Cycles
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {workItems && workItems.length > 0 ? (
          <div className="space-y-2">
            {workItems.slice(0, 5).map((item) => {
              const IconComponent = typeIcons[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (item.type === 'test_case') {
                      navigate(`/tests/cases/${item.id}`);
                    } else if (item.type === 'test_cycle') {
                      navigate(`/tests/cycles/${item.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.assigned_date), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityColors[item.priority as keyof typeof priorityColors] || 'secondary'}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline">{item.status}</Badge>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No work items assigned to you</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
