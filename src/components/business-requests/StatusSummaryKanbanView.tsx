import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessRequestsKanbanView } from './BusinessRequestsKanbanView';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
  business_score: number | null;
  rank: number | null;
  delivery_platform: string | null;
  business_owner?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
}

interface StatusSummaryKanbanViewProps {
  requests: BusinessRequest[];
  onRequestSelect: (id: string) => void;
}

// Status columns with colors matching production exactly
const STATUS_COLUMNS = [
  { id: 'new_request', label: 'New Request', color: 'bg-neutral-400' },
  { id: 'analyse', label: 'Analyse', color: 'bg-neutral-300' },
  { id: 'approved', label: 'Approved', color: 'bg-violet-500' },
  { id: 'implement', label: 'Implement', color: 'bg-emerald-600' },
  { id: 'closed', label: 'Closed', color: 'bg-neutral-500' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { id: 'on_hold', label: 'On-Hold', color: 'bg-amber-400' },
];

export function StatusSummaryKanbanView({ requests, onRequestSelect }: StatusSummaryKanbanViewProps) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  // Calculate counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_COLUMNS.forEach(col => {
      counts[col.id] = requests.filter(r => r.process_step === col.id).length;
    });
    return counts;
  }, [requests]);

  // If a column is expanded or all expanded, show full Kanban
  if (allExpanded || expandedColumn) {
    const filteredRequests = expandedColumn 
      ? requests.filter(r => r.process_step === expandedColumn)
      : requests;
    
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setExpandedColumn(null);
              setAllExpanded(false);
            }}
          >
            ← Back to Summary
          </Button>
          {expandedColumn && (
            <span className="text-sm text-muted-foreground">
              Showing: {STATUS_COLUMNS.find(c => c.id === expandedColumn)?.label}
            </span>
          )}
        </div>
        <BusinessRequestsKanbanView 
          requests={filteredRequests}
          onRequestSelect={onRequestSelect}
          allExpanded={true}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Expand All */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground italic">
          Click any column to expand
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAllExpanded(true)}
          className="gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Expand All
        </Button>
      </div>

      {/* Status Summary Columns - Production-matched styling */}
      <div className="flex gap-4 justify-center">
        {STATUS_COLUMNS.map(column => {
          const count = statusCounts[column.id] || 0;
          
          return (
            <div
              key={column.id}
              onClick={() => setExpandedColumn(column.id)}
              className="flex-shrink-0 cursor-pointer group"
            >
              <div className="bg-card border rounded-xl p-4 hover:border-brand-gold/50 hover:shadow-md transition-all min-h-[180px] w-[56px] flex flex-col items-center">
                {/* Status Dot */}
                <div className={cn("w-3.5 h-3.5 rounded-full mb-3", column.color)} />
                
                {/* Count */}
                <span className="text-base font-semibold text-foreground mb-3">
                  {count}
                </span>
                
                {/* Vertical Label */}
                <div className="flex-1 flex items-center justify-center">
                  <span 
                    className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                    style={{ 
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)'
                    }}
                  >
                    {column.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
