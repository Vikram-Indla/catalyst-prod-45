import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Info, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalyzeCatyCoverage } from '@/hooks/useCatyAI';
import { useFolders } from '@/hooks/test-management/useFolders';
import { useAuth } from '@/lib/auth';
import { CatyAIAvatar } from './CatyAIAvatar';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  onGenerateFromGap: (gap: any) => void;
}

export function CatyAICoverageAnalysis({ projectId, onGenerateFromGap }: Props) {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const analyzeMutation = useAnalyzeCatyCoverage();
  const { data: folders } = useFolders(projectId);

  const handleAnalyze = async () => {
    if (!user) return;
    const scope = selectedFolder && selectedFolder !== 'all' ? { folderId: selectedFolder } : undefined;
    const data = await analyzeMutation.mutateAsync({ projectId, userId: user.id, scope });
    setResult(data);
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `caty-coverage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const gaps = (result?.gaps || []).filter((g: any) => !dismissed.has(g.area));
  const critical = gaps.filter((g: any) => g.severity === 'critical').length;
  const high = gaps.filter((g: any) => g.severity === 'high').length;

  const severityConfig: Record<string, { icon: any; color: string; bg: string; appearance: LozengeAppearance }> = {
    critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', appearance: 'removed' },
    high: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', appearance: 'moved' },
    medium: { icon: Info, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', appearance: 'moved' },
    low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', appearance: 'inprogress' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><CatyAIAvatar /><div><h2 className="text-lg font-semibold text-foreground">Coverage Analysis</h2><p className="text-sm text-muted-foreground">AI-powered gap detection</p></div></div>
        <div className="flex items-center gap-2">
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All folders" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {folders?.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-2", analyzeMutation.isPending && "animate-spin")} />Analyze
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!result}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      </div>

      {analyzeMutation.isPending ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" /></div>
      ) : result ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold">{result.coverage_score || 0}%</p><p className="text-sm text-muted-foreground">Coverage Score</p></div></div><Progress value={result.coverage_score || 0} className="mt-3" /></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-50"><AlertTriangle className="h-5 w-5 text-red-600" /></div><div><p className="text-2xl font-semibold">{critical + high}</p><p className="text-sm text-muted-foreground">Critical/High Gaps</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-50"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-semibold">{gaps.length}</p><p className="text-sm text-muted-foreground">Total Gaps</p></div></div></CardContent></Card>
          </div>

          {result.top_recommendation && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-4"><div className="flex items-start gap-3"><CatyAIAvatar size="sm" /><div><p className="font-medium text-sm mb-1">CATY's Recommendation</p><p className="text-sm text-muted-foreground">{result.top_recommendation}</p></div></div></CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {gaps.map((gap: any, i: number) => {
              const cfg = severityConfig[gap.severity] || severityConfig.low;
              const Icon = cfg.icon;
              return (
                <div key={i} className={cn("border rounded-lg p-4", cfg.bg)}>
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5", cfg.color)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><h4 className="font-medium">{gap.area}</h4><span className="ml-auto"><Lozenge appearance={cfg.appearance}>{gap.severity}</Lozenge></span></div>
                      <p className="text-sm text-muted-foreground mb-2">{gap.description}</p>
                      <p className="text-sm mb-3"><strong>Recommendation:</strong> {gap.recommendation}</p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => onGenerateFromGap(gap)}><Sparkles className="h-3.5 w-3.5 mr-1" />Generate Tests</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDismissed(new Set([...dismissed, gap.area]))}>Dismiss</Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Card><CardContent className="p-12 text-center"><CatyAIAvatar size="lg" className="mx-auto mb-4" /><h3 className="text-lg font-medium mb-2 text-foreground">Ready to Analyze Coverage</h3><p className="text-muted-foreground mb-4">Click Analyze to let CATY examine your test cases</p><Button onClick={handleAnalyze}><RefreshCw className="h-4 w-4 mr-2" />Start Analysis</Button></CardContent></Card>
      )}
    </div>
  );
}
