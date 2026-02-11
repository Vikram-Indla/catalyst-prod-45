import { useState } from 'react';
import { Search, Loader2, History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { useCatyNaturalQuery } from '@/hooks/useCatyAI';
import { CatyAIAvatar } from './CatyAIAvatar';
import { cn } from '@/lib/utils';

interface Props { projectId: string; }

const EXAMPLE_QUERIES = ["What's our pass rate this week?", "Show me all failed tests", "Which tests have the most defects?", "How many tests were executed today?"];
const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function CatyAIQueryPanel({ projectId }: Props) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any>(null);
  const queryMutation = useCatyNaturalQuery();

  const handleQuery = async (q: string) => {
    const response = await queryMutation.mutateAsync({ projectId, question: q });
    setResult(response);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (question.trim()) handleQuery(question.trim()); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4"><CatyAIAvatar size="sm" /><span className="text-sm font-medium text-foreground">Ask CATY</span></div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your test data..." className="pl-10" disabled={queryMutation.isPending} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><History className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">{EXAMPLE_QUERIES.map((q, i) => <DropdownMenuItem key={i} onClick={() => { setQuestion(q); handleQuery(q); }}>{q}</DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
        <Button type="submit" disabled={!question.trim() || queryMutation.isPending}>{queryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}</Button>
      </form>

      {!question && <div className="flex flex-wrap gap-2">{EXAMPLE_QUERIES.slice(0, 3).map((q, i) => <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => { setQuestion(q); handleQuery(q); }}>{q}</Button>)}</div>}

      {queryMutation.isPending && <Card><CardContent className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-3/4 mb-2" /><div className="h-4 bg-muted rounded w-1/2" /></CardContent></Card>}

      {result && !queryMutation.isPending && (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none dark:prose-invert"><p>{result.answer}</p></div>
          {result.metrics?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {result.metrics.map((m: any, i: number) => (
                <Card key={i}><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-semibold">{m.value}</p>
                    {m.trend && <div className={cn("flex items-center gap-0.5 text-xs", m.trend === 'up' && "text-green-600", m.trend === 'down' && "text-red-600", m.trend === 'neutral' && "text-muted-foreground")}>
                      {m.trend === 'up' && <TrendingUp className="h-3 w-3" />}{m.trend === 'down' && <TrendingDown className="h-3 w-3" />}{m.trend === 'neutral' && <Minus className="h-3 w-3" />}{m.change}
                    </div>}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
          {result.visualization && (
            <Card><CardContent className="p-4">
              {result.visualization.type === 'bar' && <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={result.visualization.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div>}
              {result.visualization.type === 'pie' && <div className="h-64"><ResponsiveContainer width="100%" height="100%"><RechartsPie><Pie data={result.visualization.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{result.visualization.data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer></div>}
              {result.visualization.type === 'table' && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border">{Object.keys(result.visualization.data[0] || {}).map((k) => <th key={k} className="text-left p-2 font-medium">{k}</th>)}</tr></thead><tbody>{result.visualization.data.map((row: any, i: number) => <tr key={i} className="border-b border-border">{Object.values(row).map((v: any, ci: number) => <td key={ci} className="p-2">{v}</td>)}</tr>)}</tbody></table></div>}
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
