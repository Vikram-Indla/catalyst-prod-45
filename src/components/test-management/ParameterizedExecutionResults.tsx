import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ExecutionResult {
  rowIndex: number;
  rowData: Record<string, any>;
  status: 'passed' | 'failed' | 'blocked' | 'not_executed';
  result?: string;
  executedAt?: string;
  duration?: number;
}

interface ParameterizedExecutionResultsProps {
  results: ExecutionResult[];
  onAddDefect?: (result: ExecutionResult) => void;
}

export const ParameterizedExecutionResults: React.FC<ParameterizedExecutionResultsProps> = ({
  results,
  onAddDefect,
}) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      passed: 'default',
      failed: 'destructive',
      blocked: 'secondary',
      not_executed: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="uppercase">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const passedCount = results.filter(r => r.status === 'passed').length;
  const totalCount = results.length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Parameterized Execution Results</h3>
          <p className="text-sm text-muted-foreground">Data-driven test execution summary</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">
            {passedCount}/{totalCount}
          </div>
          <div className="text-sm text-muted-foreground">
            {passRate}% Pass Rate
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((result, idx) => {
          const isExpanded = expandedRows.has(idx);

          return (
            <Collapsible key={idx} open={isExpanded} onOpenChange={() => toggleRow(idx)}>
              <div className="border border-border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {getStatusIcon(result.status)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          Row {result.rowIndex + 1}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(result.rowData).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                    {result.result && (
                      <div>
                        <div className="text-sm font-medium text-foreground mb-1">Result Details</div>
                        <div className="text-sm text-muted-foreground">{result.result}</div>
                      </div>
                    )}

                    {result.executedAt && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Executed: {new Date(result.executedAt).toLocaleString()}
                        </span>
                        {result.duration && (
                          <span>
                            Duration: {result.duration}s
                          </span>
                        )}
                      </div>
                    )}

                    {result.status === 'failed' && onAddDefect && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAddDefect(result)}
                          className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                        >
                          Create Defect
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {results.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No execution results yet</p>
        </div>
      )}
    </div>
  );
};
