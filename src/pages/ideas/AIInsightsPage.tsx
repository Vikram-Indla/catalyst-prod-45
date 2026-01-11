// ============================================================
// AI INSIGHTS PAGE - Improvement Ideas Module
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Brain,
  Copy,
  AlertTriangle,
  TrendingUp,
  Zap,
  CheckCircle2,
  X,
  ChevronRight,
  Target,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useImprovementIdeas } from '@/hooks/useImprovementIdeas';
import { useIdeasAwaitingTriage } from '@/hooks/ideas/useQuickWins';
import { IDEA_TYPE_COLORS, IDEA_TYPE_LABELS } from '@/types/improvement-ideas';

export default function AIInsightsPage() {
  const navigate = useNavigate();
  const { data: allIdeas = [], isLoading: ideasLoading } = useImprovementIdeas();
  const { data: awaitingTriage = [], isLoading: triageLoading } = useIdeasAwaitingTriage();

  // Mock data for AI insights (would come from AI analysis in real implementation)
  const duplicates = [
    { 
      id: '1', 
      idea1: { code: 'IDEA-2026-00001', title: 'Improve report export' },
      idea2: { code: 'IDEA-2026-00005', title: 'Add export functionality to reports' },
      similarity: 87 
    },
    { 
      id: '2', 
      idea1: { code: 'IDEA-2026-00003', title: 'Mobile app for approvals' },
      idea2: { code: 'IDEA-2026-00008', title: 'Approval workflow on mobile' },
      similarity: 72 
    },
  ];

  const complianceAlerts = [
    { id: '1', ideaCode: 'IDEA-2026-00002', title: 'Data migration tool', flag: 'Missing DGA compliance tag', severity: 'warning' },
    { id: '2', ideaCode: 'IDEA-2026-00004', title: 'External API integration', flag: 'NCA security review required', severity: 'error' },
  ];

  const trendingThemes = [
    { theme: 'Mobile Capabilities', count: 12, growth: 45 },
    { theme: 'Reporting & Analytics', count: 8, growth: 23 },
    { theme: 'Process Automation', count: 7, growth: 18 },
    { theme: 'Data Quality', count: 5, growth: -5 },
  ];

  const quickWinCandidates = allIdeas
    .filter(idea => idea.idea_type === 'standard' && !idea.triaged_at)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis and recommendations for your improvement ideas
          </p>
        </div>
      </div>

      {/* Triage Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Triage Recommendations
          </CardTitle>
          <CardDescription>
            Ideas awaiting classification with AI suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {triageLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : awaitingTriage.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p>All ideas have been triaged!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {awaitingTriage.slice(0, 5).map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="font-mono text-xs">
                      {idea.code}
                    </Badge>
                    <span className="font-medium">{idea.title}</span>
                    {idea.ai_suggested_type && (
                      <Badge 
                        className="text-xs text-white"
                        style={{ 
                          backgroundColor: idea.ai_suggested_type === 'quick_win' ? '#10b981' : idea.ai_suggested_type === 'strategic' ? '#2563eb' : '#6b7280'
                        }}
                      >
                        AI: {IDEA_TYPE_LABELS[idea.ai_suggested_type]}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/industry/ideas/${idea.id}`)}
                  >
                    Triage
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicate Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-4 w-4 text-blue-500" />
              Potential Duplicates
            </CardTitle>
            <CardDescription>
              Ideas that may be duplicates based on content similarity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicates.map((dup) => (
                <div key={dup.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {dup.similarity}% Similar
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {dup.idea1.code}
                      </Badge>
                      <span className="text-muted-foreground">{dup.idea1.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {dup.idea2.code}
                      </Badge>
                      <span className="text-muted-foreground">{dup.idea2.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Compliance Alerts
            </CardTitle>
            <CardDescription>
              Ideas that may require compliance review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.severity === 'error' 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : 'border-orange-500/50 bg-orange-500/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {alert.ideaCode}
                      </Badge>
                      <span className="font-medium text-sm">{alert.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.flag}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Themes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Trending Themes
            </CardTitle>
            <CardDescription>
              Most common topics in recent submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendingThemes.map((theme, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{theme.theme}</span>
                      <span className="text-xs text-muted-foreground">{theme.count} ideas</span>
                    </div>
                    <Progress value={theme.count * 8} className="h-2" />
                  </div>
                  <Badge 
                    variant="secondary"
                    className={theme.growth > 0 ? 'text-emerald-600' : 'text-red-600'}
                  >
                    {theme.growth > 0 ? '+' : ''}{theme.growth}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Win Candidates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-emerald-500" />
              Quick Win Candidates
            </CardTitle>
            <CardDescription>
              Untriaged ideas that AI suggests as quick wins
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quickWinCandidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2" />
                <p>No candidates found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickWinCandidates.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                    onClick={() => navigate(`/industry/ideas/${idea.id}`)}
                  >
                    <div>
                      <Badge variant="outline" className="font-mono text-xs mb-1">
                        {idea.code}
                      </Badge>
                      <p className="font-medium text-sm">{idea.title}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
