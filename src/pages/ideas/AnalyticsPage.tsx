// ============================================================
// ANALYTICS PAGE - Improvement Ideas Module
// ============================================================

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  ArrowRight,
  Zap,
  Layers,
  Clock,
  Users,
  Target,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useImprovementIdeas, useImprovementInitiatives, useIdeasHubMetrics } from '@/hooks/useImprovementIdeas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const { data: ideas = [], isLoading: ideasLoading } = useImprovementIdeas();
  const { data: initiatives = [], isLoading: initiativesLoading } = useImprovementInitiatives();
  const { data: metrics, isLoading: metricsLoading } = useIdeasHubMetrics();

  // Calculate funnel metrics
  const totalSubmitted = ideas.length;
  const totalTriaged = ideas.filter(i => i.triaged_at).length;
  const quickWins = ideas.filter(i => i.idea_type === 'quick_win').length;
  const quickWinsConverted = ideas.filter(i => i.idea_type === 'quick_win' && i.status === 'converted').length;
  const strategic = ideas.filter(i => i.idea_type === 'strategic').length;
  const strategicLinked = ideas.filter(i => i.idea_type === 'strategic' && i.initiative_id).length;
  const strategicConverted = ideas.filter(i => i.idea_type === 'strategic' && i.status === 'converted').length;

  // Category distribution
  const categoryData = [
    { name: 'Process Optimization', value: ideas.filter(i => i.category === 'process_optimization').length },
    { name: 'Digital Service', value: ideas.filter(i => i.category === 'digital_service').length },
    { name: 'Compliance', value: ideas.filter(i => i.category === 'compliance_automation').length },
    { name: 'Integration', value: ideas.filter(i => i.category === 'integration').length },
    { name: 'Other', value: ideas.filter(i => !['process_optimization', 'digital_service', 'compliance_automation', 'integration'].includes(i.category)).length },
  ].filter(d => d.value > 0);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // Type distribution
  const typeData = [
    { name: 'Quick Win', value: quickWins, color: '#10b981' },
    { name: 'Strategic', value: strategic, color: '#2563eb' },
    { name: 'Standard', value: ideas.filter(i => i.idea_type === 'standard').length, color: '#6b7280' },
  ];

  // Path comparison metrics (mock data for now)
  const pathComparison = [
    { metric: 'Avg Time to BR', quickWin: '3.2 days', strategic: '18.5 days' },
    { metric: 'Ideas per BR', quickWin: '1.0', strategic: '8.3' },
    { metric: 'Avg IMPACT', quickWin: '3.1', strategic: '4.2' },
    { metric: 'Success Rate', quickWin: '84%', strategic: '34%' },
  ];

  // Weekly submission trend (mock data)
  const weeklyTrend = [
    { week: 'W1', ideas: 5, quickWins: 2, strategic: 2 },
    { week: 'W2', ideas: 8, quickWins: 4, strategic: 3 },
    { week: 'W3', ideas: 6, quickWins: 3, strategic: 2 },
    { week: 'W4', ideas: 12, quickWins: 5, strategic: 4 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Ideas Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Insights and performance metrics for improvement ideas
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>
            Track ideas from submission to business request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Submitted */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Submitted</span>
                <span className="text-muted-foreground">{totalSubmitted} (100%)</span>
              </div>
              <Progress value={100} className="h-3" />
            </div>

            {/* Triaged */}
            <div className="space-y-2 ml-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Triaged</span>
                <span className="text-muted-foreground">
                  {totalTriaged} ({totalSubmitted > 0 ? Math.round((totalTriaged / totalSubmitted) * 100) : 0}%)
                </span>
              </div>
              <Progress 
                value={totalSubmitted > 0 ? (totalTriaged / totalSubmitted) * 100 : 0} 
                className="h-3" 
              />
            </div>

            {/* Branches */}
            <div className="grid grid-cols-2 gap-6 ml-8 mt-4">
              {/* Quick Win Path */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-emerald-600">Quick Win Path</span>
                </div>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Quick Wins</span>
                    <span className="text-muted-foreground">{quickWins}</span>
                  </div>
                  <Progress value={totalTriaged > 0 ? (quickWins / totalTriaged) * 100 : 0} className="h-2 bg-emerald-100" />
                  
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span>Converted to BR</span>
                    <span className="text-muted-foreground">
                      {quickWinsConverted} ({quickWins > 0 ? Math.round((quickWinsConverted / quickWins) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress 
                    value={quickWins > 0 ? (quickWinsConverted / quickWins) * 100 : 0} 
                    className="h-2 bg-emerald-100" 
                  />
                </div>
              </div>

              {/* Strategic Path */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-600">Strategic Path</span>
                </div>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Strategic Ideas</span>
                    <span className="text-muted-foreground">{strategic}</span>
                  </div>
                  <Progress value={totalTriaged > 0 ? (strategic / totalTriaged) * 100 : 0} className="h-2 bg-blue-100" />
                  
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span>Linked to Initiative</span>
                    <span className="text-muted-foreground">
                      {strategicLinked} ({strategic > 0 ? Math.round((strategicLinked / strategic) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress 
                    value={strategic > 0 ? (strategicLinked / strategic) * 100 : 0} 
                    className="h-2 bg-blue-100" 
                  />
                  
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span>Converted to BR</span>
                    <span className="text-muted-foreground">
                      {strategicConverted} ({strategic > 0 ? Math.round((strategicConverted / strategic) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress 
                    value={strategic > 0 ? (strategicConverted / strategic) * 100 : 0} 
                    className="h-2 bg-blue-100" 
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Path Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-primary" />
            Path Comparison
          </CardTitle>
          <CardDescription>
            Quick Win vs Strategic path performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-medium">Metric</th>
                  <th className="text-center py-3 font-medium text-emerald-600">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-4 w-4" />
                      Quick Win
                    </div>
                  </th>
                  <th className="text-center py-3 font-medium text-blue-600">
                    <div className="flex items-center justify-center gap-1">
                      <Layers className="h-4 w-4" />
                      Strategic
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pathComparison.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-3">{row.metric}</td>
                    <td className="py-3 text-center">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        {row.quickWin}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {row.strategic}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-primary" />
              Idea Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Submission Trend
          </CardTitle>
          <CardDescription>
            Ideas submitted over time by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="ideas" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="quickWins" stroke="#10b981" strokeWidth={2} name="Quick Wins" />
              <Line type="monotone" dataKey="strategic" stroke="#2563eb" strokeWidth={2} name="Strategic" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Top Contributors
          </CardTitle>
          <CardDescription>
            Most active idea submitters and scorers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>Contributor data coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
