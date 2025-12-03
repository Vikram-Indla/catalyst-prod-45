import React, { useState } from 'react';
import { Edit, Trash2, Play, Copy, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from './EmptyState';
import { CloneTestCaseModal } from './CloneTestCaseModal';
import type { TestCase, TestFolder } from '@/types/test-management';
import { format } from 'date-fns';

interface TestCaseListProps {
  testCases: TestCase[];
  loading: boolean;
  folders?: TestFolder[];
  onRefresh?: () => void;
  onCreateClick?: () => void;
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
  loading,
  folders = [],
  onRefresh,
  onCreateClick
}) => {
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

  const handleClone = (testCase: TestCase) => {
    setSelectedCase(testCase);
    setCloneModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    );
  }

  if (testCases.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleClone(testCase)}>
                      <Copy className="h-4 w-4 mr-2" /> Clone
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Play className="h-4 w-4 mr-2" /> Execute
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Clone Modal */}
      {selectedCase && (
        <CloneTestCaseModal
          isOpen={cloneModalOpen}
          onClose={() => {
            setCloneModalOpen(false);
            setSelectedCase(null);
          }}
          testCase={selectedCase}
          folders={folders}
          onSuccess={() => {
            onRefresh?.();
            setCloneModalOpen(false);
            setSelectedCase(null);
          }}
        />
      )}
    </div>
  );
};