import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { useKeyResults, useCreateKeyResult, useUpdateKeyResult, useCreateCheckIn, type KeyResult } from '@/hooks/useKeyResults';
import { CheckInModal } from './CheckInModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface KeyResultsListProps {
  objectiveId: string;
  keyResults?: KeyResult[];
}

export function KeyResultsList({ objectiveId, keyResults: propKeyResults }: KeyResultsListProps) {
  const { data: fetchedKeyResults = [] } = useKeyResults(objectiveId);
  const keyResults = propKeyResults || fetchedKeyResults;
  const [isAdding, setIsAdding] = useState(false);
  const [newKrName, setNewKrName] = useState('');
  const [newKrType, setNewKrType] = useState<'currency' | 'count' | 'percentage' | 'decimal_score' | 'nps'>('percentage');
  const [expandedKrs, setExpandedKrs] = useState<Set<string>>(new Set());
  const [checkInKr, setCheckInKr] = useState<KeyResult | null>(null);

  const createKeyResult = useCreateKeyResult();
  const updateKeyResult = useUpdateKeyResult();
  const createCheckIn = useCreateCheckIn();

  const handleAddKeyResult = () => {
    if (!newKrName.trim()) return;

    createKeyResult.mutate({
      objective_id: objectiveId,
      summary: newKrName,
      metric_type: newKrType,
      goal_value: 100,
      current_value: 0,
    });

    setNewKrName('');
    setIsAdding(false);
  };

  const toggleExpanded = (krId: string) => {
    const newExpanded = new Set(expandedKrs);
    if (newExpanded.has(krId)) {
      newExpanded.delete(krId);
    } else {
      newExpanded.add(krId);
    }
    setExpandedKrs(newExpanded);
  };

  const getScoreColor = (score?: number) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Key Results ({keyResults.length})</h3>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Key Result
        </Button>
      </div>

      {isAdding && (
        <div className="p-4 border rounded-lg space-y-3">
          <Input
            placeholder="Key result summary"
            value={newKrName}
            onChange={(e) => setNewKrName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyResult()}
          />
          <div className="flex gap-2">
            <Select
              value={newKrType}
              onValueChange={(value: any) => setNewKrType(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="decimal_score">Decimal Score</SelectItem>
                <SelectItem value="nps">Net Promoter Score</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddKeyResult} size="sm">Add</Button>
            <Button onClick={() => setIsAdding(false)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {keyResults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No key results yet. Add your first key result to track progress.
          </div>
        ) : (
          keyResults.map((kr) => (
            <div key={kr.id} className="border rounded-lg">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpanded(kr.id)}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {expandedKrs.has(kr.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="font-medium">{kr.summary}</div>
                </div>
                <Badge variant="outline">{kr.metric_type}</Badge>
              </div>

              {expandedKrs.has(kr.id) && (
                <div className="p-4 border-t space-y-4 bg-muted/20">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current</div>
                      <div className="font-medium">{kr.current_value}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Target</div>
                      <div className="font-medium">{kr.goal_value}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Baseline</div>
                      <div className="font-medium">{kr.baseline_value || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {Math.round((kr.current_value / kr.goal_value) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((kr.current_value / kr.goal_value) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckInKr(kr);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Check-in
                    </Button>
                    <Button variant="outline" size="sm">
                      View Reports
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {checkInKr && (
        <CheckInModal
          open={!!checkInKr}
          onClose={() => setCheckInKr(null)}
          onSubmit={(data) => {
            createCheckIn.mutate({
              key_result_id: checkInKr.id,
              value: data.value,
              checked_in_at: data.date.toISOString(),
              note_richtext: data.note,
            });
          }}
          keyResult={checkInKr}
        />
      )}
    </div>
  );
}
