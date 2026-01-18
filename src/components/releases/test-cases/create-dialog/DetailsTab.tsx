/**
 * Details Tab Component
 * Tab 1: Basic Information & Test Conditions
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TestCaseFormData, PRIORITY_CONFIG, TYPE_OPTIONS, PriorityLevel, TestCaseType } from './types';

interface DetailsTabProps {
  data: TestCaseFormData;
  onChange: (updates: Partial<TestCaseFormData>) => void;
  errors: Record<string, string>;
}

export function DetailsTab({ data, onChange, errors }: DetailsTabProps) {
  const titleLength = data.title.length;
  const descriptionLength = data.description.length;

  const getTitleCounterColor = () => {
    if (titleLength > 180) return 'text-destructive';
    if (titleLength > 140) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getDescriptionCounterColor = () => {
    if (descriptionLength > 1800) return 'text-destructive';
    if (descriptionLength > 1400) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6 py-4">
      {/* Section: Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Basic Information
        </h3>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <span className={cn("text-xs", getTitleCounterColor())}>
              {titleLength}/200
            </span>
          </div>
          <Input
            id="title"
            placeholder="e.g., Verify user login with valid credentials"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={cn(
              "transition-all",
              errors.title && "border-destructive bg-destructive/5",
              data.title && !errors.title && "border-teal-500"
            )}
            maxLength={200}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Description (Rich Text - simplified for now) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <span className={cn("text-xs", getDescriptionCounterColor())}>
              {descriptionLength}/2000
            </span>
          </div>
          <Textarea
            id="description"
            placeholder="Describe what this test case validates..."
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className={cn(
              "min-h-[100px] resize-none transition-all",
              data.description && "border-teal-500"
            )}
            maxLength={2000}
          />
        </div>

        {/* Type & Priority Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.type}
              onValueChange={(value) => onChange({ type: value as TestCaseType })}
            >
              <SelectTrigger className={cn(data.type && "border-teal-500")}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type}</p>
            )}
          </div>

          {/* Priority - Custom Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Priority <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.priority}
              onValueChange={(value) => onChange({ priority: value as PriorityLevel })}
            >
              <SelectTrigger className={cn(data.priority && "border-teal-500")}>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: config.color }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {config.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-xs text-destructive">{errors.priority}</p>
            )}
          </div>
        </div>

        {/* Folder & Assignee Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Folder */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Folder <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.folderId}
              onValueChange={(value) => onChange({ folderId: value })}
            >
              <SelectTrigger className={cn(
                data.folderId && "border-teal-500",
                errors.folderId && "border-destructive"
              )}>
                <SelectValue placeholder="Select folder..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="api-tests">API Tests</SelectItem>
                <SelectItem value="user-management">User Management</SelectItem>
                <SelectItem value="core-features">Core Features</SelectItem>
              </SelectContent>
            </Select>
            {errors.folderId && (
              <p className="text-xs text-destructive">{errors.folderId}</p>
            )}
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assignee</Label>
            <Select
              value={data.assigneeId || ''}
              onValueChange={(value) => onChange({ assigneeId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user-vs">Vikram Singh</SelectItem>
                <SelectItem value="user-aa">Ahmed Al-Rashid</SelectItem>
                <SelectItem value="user-sk">Sara Khan</SelectItem>
                <SelectItem value="user-mr">Mohammed Rahman</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section: Test Conditions */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Test Conditions (Optional)
        </h3>

        {/* Preconditions */}
        <div className="space-y-2">
          <Label htmlFor="preconditions" className="text-sm font-medium">
            Preconditions
          </Label>
          <Textarea
            id="preconditions"
            placeholder="What must be true before executing this test..."
            value={data.preconditions || ''}
            onChange={(e) => onChange({ preconditions: e.target.value })}
            className="min-h-[80px] resize-none"
          />
        </div>

        {/* Postconditions */}
        <div className="space-y-2">
          <Label htmlFor="postconditions" className="text-sm font-medium">
            Postconditions
          </Label>
          <Textarea
            id="postconditions"
            placeholder="Expected system state after test..."
            value={data.postconditions || ''}
            onChange={(e) => onChange({ postconditions: e.target.value })}
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>
    </div>
  );
}
