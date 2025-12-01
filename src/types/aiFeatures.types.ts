export interface GeneratedTestCase {
  title: string;
  description: string;
  steps: Array<{
    action: string;
    expectedResult: string;
  }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  testType: 'manual' | 'automated';
}

export interface PriorityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface CoverageGap {
  featureId: string;
  featureName: string;
  storiesWithoutTests: Array<{
    storyId: string;
    storyTitle: string;
  }>;
}

export interface TestSuggestion {
  id: string;
  type: 'missing_coverage' | 'low_coverage' | 'critical_path' | 'security';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  affectedFeatureId?: string;
  affectedFeatureName?: string;
}
