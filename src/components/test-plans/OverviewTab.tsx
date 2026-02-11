import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestPlan } from '@/types/testPlans';

interface Props { plan: TestPlan; onUpdate: (updates: Partial<TestPlan>) => void; }

export function OverviewTab({ plan, onUpdate }: Props) {
  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input value={plan.name} onChange={e => onUpdate({ name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={plan.description || ''} onChange={e => onUpdate({ description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Objectives</Label>
            <Textarea value={plan.objectives || ''} onChange={e => onUpdate({ objectives: e.target.value })} placeholder="What are the goals of this test plan?" rows={4} />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Entry Criteria</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={plan.entry_criteria || ''} onChange={e => onUpdate({ entry_criteria: e.target.value })} placeholder="Conditions before testing starts..." rows={5} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Exit Criteria</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={plan.exit_criteria || ''} onChange={e => onUpdate({ exit_criteria: e.target.value })} placeholder="Conditions for testing to be complete..." rows={5} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Risks & Assumptions</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={plan.risks_assumptions || ''} onChange={e => onUpdate({ risks_assumptions: e.target.value })} placeholder="Known risks and assumptions..." rows={4} />
        </CardContent>
      </Card>
    </div>
  );
}
