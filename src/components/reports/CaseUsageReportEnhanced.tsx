/**
 * Case Usage Report Enhanced - Prompt 3.21
 * Purpose: Deep analysis of test case usage patterns
 * Sections: Usage Overview, Distribution Histogram, Top 50 Most/Least Used, Never Executed, Stability Analysis, Retirement Candidates
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AlertTriangle, CheckCircle, XCircle, Download, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend } from 'recharts';

interface UsageOverview {
  total: number;
  uniqueExecuted: number;
  uniqueExecutedPercent: number;
  neverExecuted: number;
  neverExecutedPercent: number;
  avgPerCase: number;
}

interface UsageDistribution {
  range: string;
  count: number;
}

interface TopCase {
  rank: number;
  key: string;
  title: string;
  executionCount: number;
  uniqueCycles: number;
  passRate: number;
  defects: number;
  usageScore: number;
}

interface NeverExecutedCase {
  key: string;
  title: string;
  created: string;
  age: number;
  priority: string;
  owner: string;
}

interface StabilityCategory {
  category: string;
  count: number;
  color: string;
  cases: { key: string; title: string; passRate: number }[];
}

interface RetirementCandidate {
  key: string;
  title: string;
  lastExecuted: string;
  daysInactive: number;
  recommendation: string;
}

interface DefectCorrelation {
  key: string;
  executions: number;
  defects: number;
}

interface CaseUsageReportEnhancedProps {
  data?: {
    overview: UsageOverview;
    distribution: UsageDistribution[];
    topMost: TopCase[];
    topLeast: TopCase[];
    neverExecuted: NeverExecutedCase[];
    stability: StabilityCategory[];
    retirementCandidates: RetirementCandidate[];
    defectCorrelation: DefectCorrelation[];
  };
  isLoading?: boolean;
}

// Mock data per specification
const mockData = {
  overview: {
    total: 450,
    uniqueExecuted: 380,
    uniqueExecutedPercent: 84,
    neverExecuted: 70,
    neverExecutedPercent: 16,
    avgPerCase: 5.2,
  },
  distribution: [
    { range: '0', count: 70 },
    { range: '1', count: 45 },
    { range: '2-5', count: 120 },
    { range: '6-10', count: 95 },
    { range: '11-20', count: 80 },
    { range: '20+', count: 40 },
  ],
  topMost: [
    { rank: 1, key: 'TC-012', title: 'Login Authentication', executionCount: 156, uniqueCycles: 12, passRate: 94, defects: 3, usageScore: 345 },
    { rank: 2, key: 'TC-023', title: 'Checkout Flow', executionCount: 142, uniqueCycles: 11, passRate: 88, defects: 8, usageScore: 332 },
    { rank: 3, key: 'TC-045', title: 'User Registration', executionCount: 128, uniqueCycles: 10, passRate: 91, defects: 5, usageScore: 301 },
    { rank: 4, key: 'TC-067', title: 'Password Reset', executionCount: 115, uniqueCycles: 9, passRate: 96, defects: 1, usageScore: 245 },
    { rank: 5, key: 'TC-089', title: 'Payment Processing', executionCount: 102, uniqueCycles: 8, passRate: 82, defects: 12, usageScore: 284 },
  ],
  topLeast: [
    { rank: 446, key: 'TC-412', title: 'Legacy Report Export', executionCount: 1, uniqueCycles: 1, passRate: 100, defects: 0, usageScore: 2 },
    { rank: 447, key: 'TC-398', title: 'Admin Backup Config', executionCount: 1, uniqueCycles: 1, passRate: 100, defects: 0, usageScore: 2 },
    { rank: 448, key: 'TC-445', title: 'Debug Mode Toggle', executionCount: 1, uniqueCycles: 1, passRate: 0, defects: 1, usageScore: 7 },
    { rank: 449, key: 'TC-401', title: 'Cache Clear Manual', executionCount: 1, uniqueCycles: 1, passRate: 100, defects: 0, usageScore: 2 },
    { rank: 450, key: 'TC-420', title: 'System Health Check', executionCount: 1, uniqueCycles: 1, passRate: 100, defects: 0, usageScore: 2 },
  ],
  neverExecuted: [
    { key: 'TC-450', title: 'New Feature X Test', created: '2024-05-01', age: 14, priority: 'High', owner: 'John Doe' },
    { key: 'TC-448', title: 'Edge Case Handler', created: '2024-04-20', age: 25, priority: 'Medium', owner: 'Jane Smith' },
    { key: 'TC-442', title: 'API Rate Limit Test', created: '2024-04-10', age: 35, priority: 'Low', owner: 'Mike Johnson' },
  ],
  stability: [
    { category: 'Stable (>90%)', count: 285, color: '#10b981', cases: [
      { key: 'TC-012', title: 'Login Authentication', passRate: 94 },
      { key: 'TC-067', title: 'Password Reset', passRate: 96 },
    ]},
    { category: 'Flaky (50-90%)', count: 78, color: '#f59e0b', cases: [
      { key: 'TC-089', title: 'Payment Processing', passRate: 82 },
      { key: 'TC-156', title: 'Search Autocomplete', passRate: 68 },
    ]},
    { category: 'Unstable (<50%)', count: 17, color: '#ef4444', cases: [
      { key: 'TC-234', title: 'Real-time Sync', passRate: 42 },
      { key: 'TC-267', title: 'WebSocket Connection', passRate: 38 },
    ]},
  ],
  retirementCandidates: [
    { key: 'TC-112', title: 'Legacy Feature A', lastExecuted: '2024-01-15', daysInactive: 120, recommendation: 'Archive' },
    { key: 'TC-089', title: 'Deprecated Flow B', lastExecuted: '2024-02-01', daysInactive: 103, recommendation: 'Review' },
    { key: 'TC-156', title: 'Old Integration C', lastExecuted: '2024-02-10', daysInactive: 94, recommendation: 'Review' },
  ],
  defectCorrelation: [
    { key: 'TC-012', executions: 156, defects: 3 },
    { key: 'TC-023', executions: 142, defects: 8 },
    { key: 'TC-089', executions: 102, defects: 12 },
    { key: 'TC-234', executions: 45, defects: 15 },
    { key: 'TC-267', executions: 28, defects: 18 },
  ],
};

export const CaseUsageReportEnhanced: React.FC<CaseUsageReportEnhancedProps> = ({
  data = mockData,
  isLoading = false,
}) => {
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const { overview, distribution, topMost, topLeast, neverExecuted, stability, retirementCandidates, defectCorrelation } = data;

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Usage Overview Cards - per spec */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="h-4 w-4" />
              Total Cases
            </div>
            <div className="text-2xl font-bold text-brand-gold">{overview.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Unique Executed
            </div>
            <div className="text-2xl font-bold">{overview.uniqueExecuted}</div>
            <div className="text-sm text-green-500">{overview.uniqueExecutedPercent}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              Never Executed
            </div>
            <div className="text-2xl font-bold">{overview.neverExecuted}</div>
            <div className="text-sm text-red-500">{overview.neverExecutedPercent}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Avg per Case
            </div>
            <div className="text-2xl font-bold">{overview.avgPerCase}</div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Distribution Histogram - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distribution}>
              <XAxis dataKey="range" fontSize={12} label={{ value: 'Execution Count', position: 'bottom' }} />
              <YAxis fontSize={12} label={{ value: 'Cases', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#c69c6d" name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 50 Most/Least Used Cases - per spec */}
      <Tabs defaultValue="most">
        <TabsList>
          <TabsTrigger value="most">Top 50 Most Used</TabsTrigger>
          <TabsTrigger value="least">Bottom 50 Least Used</TabsTrigger>
        </TabsList>
        <TabsContent value="most">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 50 Most Used Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Rank</th>
                      <th className="text-left p-2">Key</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-right p-2">Executions</th>
                      <th className="text-right p-2">Cycles</th>
                      <th className="text-right p-2">Pass Rate %</th>
                      <th className="text-right p-2">Defects</th>
                      <th className="text-right p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMost.map((tc) => (
                      <tr key={tc.key} className={`border-b hover:bg-muted/50 ${tc.passRate >= 90 ? 'bg-green-500/5' : tc.passRate < 70 ? 'bg-red-500/5' : ''}`}>
                        <td className="p-2">{tc.rank}</td>
                        <td className="p-2 font-mono text-brand-gold">{tc.key}</td>
                        <td className="p-2">{tc.title}</td>
                        <td className="p-2 text-right font-medium">{tc.executionCount}</td>
                        <td className="p-2 text-right">{tc.uniqueCycles}</td>
                        <td className={`p-2 text-right ${getPassRateColor(tc.passRate)}`}>{tc.passRate}%</td>
                        <td className="p-2 text-right">{tc.defects > 0 ? <span className="text-red-500">{tc.defects}</span> : '-'}</td>
                        <td className="p-2 text-right font-medium text-brand-gold">{tc.usageScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="least">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bottom 50 Least Used Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Rank</th>
                      <th className="text-left p-2">Key</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-right p-2">Executions</th>
                      <th className="text-right p-2">Cycles</th>
                      <th className="text-right p-2">Pass Rate %</th>
                      <th className="text-right p-2">Defects</th>
                      <th className="text-right p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLeast.map((tc) => (
                      <tr key={tc.key} className="border-b hover:bg-muted/50">
                        <td className="p-2">{tc.rank}</td>
                        <td className="p-2 font-mono text-brand-gold">{tc.key}</td>
                        <td className="p-2">{tc.title}</td>
                        <td className="p-2 text-right font-medium">{tc.executionCount}</td>
                        <td className="p-2 text-right">{tc.uniqueCycles}</td>
                        <td className={`p-2 text-right ${getPassRateColor(tc.passRate)}`}>{tc.passRate}%</td>
                        <td className="p-2 text-right">{tc.defects > 0 ? <span className="text-red-500">{tc.defects}</span> : '-'}</td>
                        <td className="p-2 text-right font-medium text-brand-gold">{tc.usageScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Never Executed Cases Table - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Never Executed Cases ({neverExecuted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-right p-2">Age (days)</th>
                  <th className="text-left p-2">Priority</th>
                  <th className="text-left p-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {neverExecuted.map((tc) => (
                  <tr key={tc.key} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-brand-gold">{tc.key}</td>
                    <td className="p-2">{tc.title}</td>
                    <td className="p-2 text-muted-foreground">{tc.created}</td>
                    <td className="p-2 text-right">{tc.age}</td>
                    <td className={`p-2 font-medium ${getPriorityColor(tc.priority)}`}>{tc.priority}</td>
                    <td className="p-2">{tc.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Case Stability Analysis - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Case Stability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {stability.map((cat) => (
              <div key={cat.category} className="p-4 rounded-lg border" style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{cat.category}</span>
                  <Badge style={{ backgroundColor: cat.color }} className="text-white">{cat.count}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  {cat.cases.slice(0, 3).map((c) => (
                    <div key={c.key} className="flex justify-between">
                      <span className="text-muted-foreground">{c.key}</span>
                      <span className={getPassRateColor(c.passRate)}>{c.passRate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stability} layout="vertical">
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="category" type="category" fontSize={12} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#c69c6d" name="Cases">
                {stability.map((entry, index) => (
                  <rect key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Case Retirement Candidates - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Case Retirement Candidates (90+ days inactive)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Last Executed</th>
                  <th className="text-right p-2">Days Inactive</th>
                  <th className="text-left p-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {retirementCandidates.map((tc) => (
                  <tr key={tc.key} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-brand-gold">{tc.key}</td>
                    <td className="p-2">{tc.title}</td>
                    <td className="p-2 text-muted-foreground">{tc.lastExecuted}</td>
                    <td className="p-2 text-right text-orange-500 font-medium">{tc.daysInactive}</td>
                    <td className="p-2">
                      <Badge variant={tc.recommendation === 'Archive' ? 'destructive' : 'outline'}>
                        {tc.recommendation}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Defect Discovery Correlation Scatter - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Defect Discovery Correlation</CardTitle>
          <p className="text-sm text-muted-foreground">Outliers: Low execution, high defects = high value cases</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <XAxis dataKey="executions" name="Executions" fontSize={12} label={{ value: 'Execution Count', position: 'bottom' }} />
              <YAxis dataKey="defects" name="Defects" fontSize={12} label={{ value: 'Defects Found', angle: -90, position: 'insideLeft' }} />
              <ZAxis dataKey="key" name="Case" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={defectCorrelation} fill="#c69c6d" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Export Buttons - per spec */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>
    </div>
  );
};
