/**
 * TemplateTestSelector Component
 * Test selection criteria builder with live preview
 * Catalyst V5 Design System
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge } from '@/components/ads';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TestTube, Clock, Tag, X } from 'lucide-react';
import { useTemplatePreview, useFilterOptions } from '@/hooks/templates';
import type { TestCriteria } from '@/types/template.types';

interface TemplateTestSelectorProps {
  projectId: string;
  criteria: TestCriteria;
  onChange: (criteria: TestCriteria) => void;
}

export function TemplateTestSelector({
  projectId,
  criteria,
  onChange,
}: TemplateTestSelectorProps) {
  const { data: preview, isLoading: previewLoading } = useTemplatePreview(projectId, criteria);
  const { data: options, isLoading: optionsLoading } = useFilterOptions(projectId);
  
  const [tagInput, setTagInput] = React.useState('');
  
  const toggleModule = (module: string) => {
    const current = criteria.modules || [];
    const updated = current.includes(module)
      ? current.filter(m => m !== module)
      : [...current, module];
    onChange({ ...criteria, modules: updated });
  };
  
  const toggleType = (type: string) => {
    const current = criteria.types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onChange({ ...criteria, types: updated });
  };
  
  const togglePriority = (priority: string) => {
    const current = criteria.priorities || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onChange({ ...criteria, priorities: updated });
  };
  
  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const current = criteria.tags || [];
    if (!current.includes(tag)) {
      onChange({ ...criteria, tags: [...current, tag] });
    }
    setTagInput('');
  };
  
  const removeTag = (tag: string) => {
    const current = criteria.tags || [];
    onChange({ ...criteria, tags: current.filter(t => t !== tag) });
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Filter Controls */}
      <div className="space-y-6">
        {/* Modules */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">Modules</Label>
          {optionsLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options?.modules.map(module => (
                <button
                  key={module}
                  onClick={() => toggleModule(module)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${criteria.modules?.includes(module)
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }
                  `}
                >
                  {module}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Test Types */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">Test Types</Label>
          <div className="grid grid-cols-2 gap-2">
            {['functional', 'integration', 'e2e', 'performance', 'security'].map(type => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={criteria.types?.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                />
                <label
                  htmlFor={`type-${type}`}
                  className="text-sm text-slate-700 capitalize cursor-pointer"
                >
                  {type.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Priorities */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">Priorities</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'critical', color: '#ef4444', bg: '#fee2e2' },
              { value: 'high', color: '#d97706', bg: '#fef3c7' },
              { value: 'medium', color: '#2563eb', bg: '#dbeafe' },
              { value: 'low', color: '#475569', bg: '#f1f5f9' },
            ].map(priority => (
              <div key={priority.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority.value}`}
                  checked={criteria.priorities?.includes(priority.value)}
                  onCheckedChange={() => togglePriority(priority.value)}
                />
                <label
                  htmlFor={`priority-${priority.value}`}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: priority.color }}
                  />
                  <span className="capitalize">{priority.value}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tags */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">Tags</Label>
          <div className="flex items-center gap-2 mb-2">
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              className="flex-1"
            />
          </div>
          {(criteria.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {criteria.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1">
                  <Lozenge appearance="default">{tag}</Lozenge>
                  <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {options?.tags && (
            <div className="mt-2">
              <span className="text-xs text-slate-500">Suggestions: </span>
              {options.tags
                .filter(t => !criteria.tags?.includes(t))
                .slice(0, 5)
                .map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="text-xs text-[#2563eb] hover:underline mr-2"
                  >
                    {tag}
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>
      
      {/* Right Panel - Preview */}
      <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
        <h3 className="font-medium text-slate-900 mb-4">Preview</h3>
        
        {previewLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : preview ? (
          <>
            {/* Total count */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-[#ccfbf1] flex items-center justify-center">
                <TestTube className="w-6 h-6 text-[#0d9488]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0d9488]">{preview.totalTests}</div>
                <div className="text-sm text-slate-500">tests match criteria</div>
              </div>
            </div>
            
            {/* Priority breakdown */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-700 mb-2">By Priority</h4>
              <div className="space-y-2">
                {[
                  { label: 'Critical', count: preview.criticalCount, color: '#ef4444', bg: '#fee2e2' },
                  { label: 'High', count: preview.highCount, color: '#d97706', bg: '#fef3c7' },
                  { label: 'Medium', count: preview.mediumCount, color: '#2563eb', bg: '#dbeafe' },
                  { label: 'Low', count: preview.lowCount, color: '#475569', bg: '#f1f5f9' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${preview.totalTests > 0 ? (item.count / preview.totalTests) * 100 : 0}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 w-24">
                      {item.label}: {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Duration estimate */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Est. duration: {formatDuration(preview.totalDurationMinutes)}</span>
            </div>
            
            {/* Modules */}
            {preview.modules.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-500 mb-2">Modules included</h4>
                <div className="flex flex-wrap gap-1">
                  {preview.modules.map(module => (
                    <Lozenge key={module} appearance="default">
                      {module}
                    </Lozenge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-500 py-8">
            Select criteria to see matching tests
          </div>
        )}
      </div>
    </div>
  );
}
