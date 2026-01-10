import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Play, Pencil, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TestCycle } from '@/data/testCyclesData';

interface CycleTableViewProps {
  cycles: TestCycle[];
  onEdit: (cycle: TestCycle) => void;
  onDuplicate: (cycle: TestCycle) => void;
  onDelete: (cycleId: string) => void;
}

const statusColors: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  aborted: 'bg-red-100 text-red-700'
};

const envColors: Record<string, string> = {
  dev: 'bg-purple-100 text-purple-700',
  staging: 'bg-orange-100 text-orange-700',
  production: 'bg-red-100 text-red-700'
};

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function CycleTableView({ cycles, onEdit, onDuplicate, onDelete }: CycleTableViewProps) {
  const navigate = useNavigate();

  const handleRowClick = (cycle: TestCycle) => {
    navigate(`/releases/test-cycles/${cycle.id}`);
  };

  const getPassRate = (cycle: TestCycle) => {
    const executed = cycle.passedTests + cycle.failedTests;
    if (executed === 0) return '-';
    return Math.round((cycle.passedTests / executed) * 100);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cycle</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Release</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Environment</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tests</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pass Rate</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Updated</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cycles.map(cycle => {
            const passRate = getPassRate(cycle);
            const passRateNum = typeof passRate === 'number' ? passRate : 0;
            
            return (
              <tr 
                key={cycle.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(cycle)}
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="font-mono text-sm font-medium text-primary">{cycle.id}</span>
                    <p className="text-sm text-gray-600">{cycle.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{cycle.releaseId}</td>
                <td className="px-4 py-3">
                  <Badge className={cn("text-xs", envColors[cycle.environment])}>
                    {cycle.environment}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn("text-xs", statusColors[cycle.status])}>
                    {cycle.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${cycle.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{cycle.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">{cycle.passedTests}✓</span>
                    <span className="text-red-600">{cycle.failedTests}✗</span>
                    <span className="text-gray-400">/{cycle.totalTests}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-sm font-medium",
                    passRateNum >= 90 ? "text-green-600" : 
                    passRateNum >= 70 ? "text-blue-600" : "text-red-600"
                  )}>
                    {passRate}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      avatarColors[cycle.assignee.color]
                    )}>
                      {cycle.assignee.initials}
                    </div>
                    <span className="text-sm text-gray-600">{cycle.assignee.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{cycle.updatedAt}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/releases/test-cycles/${cycle.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/releases/execution/${cycle.id}/TC-001`)}>
                        <Play className="w-4 h-4 mr-2" /> Start Execution
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(cycle)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(cycle)}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => onDelete(cycle.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
