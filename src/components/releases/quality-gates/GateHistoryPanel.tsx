import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Calendar, User, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface QualityGate {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  status: string;
  score: number;
}

interface GateEvaluation {
  id: string;
  date: string;
  result: 'pass' | 'fail' | 'warning';
  score: number;
  evaluatedBy: string;
  notes?: string;
}

interface GateHistoryPanelProps {
  open: boolean;
  gate: QualityGate | null;
  onClose: () => void;
}

// Mock history data
const generateMockHistory = (gateId: string): GateEvaluation[] => {
  const results: GateEvaluation[] = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const rand = Math.random();
    const result = rand > 0.7 ? 'pass' : rand > 0.3 ? 'warning' : 'fail';
    const score = result === 'pass' ? 90 + Math.floor(Math.random() * 10) : 
                  result === 'warning' ? 70 + Math.floor(Math.random() * 20) :
                  40 + Math.floor(Math.random() * 30);
    
    results.push({
      id: `eval-${i}`,
      date: date.toISOString(),
      result,
      score,
      evaluatedBy: ['John Doe', 'Jane Smith', 'System Auto'][Math.floor(Math.random() * 3)],
      notes: i % 3 === 0 ? 'Manual evaluation performed' : undefined
    });
  }
  
  return results;
};

const resultConfig = {
  pass: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-500/10', label: 'Passed' },
  fail: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Warning' }
};

export function GateHistoryPanel({ open, gate, onClose }: GateHistoryPanelProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const history = gate ? generateMockHistory(gate.id) : [];
  
  const filteredHistory = history.filter(eval_ => {
    if (startDate && new Date(eval_.date) < new Date(startDate)) return false;
    if (endDate && new Date(eval_.date) > new Date(endDate)) return false;
    return true;
  });
  
  // Prepare chart data (last 14 days)
  const chartData = filteredHistory.slice(0, 14).reverse().map(eval_ => ({
    date: new Date(eval_.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: eval_.score,
    result: eval_.result
  }));
  
  const passCount = filteredHistory.filter(e => e.result === 'pass').length;
  const failCount = filteredHistory.filter(e => e.result === 'fail').length;
  const warningCount = filteredHistory.filter(e => e.result === 'warning').length;
  
  const trend = passCount > failCount ? 'improving' : passCount < failCount ? 'degrading' : 'stable';
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'degrading' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-teal-600' : trend === 'degrading' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Evaluation History
            {gate && <Badge variant="outline">{gate.name}</Badge>}
          </SheetTitle>
          <SheetDescription>
            View past evaluations and performance trends
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Date Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="start-date" className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-5"
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                Clear
              </Button>
            )}
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-teal-600">{passCount}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{failCount}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className={cn("text-2xl font-bold flex items-center justify-center gap-1", trendColor)}>
                <TrendIcon className="w-5 h-5" />
              </div>
              <div className="text-xs text-muted-foreground capitalize">{trend}</div>
            </div>
          </div>
          
          {/* Trend Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* History List */}
          <div>
            <h4 className="text-sm font-medium mb-3">Evaluation Log</h4>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {filteredHistory.map((eval_) => {
                  const config = resultConfig[eval_.result];
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={eval_.id} 
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn("p-2 rounded-lg", config.bg)}>
                        <Icon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn("font-medium text-sm", config.color)}>
                            {config.label}
                          </span>
                          <span className="text-lg font-bold">{eval_.score}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(eval_.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {eval_.evaluatedBy}
                          </span>
                        </div>
                        {eval_.notes && (
                          <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3 mt-0.5" />
                            <span>{eval_.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {filteredHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No evaluations found for the selected date range
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
