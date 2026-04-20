/**
 * Additional Tab Component
 * Tab 5: Tags, Linked Items, Automation settings
 */

import { useState, useCallback, KeyboardEvent } from 'react';
import { X, Plus, Link2, Bot, Clock, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TestCaseFormData, ReviewStatus } from './types';

interface AdditionalTabProps {
  data: TestCaseFormData;
  onChange: (updates: Partial<TestCaseFormData>) => void;
}

const TAG_SUGGESTIONS = [
  { tag: 'critical', count: 24 },
  { tag: 'api', count: 156 },
  { tag: 'ui', count: 89 },
  { tag: 'performance', count: 34 },
  { tag: 'smoke', count: 45 },
  { tag: 'regression', count: 123 },
  { tag: 'auth', count: 67 },
];

export function AdditionalTab({ data, onChange }: AdditionalTabProps) {
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

  const filteredSuggestions = TAG_SUGGESTIONS.filter(
    (s) =>
      s.tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !data.tags.includes(s.tag)
  );

  const handleAddTag = useCallback((tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag) return;
    if (data.tags.includes(normalizedTag)) {
      toast.error('Tag already exists');
      return;
    }
    if (data.tags.length >= 10) {
      toast.error('Maximum 10 tags allowed');
      return;
    }
    onChange({ tags: [...data.tags, normalizedTag] });
    setTagInput('');
    setShowSuggestions(false);
  }, [data.tags, onChange]);

  const handleRemoveTag = useCallback((tag: string) => {
    onChange({ tags: data.tags.filter((t) => t !== tag) });
  }, [data.tags, onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && data.tags.length > 0) {
      handleRemoveTag(data.tags[data.tags.length - 1]);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Section: Tags & Labels */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Tags & Labels
        </h3>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Tags</Label>
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 p-2 border rounded-lg min-h-[42px] transition-all",
              showSuggestions && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {data.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1">
                <Lozenge appearance="default">{tag}</Lozenge>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-destructive/20 rounded-full p-0.5"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <Input
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder={data.tags.length === 0 ? "Type to add tags..." : ""}
              className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 h-7 px-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to add, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Backspace</kbd> to remove
          </p>

          {/* Tag Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="border rounded-lg shadow-lg bg-popover p-1 mt-1">
              {filteredSuggestions.slice(0, 5).map((suggestion) => (
                <button
                  key={suggestion.tag}
                  type="button"
                  onClick={() => handleAddTag(suggestion.tag)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                >
                  <span>{suggestion.tag}</span>
                  <span className="text-xs text-muted-foreground">{suggestion.count} tests</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section: Linked Items */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Linked Items
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Feature */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Feature</Label>
            <Select
              value={data.featureId || ''}
              onValueChange={(value) => onChange({ featureId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select feature..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feat-001">FEAT-001: User Authentication</SelectItem>
                <SelectItem value="feat-002">FEAT-002: Payment Processing</SelectItem>
                <SelectItem value="feat-003">FEAT-003: Dashboard Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Story */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Story</Label>
            <Select
              value={data.storyId || ''}
              onValueChange={(value) => onChange({ storyId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select story..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="story-001">STORY-001: Login page redesign</SelectItem>
                <SelectItem value="story-002">STORY-002: Add SSO support</SelectItem>
                <SelectItem value="story-003">STORY-003: Password recovery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Release */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Release</Label>
            <Select
              value={data.releaseId || ''}
              onValueChange={(value) => onChange({ releaseId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select release..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rel-001">REL-26.01.01 - Investment Portal Q1</SelectItem>
                <SelectItem value="rel-002">REL-26.01.02 - Licensing Module v2</SelectItem>
                <SelectItem value="rel-003">REL-25.12.01 - Security Patch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Component */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Component</Label>
            <Select
              value={data.componentId || ''}
              onValueChange={(value) => onChange({ componentId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select component..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comp-auth">Authentication</SelectItem>
                <SelectItem value="comp-api">API Gateway</SelectItem>
                <SelectItem value="comp-ui">Frontend UI</SelectItem>
                <SelectItem value="comp-db">Database</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section: Automation & Execution */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Automation & Execution
        </h3>

        {/* Automated Checkbox */}
        <div className="flex items-start gap-3 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <Checkbox
            id="isAutomated"
            checked={data.isAutomated}
            onCheckedChange={(checked) => onChange({ isAutomated: !!checked })}
          />
          <div>
            <Label htmlFor="isAutomated" className="font-medium cursor-pointer">
              Mark as automated test
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              This test case has automated scripts associated with it
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Estimated Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Estimated Time
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={data.estimatedTime || ''}
                onChange={(e) => onChange({ estimatedTime: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {/* Automation ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              Automation ID
            </Label>
            <Input
              value={data.automationId || ''}
              onChange={(e) => onChange({ automationId: e.target.value })}
              placeholder="@TC-248"
              className="font-mono"
            />
          </div>

          {/* Review Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Review Status</Label>
            <Select
              value={data.reviewStatus}
              onValueChange={(value) => onChange({ reviewStatus: value as ReviewStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section: Custom Fields (Collapsible) */}
      <Collapsible open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between py-2 h-auto">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Custom Fields
            </span>
            {customFieldsOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Business Unit</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bu-1">Digital Services</SelectItem>
                  <SelectItem value="bu-2">Core Banking</SelectItem>
                  <SelectItem value="bu-3">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Compliance Tag</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gdpr">GDPR</SelectItem>
                  <SelectItem value="sox">SOX</SelectItem>
                  <SelectItem value="pci">PCI-DSS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
