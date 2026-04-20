/**
 * Module 5C-2: Cross-Release Comparison View
 * Compare metrics across multiple releases
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useReleaseComparison, useComparableReleases } from '../hooks/useAnalytics';
import { COMPARISON_METRICS, type ReleaseComparisonItem } from '../types/analytics';
import { CATALYST_COLORS } from '../types';

const HEALTH_APPEARANCE: Record<ReleaseComparisonItem['healthLevel'], LozengeAppearance> = {
  healthy: 'success',
  attention: 'inprogress',
  at_risk: 'moved',
  critical: 'removed',
};

interface ReleaseComparisonViewProps {
  projectId: string;
  currentReleaseId?: string;
}

const CHART_COLORS = [
  CATALYST_COLORS.primary,
  CATALYST_COLORS.teal,
  CATALYST_COLORS.warning,
  '#8b5cf6',
  '#ec4899',
];

export function ReleaseComparisonView({ projectId, currentReleaseId }: ReleaseComparisonViewProps) {
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>(
    currentReleaseId ? [currentReleaseId] : []
  );

  const { data: availableReleases, isLoading: releasesLoading } = useComparableReleases(projectId);
  const { data: comparisonData, isLoading: comparisonLoading } = useReleaseComparison(selectedReleaseIds);

  const toggleRelease = (releaseId: string) => {
    setSelectedReleaseIds(prev =>
      prev.includes(releaseId)
        ? prev.filter(id => id !== releaseId)
        : prev.length < 5
          ? [...prev, releaseId]
          : prev
    );
  };

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!comparisonData?.length) return [];

    return [
      { metric: 'Execution', fullMark: 100, ...Object.fromEntries(comparisonData.map(r => [r.releaseName, r.executionRate])) },
      { metric: 'Pass Rate', fullMark: 100, ...Object.fromEntries(comparisonData.map(r => [r.releaseName, r.passRate])) },
      { metric: 'Health', fullMark: 100, ...Object.fromEntries(comparisonData.map(r => [r.releaseName, r.healthScore])) },
      { metric: 'Low Defects', fullMark: 100, ...Object.fromEntries(comparisonData.map(r => [r.releaseName, Math.max(0, 100 - r.openDefects * 5)])) },
      { metric: 'No Blockers', fullMark: 100, ...Object.fromEntries(comparisonData.map(r => [r.releaseName, r.blockerDefects === 0 ? 100 : Math.max(0, 100 - r.blockerDefects * 20)])) },
    ];
  }, [comparisonData]);

  // Determine winner for each metric
  const winners = useMemo(() => {
    if (!comparisonData?.length) return {};

    const result: Record<string, { winner: string; value: number }> = {};

    COMPARISON_METRICS.forEach(metric => {
      const sorted = [...comparisonData].sort((a, b) => {
        const aVal = (a as any)[metric.key];
        const bVal = (b as any)[metric.key];
        return metric.higherIsBetter ? bVal - aVal : aVal - bVal;
      });

      if (sorted.length > 0) {
        result[metric.key] = {
          winner: sorted[0].releaseName,
          value: (sorted[0] as any)[metric.key],
        };
      }
    });

    return result;
  }, [comparisonData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <GitCompare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Release Comparison</h2>
          <p className="text-sm text-muted-foreground">
            Select up to 5 releases to compare metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Release Selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Available Releases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {releasesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  availableReleases?.map((release: any, index: number) => (
                    <label
                      key={release.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedReleaseIds.includes(release.id)}
                        onCheckedChange={() => toggleRelease(release.id)}
                        disabled={!selectedReleaseIds.includes(release.id) && selectedReleaseIds.length >= 5}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{release.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {release.version || 'No version'}
                        </div>
                      </div>
                      {selectedReleaseIds.includes(release.id) && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[selectedReleaseIds.indexOf(release.id)] }}
                        />
                      )}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Comparison Content */}
        <div className="lg:col-span-3 space-y-6">
          {selectedReleaseIds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select at least one release to view comparison data.
              </CardContent>
            </Card>
          ) : comparisonLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading comparison data...
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Radar Chart */}
              {selectedReleaseIds.length >= 2 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Multi-Dimensional Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid className="stroke-border" />
                        <PolarAngleAxis dataKey="metric" className="fill-muted-foreground text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} className="fill-muted-foreground text-xs" />
                        {comparisonData?.map((release, index) => (
                          <Radar
                            key={release.releaseId}
                            name={release.releaseName}
                            dataKey={release.releaseName}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Metrics Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detailed Metrics Comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Release</TableHead>
                        <TableHead>Health</TableHead>
                        <TableHead className="text-right">Execution</TableHead>
                        <TableHead className="text-right">Pass Rate</TableHead>
                        <TableHead className="text-right">Defects</TableHead>
                        <TableHead className="text-right">Blockers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData?.map((release, index) => (
                        <TableRow key={release.releaseId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <div>
                                <div className="font-medium">{release.releaseName}</div>
                                <div className="text-xs text-muted-foreground">{release.releaseVersion}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Lozenge appearance={HEALTH_APPEARANCE[release.healthLevel]}>
                              {release.healthScore}
                            </Lozenge>
                          </TableCell>
                          <TableCell className="text-right">
                            <MetricValue
                              value={release.executionRate}
                              unit="%"
                              isWinner={winners.executionRate?.winner === release.releaseName}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <MetricValue
                              value={release.passRate}
                              unit="%"
                              isWinner={winners.passRate?.winner === release.releaseName}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <MetricValue
                              value={release.openDefects}
                              isWinner={winners.openDefects?.winner === release.releaseName}
                              lowerIsBetter
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <MetricValue
                              value={release.blockerDefects}
                              isWinner={winners.blockerDefects?.winner === release.releaseName}
                              lowerIsBetter
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Bar Chart Comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pass Rate Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparisonData || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" domain={[0, 100]} fontSize={11} />
                      <YAxis dataKey="releaseName" type="category" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="passRate" fill={CATALYST_COLORS.teal} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Value with Winner Badge
// ─────────────────────────────────────────────────────────────────────────────

interface MetricValueProps {
  value: number;
  unit?: string;
  isWinner?: boolean;
  lowerIsBetter?: boolean;
}

function MetricValue({ value, unit = '', isWinner, lowerIsBetter }: MetricValueProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <span className={isWinner ? 'font-bold text-teal-600' : ''}>
        {value}{unit}
      </span>
      {isWinner && (
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
      )}
    </div>
  );
}
