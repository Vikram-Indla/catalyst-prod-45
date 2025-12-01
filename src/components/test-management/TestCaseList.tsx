import React from 'react';
import { Edit, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from './EmptyState';
import type { TestCase } from '@/types/test-management';
import { format } from 'date-fns';

interface TestCaseListProps {
  testCases: TestCase[];
  loading: boolean;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    draft: 'bg-gray-500 text-white',
    approved: 'bg-green-500 text-white',
    deprecated: 'bg-red-500 text-white'
  };

  return (
    <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>
      {status}
    </Badge>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-brand-dark',
    medium: 'bg-blue-500 text-white',
    low: 'bg-gray-500 text-white'
  };

  return (
    <Badge className={colors[priority as keyof typeof colors] || 'bg-gray-500'}>
      {priority}
    </Badge>
  );
};

export const TestCaseList: React.FC<TestCaseListProps> = ({
  testCases,
  loading
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    );
  }

  if (testCases.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[120px]">Priority</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="w-[180px]">Linked Item</TableHead>
            <TableHead className="w-[150px]">Created By</TableHead>
            <TableHead className="w-[130px]">Created</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {testCases.map((testCase) => (
            <TableRow
              key={testCase.id}
              className="hover:bg-accent cursor-pointer"
            >
              <TableCell className="font-mono text-sm">
                {testCase.id.slice(0, 8)}
              </TableCell>
              <TableCell className="font-medium">{testCase.title}</TableCell>
              <TableCell>
                <StatusBadge status={testCase.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={testCase.priority} />
              </TableCell>
              <TableCell className="capitalize">{testCase.test_type}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {testCase.linked_work_item_type && testCase.linked_work_item_id
                  ? `${testCase.linked_work_item_type}-${testCase.linked_work_item_id.slice(0, 8)}`
                  : '-'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {testCase.created_by}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(testCase.created_at), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-brand-gold"
                    title="Execute"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
