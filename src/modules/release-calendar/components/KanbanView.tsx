import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ChangeCard, ChangeCardStatus } from '../types';
import { STATUS_LABELS, STATUS_ORDER } from '../types';
import { useUpdateChangeCard } from '../hooks/useChangeCards';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface KanbanViewProps {
  changeCards: ChangeCard[];
  onChangeClick: (changeId: string) => void;
  isLoading?: boolean;
}

export function KanbanView({ changeCards, onChangeClick, isLoading }: KanbanViewProps) {
  const updateChange = useUpdateChangeCard();

  const columnColors: Record<ChangeCardStatus, string> = {
    'new_awaiting_approval': 'border-t-gray-400',
    'approved_scheduled': 'border-t-blue-500',
    'in_progress': 'border-t-amber-500',
    'ready_for_production': 'border-t-green-600',
    'in_production': 'border-t-green-500',
    'closed': 'border-t-gray-300',
  };

  const cardsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = changeCards.filter(c => c.status === status);
    return acc;
  }, {} as Record<ChangeCardStatus, ChangeCard[]>);

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {STATUS_ORDER.map(status => (
          <div key={status} className="flex-shrink-0 w-72">
            <Skeleton className="h-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {STATUS_ORDER.map(status => (
        <div key={status} className="flex-shrink-0 w-72 flex flex-col">
          <div className={cn(
            "bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 border-t-4 flex flex-col h-full",
            columnColors[status]
          )}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </h3>
                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-2xs">
                  {cardsByStatus[status].length}
                </Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {cardsByStatus[status].map(card => (
                <KanbanCard key={card.id} card={card} onClick={() => onChangeClick(card.id)} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ card, onClick }: { card: ChangeCard; onClick: () => void }) {
  return (
    <Card 
      onClick={onClick}
      className="p-3 cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
          {card.change_number}
        </span>
        <div className="flex items-center gap-1">
          {card.approved && <CheckCircle className="w-3 h-3 text-status-success" />}
          {card.compliance_state === 'exception_recorded' && (
            <AlertTriangle className="w-3 h-3 text-status-warning" />
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{card.title}</p>
      <div className="mt-2 text-2xs text-gray-500 dark:text-gray-400">
        {new Date(card.planned_prod_date).toLocaleDateString()}
      </div>
    </Card>
  );
}
