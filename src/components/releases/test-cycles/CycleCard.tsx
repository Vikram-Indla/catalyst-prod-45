import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, Eye, Play, Pencil, Copy, Trash2, 
  Package, FileText, CheckCircle, XCircle, Clock 
} from 'lucide-react';
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

interface CycleCardProps {
  cycle: TestCycle;
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
  qa: 'bg-cyan-100 text-cyan-700',
  beta: 'bg-amber-100 text-amber-700',
  staging: 'bg-orange-100 text-orange-700',
  uat: 'bg-indigo-100 text-indigo-700',
  production: 'bg-red-100 text-red-700'
};

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function CycleCard({ cycle, onEdit, onDuplicate, onDelete }: CycleCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/testhub/cycles/${cycle.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    switch (action) {
      case 'view':
        navigate(`/testhub/cycles/${cycle.id}`);
        break;
      case 'execute':
        navigate(`/testhub/cycles/${cycle.id}/execute`);
        break;
      case 'edit':
        onEdit(cycle);
        break;
      case 'duplicate':
        onDuplicate(cycle);
        break;
      case 'delete':
        onDelete(cycle.id);
        break;
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-primary">{cycle.id}</span>
            <Badge className={cn("text-xs", envColors[cycle.environment])}>
              {cycle.environment}
            </Badge>
          </div>
          <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleAction(e, 'view')}>
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, 'execute')}>
              <Play className="w-4 h-4 mr-2" /> Start Execution
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, 'edit')}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, 'duplicate')}>
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={(e) => handleAction(e, 'delete')}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Release Link */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Package className="w-4 h-4" />
        <span className="hover:text-primary">{cycle.releaseId}</span>
        <span>·</span>
        <span className="truncate">{cycle.releaseName}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium">{cycle.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${cycle.progress}%`,
              backgroundColor: cycle.progress === 100 ? '#059669' : '#2563eb'
            }}
          />
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm mb-4">
        <div className="flex items-center gap-1">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{cycle.totalTests} tests</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">{cycle.passedTests}</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-gray-600">{cycle.failedTests}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{cycle.duration}</span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
            avatarColors[cycle.assignee.color]
          )}>
            {cycle.assignee.initials}
          </div>
          <span className="text-sm text-gray-600">{cycle.assignee.name}</span>
        </div>
        <span className="text-xs text-gray-400">{cycle.updatedAt}</span>
      </div>
    </div>
  );
}
