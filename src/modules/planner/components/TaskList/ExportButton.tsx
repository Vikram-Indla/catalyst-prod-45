/**
 * Export Button - Planner V9
 * Exports task list to CSV/Excel
 */

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { TaskListTask } from '../../hooks/useTaskList';
import { format } from 'date-fns';

interface ExportButtonProps {
  tasks: TaskListTask[];
  disabled?: boolean;
}

export function ExportButton({ tasks, disabled }: ExportButtonProps) {
  const exportToCSV = () => {
    if (tasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }

    const headers = [
      'ID',
      'Title',
      'Status',
      'Priority',
      'Workstream',
      'Assignee',
      'Due Date',
      'Start Date',
      'Progress',
      'Blocked',
      'Created At',
    ];

    const rows = tasks.map(task => [
      task.task_key,
      `"${task.title.replace(/"/g, '""')}"`,
      task.status_name || '',
      task.priority,
      task.workstream_name || '',
      task.assignee_name || '',
      task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
      task.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : '',
      task.progress,
      task.blocked ? 'Yes' : 'No',
      format(new Date(task.created_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planner-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${tasks.length} tasks to CSV`);
  };

  const exportToJSON = () => {
    if (tasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }

    const exportData = tasks.map(task => ({
      id: task.task_key,
      title: task.title,
      description: task.description,
      status: task.status_name,
      priority: task.priority,
      workstream: task.workstream_name,
      assignee: task.assignee_name,
      dueDate: task.due_date,
      startDate: task.start_date,
      progress: task.progress,
      blocked: task.blocked,
      createdAt: task.created_at,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planner-tasks-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${tasks.length} tasks to JSON`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2" disabled={disabled}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={exportToCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
