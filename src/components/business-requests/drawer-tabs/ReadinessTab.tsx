import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { BusinessRequest, ENVIRONMENT_DEPENDENCY_OPTIONS, ReadinessChecklist } from '@/types/business-request';

interface ReadinessTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

const CHECKLIST_ITEMS = [
  { key: 'requirements_documented', label: 'Requirements documented' },
  { key: 'technical_design_approved', label: 'Technical design approved' },
  { key: 'resources_allocated', label: 'Resources allocated' },
  { key: 'environment_ready', label: 'Environment ready' },
  { key: 'test_cases_prepared', label: 'Test cases prepared' },
] as const;

export function ReadinessTab({ data, isEditMode, onChange }: ReadinessTabProps) {
  const checklist: ReadinessChecklist = data.readiness_checklist || {
    requirements_documented: false,
    technical_design_approved: false,
    resources_allocated: false,
    environment_ready: false,
    test_cases_prepared: false,
  };

  const handleChecklistChange = (key: keyof ReadinessChecklist, checked: boolean) => {
    onChange('readiness_checklist', { ...checklist, [key]: checked });
  };

  return (
    <div className="space-y-6 p-5">
      {/* Documentation Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Documentation</h3>
          
          <div>
            <Label className="text-sm font-medium">Functional Specification Link</Label>
            <Input
              type="url"
              value={data.functional_spec_link || ''}
              onChange={(e) => onChange('functional_spec_link', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label className="text-sm font-medium">JIRA Epic Link</Label>
            <Input
              type="url"
              value={data.jira_epic_link || ''}
              onChange={(e) => onChange('jira_epic_link', e.target.value)}
              placeholder="https://jira.example.com/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Criteria Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Acceptance Criteria</h3>
          
          <div>
            <Textarea
              value={data.acceptance_criteria || ''}
              onChange={(e) => onChange('acceptance_criteria', e.target.value)}
              placeholder="Define acceptance criteria..."
              className="min-h-[120px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Environment Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Environment</h3>
          
          <div>
            <Label className="text-sm font-medium">Environment Dependency</Label>
            <Select
              value={data.environment_dependency || ''}
              onValueChange={(value) => onChange('environment_dependency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENT_DEPENDENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Checklist Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Readiness Checklist</h3>
          
          <div className="space-y-3">
            {CHECKLIST_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-3 py-1">
                <Checkbox
                  id={key}
                  checked={checklist[key]}
                  onCheckedChange={(checked) => handleChecklistChange(key, !!checked)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label
                  htmlFor={key}
                  className={`text-sm cursor-pointer ${checklist[key] ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
