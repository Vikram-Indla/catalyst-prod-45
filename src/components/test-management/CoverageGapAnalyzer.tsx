import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { CoverageGap } from '@/types/aiFeatures.types';

export const CoverageGapAnalyzer: React.FC = () => {
  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ['coverage-gaps'],
    queryFn: async (): Promise<CoverageGap[]> => {
      // Get all features
      const { data: features } = await supabase
        .from('features')
        .select('id, name');

      if (!features) return [];

      // Get all stories
      const { data: stories } = await supabase
        .from('stories')
        .select('id, name, feature_id');

      if (!stories) return [];

      // Get all test cases with linked work items
      const { data: testCases } = await supabase
        .from('test_cases')
        .select('linked_work_item_id, linked_work_item_type');

      const testedStoryIds = new Set(
        testCases
          ?.filter(tc => tc.linked_work_item_type === 'story')
          .map(tc => tc.linked_work_item_id) || []
      );

      // Find features with stories that have no tests
      const gaps: CoverageGap[] = [];

      for (const feature of features) {
        const featureStories = stories.filter(s => s.feature_id === feature.id);
        const untestedStories = featureStories.filter(s => !testedStoryIds.has(s.id));

        if (untestedStories.length > 0) {
          gaps.push({
            featureId: feature.id,
            featureName: feature.name,
            storiesWithoutTests: untestedStories.map(s => ({
              storyId: s.id,
              storyTitle: s.name,
            })),
          });
        }
      }

      return gaps;
    },
  });

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Coverage Gaps Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Analyzing test coverage...</p>
        </CardContent>
      </Card>
    );
  }

  if (gaps.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            No Coverage Gaps Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All features have test coverage. Great work!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Coverage Gaps Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {gaps.map((gap) => (
          <div
            key={gap.featureId}
            className="border border-border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{gap.featureName}</h3>
                <p className="text-sm text-muted-foreground">
                  Stories without tests: {gap.storiesWithoutTests.length}
                </p>
              </div>
              <Badge variant="destructive">{gap.storiesWithoutTests.length}</Badge>
            </div>

            <div className="space-y-1 pl-4">
              {gap.storiesWithoutTests.slice(0, 3).map((story) => (
                <div key={story.storyId} className="text-sm text-muted-foreground">
                  • {story.storyTitle}
                </div>
              ))}
              {gap.storiesWithoutTests.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  ...and {gap.storiesWithoutTests.length - 3} more
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              <Sparkles className="h-4 w-4" />
              Generate Tests for {gap.featureName}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
