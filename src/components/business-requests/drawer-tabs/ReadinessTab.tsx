import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
    <div className="space-y-4">
      {/* Functional Specification Link */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Functional Specification Link</label>
        <Input
          type="url"
          value={data.functional_spec_link || ''}
          onChange={(e) => onChange('functional_spec_link', e.target.value)}
          disabled={!isEditMode}
          placeholder="https://..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>

      {/* Acceptance Criteria */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Acceptance Criteria {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Textarea
          value={data.acceptance_criteria || ''}
          onChange={(e) => onChange('acceptance_criteria', e.target.value)}
          disabled={!isEditMode}
          placeholder="Define acceptance criteria..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* JIRA Epic Link */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">JIRA Epic Link</label>
        <Input
          type="url"
          value={data.jira_epic_link || ''}
          onChange={(e) => onChange('jira_epic_link', e.target.value)}
          disabled={!isEditMode}
          placeholder="https://jira.example.com/..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>

      {/* Environment Dependency */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Environment Dependency</label>
        <Select
          value={data.environment_dependency || ''}
          onValueChange={(value) => onChange('environment_dependency', value)}
          disabled={!isEditMode}
        >
          <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {ENVIRONMENT_DEPENDENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Readiness Checklist */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-3">Readiness Checklist</label>
        <div className="space-y-3 p-4 border border-[#e5e5e5] rounded-lg bg-[#f9fafb]">
          {CHECKLIST_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-3">
              <Checkbox
                id={key}
                checked={checklist[key]}
                onCheckedChange={(checked) => handleChecklistChange(key, !!checked)}
                disabled={!isEditMode}
                className="border-[#e5e5e5] data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
              />
              <label
                htmlFor={key}
                className={`text-sm ${checklist[key] ? 'text-[#1a1a1a]' : 'text-[#6b7280]'}`}
              >
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
