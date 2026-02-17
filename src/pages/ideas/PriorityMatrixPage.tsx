// ============================================================
// PRIORITY MATRIX PAGE
// ============================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  ArrowRight,
  Lightbulb,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useImprovementIdeas, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/improvement-ideas';
import type { ImprovementIdea } from '@/types/improvement-ideas';

const QUADRANT_LABELS = {
  'quick-wins': { label: 'Quick Wins', color: 'bg-green-500', description: 'High impact, low effort' },
  'major-projects': { label: 'Major Projects', color: 'bg-blue-500', description: 'High impact, high effort' },
  'fill-ins': { label: 'Fill-Ins', color: 'bg-yellow-500', description: 'Low impact, low effort' },
  'thankless-tasks': { label: 'Avoid', color: 'bg-red-500', description: 'Low impact, high effort' },
};

function getQuadrant(impactScore: number, complexity: number): keyof typeof QUADRANT_LABELS {
  // Impact score is 0-100, complexity is 1-5 (lower = harder)
  const highImpact = impactScore >= 50;
  const lowEffort = complexity >= 3; // complexity >= 3 means easier

  if (highImpact && lowEffort) return 'quick-wins';
  if (highImpact && !lowEffort) return 'major-projects';
  if (!highImpact && lowEffort) return 'fill-ins';
  return 'thankless-tasks';
}

