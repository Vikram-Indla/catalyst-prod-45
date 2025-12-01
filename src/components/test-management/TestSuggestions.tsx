import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertCircle, Shield, TrendingUp } from 'lucide-react';
import { TestSuggestion } from '@/types/aiFeatures.types';

export const TestSuggestions: React.FC = () => {
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['test-suggestions'],
    queryFn: async (): Promise<TestSuggestion[]> => {
      // Generate rule-based suggestions
      const suggestions: TestSuggestion[] = [];

      // Get test coverage stats
      const { data: testCases } = await supabase
        .from('test_cases')
        .select('id, linked_work_item_id, linked_work_item_type');

      const { data: features } = await supabase
        .from('features')
        .select('id, name, health');

      if (!features || !testCases) return suggestions;

      // Check for critical features with low test coverage
      for (const feature of features) {
        const featureTests = testCases.filter(
          tc => tc.linked_work_item_type === 'feature' && tc.linked_work_item_id === feature.id
        );

        if (featureTests.length < 3 && (feature.health === 'red' || feature.health === 'yellow')) {
          suggestions.push({
            id: `low-coverage-${feature.id}`,
            type: 'low_coverage',
            title: `Low test coverage for at-risk feature`,
            description: `Feature "${feature.name}" is at risk but only has ${featureTests.length} test case(s). Recommended: 5+ tests.`,
            priority: 'high',
            affectedFeatureId: feature.id,
            affectedFeatureName: feature.name,
          });
        }
      }

      // Add generic security suggestion
      const securityTests = testCases.filter(tc => 
        tc.linked_work_item_type === 'feature' // Could check test title/description for security keywords
      );

      if (securityTests.length < 5) {
        suggestions.push({
          id: 'security-coverage',
          type: 'security',
          title: 'Increase security test coverage',
          description: 'Consider adding tests for authentication, authorization, input validation, and XSS prevention.',
          priority: 'critical',
        });
      }

      // Add critical path suggestion
      suggestions.push({
        id: 'critical-path-1',
        type: 'critical_path',
        title: 'Test user registration flow',
        description: 'Ensure end-to-end testing of the complete user registration and email verification process.',
        priority: 'high',
      });

      return suggestions.slice(0, 5); // Limit to 5 suggestions
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="h-5 w-5 text-red-600" />;
      case 'critical_path': return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'low_coverage': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default: return <Lightbulb className="h-5 w-5 text-brand-gold" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-gold" />
            AI Test Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Analyzing test suite...</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-brand-gold" />
          AI Test Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors space-y-2"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(suggestion.type)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{suggestion.title}</h3>
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                {suggestion.affectedFeatureName && (
                  <p className="text-xs text-muted-foreground">
                    Feature: {suggestion.affectedFeatureName}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-brand-gold border-brand-gold hover:bg-brand-gold/10"
            >
              Create Test Case
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
