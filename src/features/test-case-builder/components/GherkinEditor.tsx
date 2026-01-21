// =====================================================
// GHERKIN EDITOR COMPONENT
// Rich editor for BDD/Gherkin scenarios
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  FileText, 
  Wand2,
  Save,
  RotateCcw 
} from 'lucide-react';
import { 
  useGherkinScenario, 
  useSaveGherkinScenario, 
  useConvertToBdd,
  parseGherkinText,
  formatGherkinText,
  GherkinStep,
  GherkinKeyword
} from '@/hooks/test-cases/useGherkinSteps';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GherkinEditorProps {
  caseId: string;
  projectId: string;
  onClose?: () => void;
}

const KEYWORDS: { value: GherkinKeyword; label: string; color: string }[] = [
  { value: 'Given', label: 'Given', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'When', label: 'When', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'Then', label: 'Then', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'And', label: 'And', color: 'bg-muted text-muted-foreground' },
  { value: 'But', label: 'But', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
];

export function GherkinEditor({ caseId, projectId, onClose }: GherkinEditorProps) {
  const { data: scenario, isLoading } = useGherkinScenario(caseId);
  const saveScenario = useSaveGherkinScenario();
  const convertToBdd = useConvertToBdd();

  const [feature, setFeature] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [steps, setSteps] = useState<GherkinStep[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (scenario) {
      setFeature(scenario.feature || '');
      setScenarioName(scenario.scenario || '');
      setSteps(scenario.steps || []);
      setRawText(formatGherkinText(scenario));
    }
  }, [scenario]);

  const handleAddStep = useCallback((keyword: GherkinKeyword = 'And') => {
    const newStep: GherkinStep = {
      step_number: steps.length + 1,
      keyword,
      step_text: '',
    };
    setSteps([...steps, newStep]);
    setHasChanges(true);
  }, [steps]);

  const handleUpdateStep = useCallback((index: number, updates: Partial<GherkinStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
    setHasChanges(true);
  }, [steps]);

  const handleRemoveStep = useCallback((index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
    setHasChanges(true);
  }, [steps]);

  const handleSave = async () => {
    try {
      let stepsToSave = steps;

      if (rawMode) {
        const parsed = parseGherkinText(rawText);
        setFeature(parsed.feature);
        setScenarioName(parsed.scenario);
        stepsToSave = parsed.steps.map((s, i) => ({ ...s, step_number: i + 1 }));
        setSteps(stepsToSave);
      }

      await saveScenario.mutateAsync({
        caseId,
        feature,
        scenario: scenarioName,
        steps: stepsToSave.map(s => ({
          keyword: s.keyword,
          step_text: s.step_text,
          data_table: s.data_table,
          doc_string: s.doc_string,
        })),
      });

      toast.success('Gherkin scenario saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save scenario');
      console.error(error);
    }
  };

  const handleConvertFromClassic = async () => {
    try {
      await convertToBdd.mutateAsync(caseId);
      toast.success('Converted to BDD format');
    } catch (error) {
      toast.error('Failed to convert');
      console.error(error);
    }
  };

  const getKeywordColor = (keyword: GherkinKeyword) => {
    return KEYWORDS.find(k => k.value === keyword)?.color || 'bg-muted';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gherkin Scenario
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRawMode(!rawMode)}
            >
              {rawMode ? 'Visual Mode' : 'Raw Mode'}
            </Button>
            {scenario?.format === 'classic' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvertFromClassic}
                disabled={convertToBdd.isPending}
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Convert from Classic
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveScenario.isPending || !hasChanges}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {rawMode ? (
          <div className="space-y-2">
            <Textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setHasChanges(true);
              }}
              placeholder={`Feature: User Authentication

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    And I click the login button
    Then I should be redirected to the dashboard`}
              className="font-mono text-sm min-h-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              Write your Gherkin scenario using Feature, Scenario, Given, When, Then, And, But keywords.
            </p>
          </div>
        ) : (
          <>
            {/* Feature & Scenario Headers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">Feature:</Badge>
                <Input
                  value={feature}
                  onChange={(e) => {
                    setFeature(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Feature name"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="font-mono">Scenario:</Badge>
                <Input
                  value={scenarioName}
                  onChange={(e) => {
                    setScenarioName(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Scenario description"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2 ml-8">
              {steps.map((step, index) => (
                <div 
                  key={step.id || `step-${index}`}
                  className="flex items-start gap-2 group"
                >
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </div>
                  
                  <Select
                    value={step.keyword}
                    onValueChange={(value: GherkinKeyword) => handleUpdateStep(index, { keyword: value })}
                  >
                    <SelectTrigger className={cn("w-24 font-mono text-sm", getKeywordColor(step.keyword))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KEYWORDS.map(kw => (
                        <SelectItem key={kw.value} value={kw.value}>
                          <span className={cn("font-mono", kw.color.split(' ')[1])}>
                            {kw.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={step.step_text}
                    onChange={(e) => handleUpdateStep(index, { step_text: e.target.value })}
                    placeholder="Step description..."
                    className="flex-1"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStep(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add Step Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {KEYWORDS.slice(0, 3).map(kw => (
                  <Button
                    key={kw.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddStep(kw.value)}
                    className={cn("text-xs", kw.color)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {kw.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddStep('And')}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  And/But
                </Button>
              </div>
            </div>
          </>
        )}

        {hasChanges && (
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (scenario) {
                  setFeature(scenario.feature || '');
                  setScenarioName(scenario.scenario || '');
                  setSteps(scenario.steps || []);
                  setRawText(formatGherkinText(scenario));
                  setHasChanges(false);
                }
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Discard Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
