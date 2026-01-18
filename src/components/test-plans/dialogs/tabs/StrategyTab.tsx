/**
 * StrategyTab - Tab 3: Strategy Fields
 */
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TestPlanFormState } from '../CreateEditTestPlanDialog.types';
import { CharacterCounter } from '../components/CharacterCounter';

interface StrategyTabProps {
  formState: TestPlanFormState;
  setField: <K extends keyof TestPlanFormState>(field: K, value: TestPlanFormState[K]) => void;
}

export function StrategyTab({ formState, setField }: StrategyTabProps) {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Test Approach
          </Label>
          <CharacterCounter current={formState.test_strategy.length} max={2000} />
        </div>
        <Textarea
          placeholder="Describe the overall testing approach, methodologies, and techniques..."
          value={formState.test_strategy}
          onChange={(e) => setField('test_strategy', e.target.value)}
          rows={5}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Environment Requirements
        </Label>
        <Textarea
          placeholder="Specify test environments, configurations, and infrastructure needs..."
          value={formState.environment_requirements}
          onChange={(e) => setField('environment_requirements', e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Entry Criteria
          </Label>
          <Textarea
            placeholder="Conditions that must be met before testing begins..."
            value={formState.entry_criteria}
            onChange={(e) => setField('entry_criteria', e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Exit Criteria
          </Label>
          <Textarea
            placeholder="Conditions that must be met to complete testing..."
            value={formState.exit_criteria}
            onChange={(e) => setField('exit_criteria', e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Assumptions
        </Label>
        <Textarea
          placeholder="List key assumptions for this test plan..."
          value={formState.assumptions}
          onChange={(e) => setField('assumptions', e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          Risks <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          placeholder="Identify potential risks and mitigation strategies..."
          value={formState.risks}
          onChange={(e) => setField('risks', e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
