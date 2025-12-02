import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getExecutionWithDetails } from '@/services/executionService';
import { FileText, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

export function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: execution, isLoading } = useQuery({
    queryKey: ['execution-detail', id],
    queryFn: () => getExecutionWithDetails(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!execution) {
    return <div>Execution not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-orange-100 text-orange-800';
      case 'skipped': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Execution Details</h1>
        <p className="text-muted-foreground mt-1">
          {execution.test_cases?.key}: {execution.test_cases?.title}
        </p>
      </div>

      {/* Execution summary */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(execution.status)}>
                {execution.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cycle: {execution.test_cycles?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Executed by: {execution.executed_by || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {execution.executed_at
                  ? format(new Date(execution.executed_at), 'PPp')
                  : 'Not executed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Effort: {execution.effort_actual || 0} minutes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case details */}
      <Card>
        <CardHeader>
          <CardTitle>Test Case Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-medium">Objective:</span>
            <p className="text-sm text-muted-foreground mt-1">
              {execution.test_cases?.objective || 'No objective'}
            </p>
          </div>
          <div>
            <span className="font-medium">Priority:</span>
            <Badge variant="outline" className="ml-2">
              {execution.test_cases?.priority}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Steps with results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Expected Result</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actual Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {execution.steps?.map((step: any) => (
                <TableRow key={step.id}>
                  <TableCell>{step.step_order}</TableCell>
                  <TableCell>{step.step_description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {step.expected_result}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(step.status)}>
                      {step.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {step.actual_result || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evidence gallery */}
      {execution.evidence && execution.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evidence ({execution.evidence.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {execution.evidence.map((ev: any) => (
                <div key={ev.id} className="border rounded-lg p-3 text-center">
                  <p className="text-sm truncate">{ev.file_name}</p>
                  <a
                    href={ev.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#c69c6d] hover:underline"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      {execution.comments && (
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{execution.comments}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
