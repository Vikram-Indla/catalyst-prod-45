import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Play,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
  Calendar,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddTestsToCycleModal } from '@/components/test-management/AddTestsToCycleModal';
import { TestExecutionModal } from '@/components/test-management/TestExecutionModal';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Wrapper component to fetch test case and pass to modal
function TestExecutionModalWrapper({
  testCaseId,
  testCycleId,
  onClose,
}: {
  testCaseId: string;
  testCycleId?: string;
  onClose: () => void;
}) {
  const { data: testCase, isLoading } = useQuery({
    queryKey: ['test-case', testCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', testCaseId)
        .single();
      if (error) throw error;
      return data as any; // Type casting for Supabase compatibility
    },
  });

  if (isLoading || !testCase) return null;

  return (
    <TestExecutionModal
      testCase={testCase}
      isOpen={true}
      onClose={onClose}
    />
  );
}

export default function CycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAddTestsModalOpen, setIsAddTestsModalOpen] = useState(false);
  const [executingTestId, setExecutingTestId] = useState<string | null>(null);

  // Fetch cycle details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['test-cycle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch test cases in this cycle
  const { data: cycleTestCases, isLoading: casesLoading } = useQuery({
    queryKey: ['cycle-test-cases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_set_cases')
        .select(`
          case_id,
          test_cases (
            id,
            title,
            test_type,
            priority
          )
        `)
        .eq('set_id', id) as any;
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch executions for these test cases
  const { data: executions } = useQuery({
    queryKey: ['cycle-executions', id],
    queryFn: async () => {
      if (!cycleTestCases) return [];
      const testCaseIds = cycleTestCases.map((tc: any) => tc.test_case_id);
      
      const { data, error } = await supabase
        .from('test_executions')
        .select('*')
        .eq('test_cycle_id', id)
        .in('test_case_id', testCaseIds)
        .order('execution_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!cycleTestCases,
  });

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

  const getExecutionStatus = (testCaseId: string) => {
    const execution = executions?.find((e: any) => e.test_case_id === testCaseId);
    if (!execution) return { status: 'not_run', icon: Clock, className: 'text-muted-foreground' };
    
    const statusMap = {
      passed: { icon: CheckCircle2, className: 'text-green-500' },
      failed: { icon: XCircle, className: 'text-red-500' },
      blocked: { icon: Minus, className: 'text-orange-500' },
      skipped: { icon: Minus, className: 'text-gray-500' },
    };
    
    return statusMap[execution.status as keyof typeof statusMap] || statusMap.passed;
  };

  const calculateProgress = () => {
    if (!cycleTestCases || !executions) return { total: 0, passed: 0, failed: 0, notRun: 0, percentage: 0 };
    
    const total = cycleTestCases.length;
    const passed = executions.filter((e: any) => e.status === 'passed').length;
    const failed = executions.filter((e: any) => e.status === 'failed').length;
    const notRun = total - (passed + failed);
    const percentage = total > 0 ? (passed / total) * 100 : 0;
    
    return { total, passed, failed, notRun, percentage };
  };

  const handleRemoveTest = async (testCaseId: string) => {
    try {
      const { error } = await supabase
        .from('test_set_cases')
        .delete()
        .eq('set_id', id)
        .eq('case_id', testCaseId);
      
      if (error) throw error;
      toast.success('Test case removed from cycle');
    } catch (error: any) {
      toast.error('Failed to remove test case: ' + error.message);
    }
  };

  if (cycleLoading || casesLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">Test cycle not found</p>
            <Button onClick={() => navigate('/tests/cycles')} className="mt-4">
              Back to Cycles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <>
      <div className="container mx-auto p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/tests/cycles')}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cycles
        </Button>

        <Card className="border-border mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl text-foreground mb-2">{cycle.name}</CardTitle>
                {cycle.description && (
                  <p className="text-muted-foreground">{cycle.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(cycle.start_date), 'MMM dd, yyyy')} - {format(new Date(cycle.end_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              {getStatusBadge(cycle.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-foreground">
                  {progress.passed}/{progress.total} passed ({Math.round(progress.percentage)}%)
                </span>
              </div>
              <Progress value={progress.percentage} className="h-3" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {progress.passed} passed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {progress.failed} failed
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {progress.notRun} not run
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground">Test Cases in Cycle</CardTitle>
              <Button
                onClick={() => setIsAddTestsModalOpen(true)}
                className="bg-brand-gold hover:bg-brand-gold/90 text-background"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tests
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!cycleTestCases || cycleTestCases.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No test cases in this cycle yet</p>
                <Button
                  onClick={() => setIsAddTestsModalOpen(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Add Test Cases
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {cycleTestCases.map((item: any) => {
                  const testCase = item.test_cases;
                  const execution = executions?.find((e: any) => e.test_case_id === testCase.id);
                  const statusInfo = getExecutionStatus(testCase.id);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={testCase.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <StatusIcon className={`h-5 w-5 ${statusInfo.className}`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{testCase.title}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {testCase.test_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {testCase.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {execution && (
                          <div className="text-sm text-muted-foreground text-right mr-4">
                            <div className="text-xs">
                              {format(new Date(execution.execution_date), 'MMM dd')}
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExecutingTestId(testCase.id)}
                          className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Execute
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTest(testCase.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddTestsToCycleModal
        open={isAddTestsModalOpen}
        onOpenChange={setIsAddTestsModalOpen}
        cycleId={id!}
        existingTestCaseIds={cycleTestCases?.map((tc: any) => tc.test_case_id) || []}
      />

      {executingTestId && (
        <TestExecutionModalWrapper
          testCaseId={executingTestId}
          testCycleId={id}
          onClose={() => setExecutingTestId(null)}
        />
      )}
    </>
  );
}
