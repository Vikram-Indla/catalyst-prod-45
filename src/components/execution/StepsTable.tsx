import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExecutionStepResult } from '@/services/executionService';
import { Paperclip } from 'lucide-react';
import { useState } from 'react';

interface StepsTableProps {
  steps: ExecutionStepResult[];
  onStepsChange: (steps: ExecutionStepResult[]) => void;
  executionId: string;
}

const STATUS_COLORS = {
  not_executed: 'text-gray-600',
  passed: 'text-green-600',
  failed: 'text-red-600',
  blocked: 'text-orange-600',
  skipped: 'text-blue-600',
};

export function StepsTable({ steps, onStepsChange, executionId }: StepsTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleStatusChange = (index: number, status: ExecutionStepResult['status']) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], status };
    onStepsChange(newSteps);
  };

  const handleActualResultChange = (index: number, actual_result: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], actual_result };
    onStepsChange(newSteps);
  };

  const handleCommentsChange = (index: number, comments: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], comments };
    onStepsChange(newSteps);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Step Description</TableHead>
            <TableHead>Expected Result</TableHead>
            <TableHead className="w-40">Status</TableHead>
            <TableHead className="w-20">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((step, index) => (
            <>
              <TableRow
                key={index}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedRow(expandedRow === index ? null : index)}
              >
                <TableCell className="font-medium">{step.step_order}</TableCell>
                <TableCell className="max-w-md">{step.step_description}</TableCell>
                <TableCell className="max-w-md text-sm text-muted-foreground">
                  {step.expected_result}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={step.status}
                    onValueChange={(value: any) => handleStatusChange(index, value)}
                  >
                    <SelectTrigger className={STATUS_COLORS[step.status]}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_executed">Not Executed</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              {expandedRow === index && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-muted/30 p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Actual Result</label>
                        <Textarea
                          placeholder="Describe what actually happened..."
                          value={step.actual_result || ''}
                          onChange={(e) => handleActualResultChange(index, e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Comments</label>
                        <Textarea
                          placeholder="Add any additional comments..."
                          value={step.comments || ''}
                          onChange={(e) => handleCommentsChange(index, e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
