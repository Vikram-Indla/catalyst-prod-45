/**
 * Test Case Editor Page - Complete Rebuild
 * Industry Standard Reference: TestRail, AIO Tests, Zephyr Scale
 * 
 * Key features:
 * - Full-width content (no wasted space)
 * - All critical fields visible inline
 * - Clean layout optimized for high-volume QA
 * - No quality checklist (removed per user request)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, Save, Loader2, X, Plus, Trash2, GripVertical,
  Sparkles, User, Clock, FolderOpen, AlertCircle, Paperclip, Tag, Link2,
  Cog, RefreshCw, Flame, Route, Zap, Shield, FileEdit, Eye, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '../hooks/useCurrentUser';

// Types
type Status = 'draft' | 'in_review' | 'approved' | 'needs_revision' | 'deprecated';
type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type TestType = 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e' | 'performance' | 'security';

interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  testData?: string;
  expectedResult: string;
}

// Config
const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: '#737373', icon: FileEdit },
  in_review: { label: 'In Review', color: '#2563eb', icon: Eye },
  approved: { label: 'Approved', color: '#059669', icon: CheckCircle },
  needs_revision: { label: 'Needs Revision', color: '#d97706', icon: AlertCircle },
  deprecated: { label: 'Deprecated', color: '#dc2626', icon: XCircle },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; description: string }> = {
  P1: { label: 'P1 - Critical', color: '#dc2626', description: 'Must test first' },
  P2: { label: 'P2 - High', color: '#d97706', description: 'Important functionality' },
  P3: { label: 'P3 - Medium', color: '#eab308', description: 'Normal priority' },
  P4: { label: 'P4 - Low', color: '#737373', description: 'Nice to have' },
};

const TYPE_OPTIONS = [
  { value: 'functional', label: 'Functional', icon: Cog },
  { value: 'regression', label: 'Regression', icon: RefreshCw },
  { value: 'smoke', label: 'Smoke', icon: Flame },
  { value: 'integration', label: 'Integration', icon: Link2 },
  { value: 'e2e', label: 'End-to-End', icon: Route },
  { value: 'performance', label: 'Performance', icon: Zap },
  { value: 'security', label: 'Security', icon: Shield },
];

export function TestCaseEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  
  const { user, loading: userLoading } = useCurrentUser();

  // Form state - Empty by default
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<Status>('draft');
  const [priority, setPriority] = useState<Priority>('P3');
  const [testType, setTestType] = useState<TestType>('functional');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState<{ id: string; text: string }[]>([]);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [folder, setFolder] = useState('Root');
  const [estimate, setEstimate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [references, setReferences] = useState('');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [preconditionsExpanded, setPreconditionsExpanded] = useState(true);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [title, summary, status, priority, testType, description, preconditions, steps, estimate, labels, references]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setTitleTouched(true);
      toast.error('Title is required');
      return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    setHasChanges(false);
    toast.success('Test case saved');
  }, [title]);

  const handleClose = () => navigate(-1);

  const handleAddPrecondition = () => {
    setPreconditions([...preconditions, { id: `pre-${Date.now()}`, text: '' }]);
  };

  const handleAddStep = () => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      stepNumber: steps.length + 1,
      action: '',
      testData: '',
      expectedResult: '',
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (stepId: string, field: keyof TestStep, value: string) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, [field]: value } : s));
  };

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-1)]">
      {/* Header Bar - 48px */}
      <header
        className="flex items-center justify-between px-4 border-b bg-[var(--bg-0)] shrink-0"
        style={{ height: '48px', borderColor: 'var(--stroke-1)' }}
      >
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-3)] transition-colors"
            title="Back (Esc)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Status dropdown */}
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className="w-[140px] h-8 border-gray-200">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_CONFIG[status].color }}
                />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Test Case ID */}
          {isNew ? (
            <Badge className="px-2 py-0.5 text-xs font-semibold bg-[#2563eb] text-white">
              NEW
            </Badge>
          ) : (
            <Badge className="px-2 py-0.5 text-xs font-mono bg-[#dbeafe] text-[#2563eb]">
              TC-{id?.slice(0, 8)}
            </Badge>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Assignee */}
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-[#dbeafe] flex items-center justify-center">
              <span className="text-xs font-medium text-[#2563eb]">
                {user?.initials || <User className="h-3.5 w-3.5" />}
              </span>
            </div>
            <span className="text-[var(--text-2)] max-w-[120px] truncate">
              {userLoading ? '...' : user?.fullName || 'Unassigned'}
            </span>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-8 px-4 text-white gap-2"
            style={{
              backgroundColor: '#059669',
              boxShadow: '0 2px 8px -2px rgba(5, 150, 105, 0.3)',
            }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {hasChanges ? 'Save' : 'Saved'}
          </Button>

          {/* More actions */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-4)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="w-full max-w-6xl py-8 px-8 space-y-8">
          
          {/* TITLE - Hero Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTitleTouched(true)}
              placeholder="Enter test case title..."
              autoFocus
              maxLength={200}
              className={cn(
                "w-full",
                "text-2xl font-semibold",
                "px-4 py-3",
                "bg-white",
                "border-2 rounded-lg",
                "shadow-sm",
                "transition-all duration-150",
                "placeholder:text-gray-400 placeholder:font-normal",
                "focus:outline-none focus:ring-4",
                titleTouched && !title
                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-100"
              )}
              style={{ color: 'var(--text-1)' }}
            />
            <div className="flex justify-between mt-2">
              {titleTouched && !title ? (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Title is required
                </span>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{title.length}/200</span>
            </div>
          </div>

          {/* Metadata Grid - Type, Priority, Folder, Estimate */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <Select value={testType} onValueChange={(v) => setTestType(v as TestType)}>
                <SelectTrigger className="h-10 border-gray-200 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-500" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="h-10 border-gray-200 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="font-medium">{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Folder */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Folder <span className="text-red-500">*</span>
              </label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger className="h-10 border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Root">Root</SelectItem>
                  <SelectItem value="Authentication">Authentication</SelectItem>
                  <SelectItem value="Checkout">Checkout</SelectItem>
                  <SelectItem value="User Management">User Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimate */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Estimate
              </label>
              <Input
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="e.g., 15m, 1h"
                className="h-10 border-gray-200 bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Summary - One line description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief one-line description of what this test validates..."
              maxLength={200}
              className={cn(
                "w-full",
                "text-base",
                "px-4 py-3",
                "bg-white",
                "border border-gray-200 rounded-lg",
                "shadow-sm",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none",
                "hover:border-gray-300",
                "placeholder:text-gray-400",
                "transition-all"
              )}
              style={{ color: 'var(--text-1)' }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-400">{summary.length}/200</span>
            </div>
          </div>

          {/* Objective / Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Objective / Description
            </label>
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this test case. What functionality does it verify? What is the expected behavior?"
                className="border-0 resize-y focus-visible:ring-0 text-sm bg-transparent"
                style={{
                  minHeight: '200px',
                  maxHeight: '400px',
                  padding: '16px',
                  color: 'var(--text-1)',
                  lineHeight: '1.7',
                }}
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                <span>{description.length} characters · {description.split(/\s+/).filter(Boolean).length} words</span>
                <span>Tip: Be specific about expected behavior</span>
              </div>
            </div>
          </div>

          {/* Preconditions */}
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setPreconditionsExpanded(!preconditionsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Preconditions
                </span>
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {preconditions.filter(p => p.text.length > 0).length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddPrecondition();
                }}
              >
                + Add
              </Button>
            </button>
            
            {preconditionsExpanded && (
              <div className="p-4">
                {preconditions.length === 0 ? (
                  <button
                    onClick={handleAddPrecondition}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add precondition
                  </button>
                ) : (
                  <div className="space-y-2">
                    {preconditions.map((pre, i) => (
                      <div key={pre.id} className="flex items-center gap-2 group">
                        <span className="text-xs text-gray-400 w-5 font-medium">{i + 1}.</span>
                        <Input
                          value={pre.text}
                          onChange={(e) => {
                            const next = [...preconditions];
                            next[i] = { ...next[i], text: e.target.value };
                            setPreconditions(next);
                          }}
                          placeholder="e.g., User is logged in as admin"
                          className="flex-1 h-9 border-gray-200"
                        />
                        <button
                          onClick={() => setPreconditions(preconditions.filter((_, idx) => idx !== i))}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Steps */}
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Test Steps <span className="text-red-500">*</span>
                </span>
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {steps.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                onClick={handleAddStep}
              >
                + Add Step
              </Button>
            </div>
            
            <div className="divide-y divide-gray-100">
              {/* Table Header */}
              {steps.length > 0 && (
                <div className="grid grid-cols-[50px_1fr_180px_1fr_60px] gap-2 px-4 py-2 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <span>#</span>
                  <span>Action <span className="text-red-500">*</span></span>
                  <span>Test Data</span>
                  <span>Expected Result <span className="text-red-500">*</span></span>
                  <span></span>
                </div>
              )}

              {/* Step Rows */}
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="grid grid-cols-[50px_1fr_180px_1fr_60px] gap-2 px-4 py-3 group hover:bg-gray-50/50 transition-colors items-start"
                >
                  <div className="flex items-center gap-1 pt-2">
                    <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                    <span className="text-sm font-medium text-gray-500">{idx + 1}</span>
                  </div>
                  <Textarea
                    value={step.action}
                    onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                    placeholder="Describe the action..."
                    className="min-h-[60px] resize-y text-sm border-gray-200"
                  />
                  <Textarea
                    value={step.testData || ''}
                    onChange={(e) => updateStep(step.id, 'testData', e.target.value)}
                    placeholder="Input data..."
                    className="min-h-[60px] resize-y text-sm border-gray-200"
                  />
                  <Textarea
                    value={step.expectedResult}
                    onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                    placeholder="Expected outcome..."
                    className="min-h-[60px] resize-y text-sm border-gray-200"
                  />
                  <div className="flex items-start gap-1 pt-2">
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Step Button */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleAddStep}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Test Step
              </button>
            </div>
          </div>

          {/* Bottom Section - Labels, References, Attachments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Attachments */}
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Attachments
                </span>
              </div>
              <button className="w-full py-2 border border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                + Add files
              </button>
            </div>

            {/* Labels */}
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Labels
                </span>
              </div>
              <Input
                value={labels.join(', ')}
                onChange={(e) => setLabels(e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                placeholder="regression, smoke..."
                className="h-9 border-gray-200 text-sm"
              />
            </div>

            {/* References */}
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  References
                </span>
              </div>
              <Input
                value={references}
                onChange={(e) => setReferences(e.target.value)}
                placeholder="REQ-123, JIRA-456..."
                className="h-9 border-gray-200 text-sm"
              />
            </div>
          </div>

          {/* Footer - Metadata */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>
                Created by: <strong className="text-gray-700">{user?.fullName || 'Unknown'}</strong>
              </span>
              <span>·</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div>
              Last updated: just now
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}

export default TestCaseEditorPage;
