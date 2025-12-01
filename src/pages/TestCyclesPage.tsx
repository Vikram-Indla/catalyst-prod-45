import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTestCycles } from '@/hooks/useTestManagement';
import { CreateCycleModal } from '@/components/test-management/CreateCycleModal';
import { format } from 'date-fns';

export function TestCyclesPage() {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: cycles, isLoading } = useTestCycles();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', className: 'bg-blue-500/10 text-blue-500' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-500/10 text-yellow-500' },
      completed: { label: 'Completed', className: 'bg-green-500/10 text-green-500' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const calculateProgress = (cycle: any) => {
    // Mock calculation - will be replaced with actual data
    const total = 10;
    const passed = Math.floor(Math.random() * total);
    const percentage = (passed / total) * 100;
    return { total, passed, percentage };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Test Cycles</h1>
            <p className="text-muted-foreground mt-1">
              Organize and track test execution across sprints and releases
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-gold hover:bg-brand-gold/90 text-background"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Cycle
          </Button>
        </div>

        {!cycles || cycles.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-brand-gold/10 mb-4">
                <Clock className="h-12 w-12 text-brand-gold" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No test cycles yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Create your first test cycle to organize test execution and track progress
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-brand-gold hover:bg-brand-gold/90 text-background"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Cycle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cycles.map((cycle: any) => {
              const progress = calculateProgress(cycle);
              return (
                <Card key={cycle.id} className="border-border hover:border-brand-gold/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-foreground mb-2">{cycle.name}</CardTitle>
                        {cycle.description && (
                          <CardDescription className="text-sm">{cycle.description}</CardDescription>
                        )}
                      </div>
                      {getStatusBadge(cycle.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(cycle.start_date), 'MMM dd')} - {format(new Date(cycle.end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{progress.total} test cases</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold text-foreground">
                          {progress.passed}/{progress.total} passed ({Math.round(progress.percentage)}%)
                        </span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/tests/cycles/${cycle.id}`)}
                        className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateCycleModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </>
  );
}