export default function PriorityMatrixPage() {
  const navigate = useNavigate();
  const [selectedInitiative, setSelectedInitiative] = useState<string>('all');
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const { data: ideas, isLoading } = useImprovementIdeas();
  const { data: initiatives } = useImprovementInitiatives();

  // Filter ideas with scores
  const scoredIdeas = useMemo(() => {
    if (!ideas) return [];
    return ideas.filter(idea => idea.impact_score?.calculated_score !== undefined);
  }, [ideas]);

  // Group by quadrant
  const quadrantData = useMemo(() => {
    const filtered = selectedInitiative === 'all' 
      ? scoredIdeas 
      : scoredIdeas.filter(i => i.initiative_id === selectedInitiative);

    const grouped: Record<keyof typeof QUADRANT_LABELS, ImprovementIdea[]> = {
      'quick-wins': [],
      'major-projects': [],
      'fill-ins': [],
      'thankless-tasks': [],
    };

    filtered.forEach(idea => {
      if (!idea.impact_score) return;
      const quadrant = getQuadrant(
        idea.impact_score.calculated_score || 0,
        idea.impact_score.complexity || 3
      );
      grouped[quadrant].push(idea);
    });

    return grouped;
  }, [scoredIdeas, selectedInitiative]);

  const displayedIdeas = selectedQuadrant 
    ? quadrantData[selectedQuadrant as keyof typeof QUADRANT_LABELS] 
    : scoredIdeas;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Priority Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize ideas by impact vs effort to prioritize effectively
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedInitiative} onValueChange={setSelectedInitiative}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Initiatives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Initiatives</SelectItem>
              {initiatives?.map(init => (
                <SelectItem key={init.id} value={init.id}>
                  {init.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate('/producthub/ideas/scoring')}>
            Score Ideas
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {scoredIdeas.length === 0 ? (
        <Card className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Scored Ideas Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Score some ideas first to see them in the priority matrix.
          </p>
          <Button onClick={() => navigate('/producthub/ideas/scoring')}>
            Start Scoring
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Matrix Visualization */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Impact vs Effort Matrix</CardTitle>
                <CardDescription>
                  Click a quadrant to filter ideas
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setZoom(1)}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="relative w-full aspect-square max-w-[600px] mx-auto border rounded-lg overflow-hidden"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              >
                {/* Axes Labels */}
                <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
                  HIGH IMPACT ↑
                </div>
                <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
                  LOW IMPACT ↓
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground">
                  LOW EFFORT ←
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-xs font-medium text-muted-foreground">
                  HIGH EFFORT →
                </div>

                {/* Quadrants */}
                <div className="grid grid-cols-2 grid-rows-2 h-full p-8">
                  {/* Quick Wins - Top Left */}
                  <div 
                    className={`flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-950/30 border-r border-b cursor-pointer transition-all ${selectedQuadrant === 'quick-wins' ? 'ring-2 ring-green-500' : 'hover:bg-green-100 dark:hover:bg-green-950/50'}`}
                    onClick={() => setSelectedQuadrant(prev => prev === 'quick-wins' ? null : 'quick-wins')}
                  >
                    <Badge className="bg-green-500 mb-2">Quick Wins</Badge>
                    <span className="text-2xl font-bold">{quadrantData['quick-wins'].length}</span>
                    <span className="text-xs text-muted-foreground">ideas</span>
                  </div>

                  {/* Major Projects - Top Right */}
                  <div 
                    className={`flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-950/30 border-b cursor-pointer transition-all ${selectedQuadrant === 'major-projects' ? 'ring-2 ring-blue-500' : 'hover:bg-blue-100 dark:hover:bg-blue-950/50'}`}
                    onClick={() => setSelectedQuadrant(prev => prev === 'major-projects' ? null : 'major-projects')}
                  >
                    <Badge className="bg-blue-500 mb-2">Major Projects</Badge>
                    <span className="text-2xl font-bold">{quadrantData['major-projects'].length}</span>
                    <span className="text-xs text-muted-foreground">ideas</span>
                  </div>

                  {/* Fill-Ins - Bottom Left */}
                  <div 
                    className={`flex flex-col items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-950/30 border-r cursor-pointer transition-all ${selectedQuadrant === 'fill-ins' ? 'ring-2 ring-yellow-500' : 'hover:bg-yellow-100 dark:hover:bg-yellow-950/50'}`}
                    onClick={() => setSelectedQuadrant(prev => prev === 'fill-ins' ? null : 'fill-ins')}
                  >
                    <Badge className="bg-yellow-500 mb-2">Fill-Ins</Badge>
                    <span className="text-2xl font-bold">{quadrantData['fill-ins'].length}</span>
                    <span className="text-xs text-muted-foreground">ideas</span>
                  </div>

                  {/* Thankless Tasks - Bottom Right */}
                  <div 
                    className={`flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-950/30 cursor-pointer transition-all ${selectedQuadrant === 'thankless-tasks' ? 'ring-2 ring-red-500' : 'hover:bg-red-100 dark:hover:bg-red-950/50'}`}
                    onClick={() => setSelectedQuadrant(prev => prev === 'thankless-tasks' ? null : 'thankless-tasks')}
                  >
                    <Badge className="bg-red-500 mb-2">Avoid</Badge>
                    <span className="text-2xl font-bold">{quadrantData['thankless-tasks'].length}</span>
                    <span className="text-xs text-muted-foreground">ideas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend & Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quadrant Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(QUADRANT_LABELS).map(([key, { label, color, description }]) => (
                  <div key={key} className="flex items-start gap-2">
                    <div className={`w-3 h-3 rounded-sm ${color} mt-1`} />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Scored:</span>
                  <span className="font-medium">{scoredIdeas.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Impact:</span>
                  <span className="font-medium">
                    {scoredIdeas.length > 0 
                      ? (scoredIdeas.reduce((a, i) => a + (i.impact_score?.calculated_score || 0), 0) / scoredIdeas.length).toFixed(1)
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filtered Ideas List */}
      {selectedQuadrant && quadrantData[selectedQuadrant as keyof typeof QUADRANT_LABELS].length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${QUADRANT_LABELS[selectedQuadrant as keyof typeof QUADRANT_LABELS].color}`} />
                {QUADRANT_LABELS[selectedQuadrant as keyof typeof QUADRANT_LABELS].label}
              </CardTitle>
              <CardDescription>
                {quadrantData[selectedQuadrant as keyof typeof QUADRANT_LABELS].length} ideas
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedQuadrant(null)}>
              Clear Filter
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quadrantData[selectedQuadrant as keyof typeof QUADRANT_LABELS].map(idea => (
                <div 
                  key={idea.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  onClick={() => navigate(`/industry/ideas/${idea.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{idea.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {IDEA_CATEGORY_LABELS[idea.category]} • Score: {idea.impact_score?.calculated_score?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{IDEA_STATUS_LABELS[idea.status]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
