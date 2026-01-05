/**
 * Test Case Editor - Full-Page Editor Component
 * Matches test-case-editor-final.html visual reference (9.5+ quality)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Save,
  Copy,
  X,
  GripVertical,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Link2,
  Image,
  Paperclip,
  AtSign,
  Hash,
  Eye,
  Maximize2,
  Sparkles,
  Clock,
  User,
  Folder,
  FileText,
  Bug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  Settings,
  ExternalLink,
  Folder as FolderIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TestCase, TestStep, Folder as FolderType, CaseStatus } from '../../api/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StepInput {
  id: string;
  step_number: number;
  action: string;
  test_data: string;
  expected_result: string;
  attachments?: { name: string; type: string }[];
}

interface PreconditionInput {
  id: string;
  text: string;
  details?: string;
}

interface TestCaseEditorProps {
  testCase?: TestCase | null;
  steps?: TestStep[];
  folders: FolderType[];
  priorities: { id: string; name: string; color: string }[];
  caseTypes: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  onSave: (data: any, steps: any[]) => void;
  onClose: () => void;
  isSubmitting?: boolean;
  projectId: string;
  defaultFolderId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function generateId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const STATUS_OPTIONS: { value: CaseStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'warning' },
  { value: 'ready', label: 'Ready', color: 'info' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'needs_update', label: 'Needs Update', color: 'warning' },
  { value: 'deprecated', label: 'Deprecated', color: 'muted' },
];

// Quality Ring component
function QualityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 12;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-7 h-7">
      <svg width="28" height="28" viewBox="0 0 32 32" className="-rotate-90">
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="hsl(var(--border-subtle))"
          strokeWidth="3"
        />
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-success">
        {score}
      </span>
    </div>
  );
}

// Execution mini dots
function ExecutionHistory({ results }: { results: ('pass' | 'fail')[] }) {
  const passCount = results.filter(r => r === 'pass').length;
  const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;
  
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg">
      <div className="flex gap-0.5">
        {results.map((result, i) => (
          <span
            key={i}
            className={cn(
              'w-2 h-2 rounded-sm',
              result === 'pass' ? 'bg-success' : 'bg-destructive'
            )}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">
        <strong className="text-foreground">{passRate}%</strong> pass
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TestCaseEditor({
  testCase,
  steps: initialSteps = [],
  folders,
  priorities,
  caseTypes,
  labels,
  onSave,
  onClose,
  isSubmitting,
  projectId,
  defaultFolderId,
}: TestCaseEditorProps) {
  const navigate = useNavigate();
  const isEditing = !!testCase;

  // Form state
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [preconditions, setPreconditions] = useState<PreconditionInput[]>([]);
  const [status, setStatus] = useState<CaseStatus>('draft');
  const [priorityId, setPriorityId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [stepsList, setStepsList] = useState<StepInput[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeContextTab, setActiveContextTab] = useState<'traceability' | 'properties' | 'ai' | 'history'>('traceability');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Mock data for demo
  const qualityScore = 85;
  const executionHistory: ('pass' | 'fail')[] = ['pass', 'pass', 'pass', 'fail', 'pass', 'pass'];
  const collaborators = [
    { id: '1', name: 'Ahmed Khan', initials: 'AK', color: 'bg-primary', isOnline: true },
    { id: '2', name: 'Sara Al-Ahmad', initials: 'SA', color: 'bg-success', isOnline: false },
  ];

  // Initialize form
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setObjective(testCase.description || '');
      setPreconditions(
        testCase.preconditions
          ? [{ id: generateId(), text: testCase.preconditions, details: '' }]
          : []
      );
      setStatus(testCase.status);
      setPriorityId(testCase.priority_id || '');
      setTypeId(testCase.type_id || '');
      setFolderId(testCase.folder_id || '');
      setSelectedLabels(testCase.labels?.map(l => l.id) || []);
      setEstimatedTime(testCase.estimated_time_minutes?.toString() || '');
      setStepsList(
        initialSteps.map(s => ({
          id: s.id,
          step_number: s.step_number,
          action: s.action,
          test_data: s.test_data || '',
          expected_result: s.expected_result,
          attachments: [],
        }))
      );
    } else {
      setTitle('');
      setObjective('');
      setPreconditions([]);
      setStatus('draft');
      setPriorityId('');
      setTypeId('');
      setFolderId(defaultFolderId || '');
      setSelectedLabels([]);
      setEstimatedTime('');
      setStepsList([]);
    }
    setIsDirty(false);
  }, [testCase, initialSteps, defaultFolderId]);

  // Handlers
  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleAddPrecondition = useCallback(() => {
    setPreconditions(prev => [...prev, { id: generateId(), text: '', details: '' }]);
    markDirty();
  }, [markDirty]);

  const handleUpdatePrecondition = useCallback((id: string, field: 'text' | 'details', value: string) => {
    setPreconditions(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
    markDirty();
  }, [markDirty]);

  const handleDeletePrecondition = useCallback((id: string) => {
    setPreconditions(prev => prev.filter(p => p.id !== id));
    markDirty();
  }, [markDirty]);

  const handleAddStep = useCallback(() => {
    const newStep: StepInput = {
      id: generateId(),
      step_number: stepsList.length + 1,
      action: '',
      test_data: '',
      expected_result: '',
      attachments: [],
    };
    setStepsList(prev => [...prev, newStep]);
    setExpandedSteps(prev => new Set([...prev, newStep.id]));
    markDirty();
  }, [stepsList.length, markDirty]);

  const handleUpdateStep = useCallback((id: string, field: keyof StepInput, value: string) => {
    setStepsList(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
    markDirty();
  }, [markDirty]);

  const handleDeleteStep = useCallback((id: string) => {
    setStepsList(prev => {
      const updated = prev.filter(s => s.id !== id);
      updated.forEach((s, i) => (s.step_number = i + 1));
      return updated;
    });
    markDirty();
  }, [markDirty]);

  const toggleStepExpand = useCallback((id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const caseData = {
      project_id: projectId,
      title: title.trim(),
      description: objective.trim() || undefined,
      preconditions: preconditions.map(p => p.text).join('\n') || undefined,
      status,
      priority_id: priorityId || undefined,
      type_id: typeId || undefined,
      folder_id: folderId || undefined,
      estimated_time_minutes: estimatedTime ? parseInt(estimatedTime, 10) : undefined,
      tags: selectedLabels.length > 0 ? selectedLabels : undefined,
    };

    const stepsData = stepsList
      .filter(s => s.action.trim())
      .map(s => ({
        step_number: s.step_number,
        action: s.action.trim(),
        test_data: s.test_data.trim() || undefined,
        expected_result: s.expected_result.trim(),
      }));

    onSave(caseData, stepsData);
    setLastSaved(new Date());
    setIsDirty(false);
  }, [
    projectId, title, objective, preconditions, status, priorityId,
    typeId, folderId, estimatedTime, selectedLabels, stepsList, onSave,
  ]);

  const currentPriority = priorities.find(p => p.id === priorityId);
  const currentType = caseTypes.find(t => t.id === typeId);
  const currentFolder = folders.find(f => f.id === folderId);
  const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="flex flex-col h-screen bg-surface-1">
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-b from-surface-0 to-surface-2 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Case ID & Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
            <span className="font-mono text-[13px] font-bold text-primary">
              {testCase?.case_key || 'NEW'}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5',
                statusConfig.color === 'warning' && 'bg-warning/10 text-warning border-warning/20',
                statusConfig.color === 'success' && 'bg-success/10 text-success border-success/20',
                statusConfig.color === 'info' && 'bg-primary/10 text-primary border-primary/20',
                statusConfig.color === 'muted' && 'bg-muted text-muted-foreground border-border',
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="cursor-pointer hover:text-primary transition-colors">
              {currentFolder?.name || 'Root'}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Quality Score */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg cursor-default">
                <QualityRing score={qualityScore} />
                <span className="text-xs text-muted-foreground">
                  <strong className="text-success">{qualityScore}</strong> Quality
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Quality score based on completeness</TooltipContent>
          </Tooltip>

          {/* Execution History */}
          <ExecutionHistory results={executionHistory} />
        </div>

        <div className="flex items-center gap-3">
          {/* Collaborators */}
          <div className="flex items-center -space-x-2">
            {collaborators.map((collab) => (
              <Tooltip key={collab.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white border-2 border-surface-0 cursor-pointer hover:-translate-y-0.5 transition-transform',
                      collab.color
                    )}
                  >
                    {collab.initials}
                    {collab.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-surface-0 rounded-full" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{collab.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Copy className="h-3.5 w-3.5" />
            Clone
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-b from-primary to-primary/90 shadow-sm"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            <Save className="h-3.5 w-3.5" />
            {isSubmitting ? 'Saving...' : 'Save'}
            <kbd className="ml-1.5 px-1.5 py-0.5 bg-white/15 rounded text-[10px]">⌘S</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <main className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-2 bg-surface-0 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-0.5">
              <ToolbarButton icon={Bold} />
              <ToolbarButton icon={Italic} />
              <ToolbarButton icon={Underline} />
              <ToolbarSeparator />
              <ToolbarButton icon={List} />
              <ToolbarButton icon={ListOrdered} />
              <ToolbarButton icon={CheckSquare} />
              <ToolbarSeparator />
              <ToolbarButton icon={Code} />
              <ToolbarButton icon={Link2} />
              <ToolbarButton icon={Image} />
              <ToolbarButton icon={Paperclip} />
              <ToolbarSeparator />
              <ToolbarButton icon={AtSign} />
              <ToolbarButton icon={Hash} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-gradient-to-br from-primary/5 to-violet-500/5 border-primary/20 text-primary hover:bg-primary/10"
              >
                <span className="flex items-center justify-center w-4 h-4 bg-gradient-to-br from-primary to-violet-500 rounded text-white">
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
                AI Enhance
              </Button>
              <ToolbarSeparator />
              <ToolbarButton icon={Eye} />
              <ToolbarButton icon={Maximize2} />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="max-w-[880px] mx-auto px-8 py-6">
              {/* Title */}
              <div className="mb-6">
                <Input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                  placeholder="Enter test case title..."
                  className="w-full text-2xl font-bold bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/50"
                />
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Ahmed Khan
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created 2 hours ago
                  </span>
                  <span className="flex items-center gap-1">
                    v1
                  </span>
                </div>
              </div>

              {/* Objective Section */}
              <EditorSection
                title="Objective"
                count={objective.trim() ? 1 : 0}
                actions={
                  <button className="text-[11px] font-medium text-primary hover:text-primary/80">
                    Format
                  </button>
                }
              >
                <Textarea
                  value={objective}
                  onChange={(e) => { setObjective(e.target.value); markDirty(); }}
                  placeholder="What is being tested and why is it important?"
                  className="min-h-[140px] resize-none border-border-subtle focus:border-primary/30"
                />
              </EditorSection>

              {/* Preconditions Section */}
              <EditorSection
                title="Preconditions"
                count={preconditions.length}
                actions={
                  <button
                    className="text-[11px] font-medium text-primary hover:text-primary/80"
                    onClick={handleAddPrecondition}
                  >
                    + Add
                  </button>
                }
              >
                <div className="space-y-2.5">
                  {preconditions.map((pc, index) => (
                    <div
                      key={pc.id}
                      className="flex items-start gap-3 p-3 bg-surface-2 border border-border-subtle rounded-lg hover:bg-surface-0 hover:border-border-default transition-all group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-primary to-primary/80 text-white rounded-full text-[11px] font-bold shadow-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={pc.text}
                          onChange={(e) => handleUpdatePrecondition(pc.id, 'text', e.target.value)}
                          placeholder="Precondition..."
                          className="h-8 text-[13px] bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
                        />
                        {pc.details && (
                          <p className="text-[11px] text-muted-foreground">
                            {pc.details}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeletePrecondition(pc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {preconditions.length === 0 && (
                    <button
                      className="w-full py-4 text-[13px] text-muted-foreground border-2 border-dashed border-border-subtle rounded-lg hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                      onClick={handleAddPrecondition}
                    >
                      <Plus className="h-4 w-4 inline mr-2" />
                      Add precondition
                    </button>
                  )}
                </div>
              </EditorSection>

              {/* Test Steps Section */}
              <EditorSection
                title="Test Steps"
                count={stepsList.length}
                actions={
                  <>
                    <button className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      Reorder
                    </button>
                    <button
                      className="text-[11px] font-medium text-primary hover:text-primary/80"
                      onClick={handleAddStep}
                    >
                      + Add Step
                    </button>
                  </>
                }
              >
                <div className="space-y-3">
                  {stepsList.map((step, index) => {
                    const isExpanded = expandedSteps.has(step.id);
                    return (
                      <div
                        key={step.id}
                        className={cn(
                          'bg-surface-0 border rounded-lg overflow-hidden transition-all',
                          isExpanded
                            ? 'border-primary/30 shadow-md ring-2 ring-primary/10'
                            : 'border-border-subtle hover:border-border-default hover:shadow-sm'
                        )}
                      >
                        {/* Step Header */}
                        <div
                          className={cn(
                            'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors',
                            !isExpanded && 'hover:bg-surface-2'
                          )}
                          onClick={() => toggleStepExpand(step.id)}
                        >
                          <GripVertical className="h-4 w-4 text-border-strong cursor-grab hover:text-muted-foreground" />
                          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-primary/80 text-white rounded-full text-[13px] font-bold shadow-sm">
                            {step.step_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">
                              {step.action || 'New Step'}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                              <span className="truncate">{step.action.substring(0, 30) || 'Define action...'}</span>
                              <span className="text-border-strong">→</span>
                              <span className="truncate">{step.expected_result.substring(0, 30) || 'Expected result...'}</span>
                            </p>
                          </div>
                          {step.attachments && step.attachments.length > 0 && (
                            <Badge variant="secondary" className="bg-success/10 text-success text-[10px]">
                              {step.attachments.length} files
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Step Body (Expanded) */}
                        {isExpanded && (
                          <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="h-px bg-border-subtle mb-4" />
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Action <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                  value={step.action}
                                  onChange={(e) => handleUpdateStep(step.id, 'action', e.target.value)}
                                  placeholder="What action should be performed?"
                                  rows={3}
                                  className="text-[13px] resize-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Expected Result <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                  value={step.expected_result}
                                  onChange={(e) => handleUpdateStep(step.id, 'expected_result', e.target.value)}
                                  placeholder="What is the expected outcome?"
                                  rows={3}
                                  className="text-[13px] resize-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5 mb-4">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Test Data
                              </label>
                              <Textarea
                                value={step.test_data}
                                onChange={(e) => handleUpdateStep(step.id, 'test_data', e.target.value)}
                                placeholder="Sample data, variables, or inputs needed..."
                                rows={2}
                                className="text-[13px] resize-none"
                              />
                            </div>
                            {/* Attachments */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              <button className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-muted-foreground border border-dashed border-border-subtle rounded-md hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all">
                                <Paperclip className="h-3 w-3" />
                                Add file
                              </button>
                            </div>
                            {/* Step Footer */}
                            <div className="flex items-center justify-between pt-3.5 border-t border-border-subtle">
                              <span className="text-[11px] text-muted-foreground">
                                Created by Ahmed Khan
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Step Button */}
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium text-muted-foreground bg-surface-0 border-2 border-dashed border-border-subtle rounded-lg hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                    onClick={handleAddStep}
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </div>
              </EditorSection>
            </div>
          </ScrollArea>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* CONTEXT PANEL */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div className="w-[360px] shrink-0 bg-surface-0 border-l border-border-subtle flex flex-col">
          <Tabs
            value={activeContextTab}
            onValueChange={(v) => setActiveContextTab(v as typeof activeContextTab)}
            className="flex flex-col h-full"
          >
            <TabsList className="w-full h-auto p-0 bg-surface-2 border-b border-border-subtle rounded-none">
              <TabsTrigger
                value="traceability"
                className="flex-1 py-3 rounded-none data-[state=active]:bg-surface-0 data-[state=active]:shadow-none relative"
              >
                Traceability
              </TabsTrigger>
              <TabsTrigger
                value="properties"
                className="flex-1 py-3 rounded-none data-[state=active]:bg-surface-0 data-[state=active]:shadow-none"
              >
                Properties
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="flex-1 py-3 rounded-none data-[state=active]:bg-surface-0 data-[state=active]:shadow-none"
              >
                AI
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-1 py-3 rounded-none data-[state=active]:bg-surface-0 data-[state=active]:shadow-none"
              >
                History
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-[16px] px-1 text-[9px]">2</Badge>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              <TabsContent value="traceability" className="mt-0 space-y-5">
                <ContextSection title="Hierarchy">
                  <HierarchyTree />
                </ContextSection>
                <ContextSection title="Requirements Coverage" action="+ Link">
                  <CoverageList />
                </ContextSection>
                <ContextSection title="Linked Items" action="+ Link">
                  <LinkedItemsList />
                </ContextSection>
              </TabsContent>

              <TabsContent value="properties" className="mt-0 space-y-5">
                <PropertiesPanel
                  status={status}
                  setStatus={setStatus}
                  priorityId={priorityId}
                  setPriorityId={setPriorityId}
                  typeId={typeId}
                  setTypeId={setTypeId}
                  folderId={folderId}
                  setFolderId={setFolderId}
                  estimatedTime={estimatedTime}
                  setEstimatedTime={setEstimatedTime}
                  selectedLabels={selectedLabels}
                  setSelectedLabels={setSelectedLabels}
                  priorities={priorities}
                  caseTypes={caseTypes}
                  folders={folders}
                  labels={labels}
                  markDirty={markDirty}
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-0 space-y-5">
                <AIPanel />
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-5">
                <HistoryPanel />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="flex items-center justify-between px-5 py-2 bg-surface-0 border-t border-border-subtle shrink-0">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', isDirty ? 'bg-warning' : 'bg-success')} />
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          {lastSaved && (
            <span>Last saved {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>{stepsList.length} steps</span>
          <span>{preconditions.length} preconditions</span>
          {estimatedTime && <span>~{estimatedTime} min</span>}
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ToolbarButton({ icon: Icon, active }: { icon: React.ElementType; active?: boolean }) {
  return (
    <button
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors',
        active && 'bg-primary/10 text-primary'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-4 bg-border-subtle mx-1.5" />;
}

function EditorSection({
  title,
  count,
  actions,
  children,
}: {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-0 rounded-xl border border-border-subtle shadow-sm mb-5 overflow-hidden hover:shadow-md transition-shadow focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/10">
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-b from-surface-2 to-surface-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="bg-success/10 text-success text-[10px] font-bold px-1.5 py-0">
              {count}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function ContextSection({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action && (
          <button className="text-[11px] font-medium text-primary hover:text-primary/80">
            {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function HierarchyTree() {
  return (
    <div className="relative pl-3.5">
      <div className="absolute left-1 top-4 bottom-4 w-0.5 bg-border-subtle" />
      
      <HierarchyItem
        type="epic"
        itemKey="EP-003"
        title="Authentication System"
        status="Active"
        dotColor="bg-violet-500"
        iconBg="bg-violet-100 text-violet-600"
      />
      <HierarchyItem
        type="feature"
        itemKey="FT-012"
        title="User Login Flow"
        status="In Progress"
        dotColor="bg-primary"
        iconBg="bg-primary/10 text-primary"
      />
      <HierarchyItem
        type="testcase"
        itemKey="TC-027"
        title="Login with valid credentials"
        status="Current"
        dotColor="bg-success"
        iconBg="bg-success/10 text-success"
        isCurrent
      />
    </div>
  );
}

function HierarchyItem({
  type,
  itemKey,
  title,
  status,
  dotColor,
  iconBg,
  isCurrent,
}: {
  type: string;
  itemKey: string;
  title: string;
  status: string;
  dotColor: string;
  iconBg: string;
  isCurrent?: boolean;
}) {
  const Icon = type === 'epic' ? Folder : type === 'feature' ? FileText : CheckSquare;
  
  return (
    <div className="relative mb-2.5 last:mb-0">
      <div className="absolute -left-2.5 top-2.5 w-2 h-0.5 bg-border-subtle" />
      <div className={cn('absolute -left-3.5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-surface-0 shadow-sm', dotColor)} />
      
      <div className={cn(
        'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all',
        isCurrent
          ? 'bg-success/5 border-success/20'
          : 'bg-surface-2 border-border-subtle hover:bg-surface-0 hover:border-border-default hover:shadow-sm'
      )}>
        <div className={cn('flex items-center justify-center w-7 h-7 rounded-md shrink-0', iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn(
              'text-[11px] font-bold font-mono',
              type === 'epic' ? 'text-violet-600' : type === 'feature' ? 'text-primary' : 'text-success'
            )}>
              {itemKey}
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              {status}
            </Badge>
          </div>
          <p className="text-xs text-foreground truncate">{title}</p>
          {isCurrent && (
            <p className="text-[10px] font-medium text-success mt-1">← You are here</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CoverageList() {
  const items = [
    { id: '1', label: 'AC-1', text: 'User can login with email', covered: true },
    { id: '2', label: 'AC-2', text: 'Error message shown for invalid password', covered: false },
    { id: '3', label: 'AC-3', text: 'Session persists after refresh', covered: true },
  ];
  
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-center gap-2 p-2 rounded-md',
            item.covered ? 'bg-success/5' : 'bg-destructive/5 cursor-pointer hover:bg-destructive/10'
          )}
        >
          {item.covered ? (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
          <span className={cn(
            'text-[10px] font-bold shrink-0',
            item.covered ? 'text-success' : 'text-destructive'
          )}>
            {item.label}
          </span>
          <span className="text-[11px] text-muted-foreground truncate flex-1">{item.text}</span>
          {!item.covered && (
            <span className="text-[10px] font-medium text-primary shrink-0">Add test</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LinkedItemsList() {
  const items = [
    { type: 'defect', key: 'DEF-089', title: 'Login fails with special characters', status: 'Open' },
    { type: 'story', key: 'US-145', title: 'Password reset flow', status: 'In Progress' },
  ];
  
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2.5 p-2.5 bg-surface-2 border border-border-subtle rounded-lg cursor-pointer hover:bg-surface-0 hover:border-primary/20 hover:shadow-sm transition-all"
        >
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-md shrink-0',
            item.type === 'defect' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          )}>
            {item.type === 'defect' ? <Bug className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-[11px] font-bold font-mono',
                item.type === 'defect' ? 'text-destructive' : 'text-primary'
              )}>
                {item.key}
              </span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                item.type === 'defect' ? 'bg-destructive' : 'bg-warning'
              )} />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{item.title}</p>
          </div>
          <Badge variant="outline" className="text-[9px]">{item.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function PropertiesPanel({
  status, setStatus,
  priorityId, setPriorityId,
  typeId, setTypeId,
  folderId, setFolderId,
  estimatedTime, setEstimatedTime,
  selectedLabels, setSelectedLabels,
  priorities, caseTypes, folders, labels,
  markDirty,
}: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
        <Select value={status} onValueChange={(v) => { setStatus(v); markDirty(); }}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</label>
        <Select value={priorityId} onValueChange={(v) => { setPriorityId(v); markDirty(); }}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</label>
        <Select value={typeId} onValueChange={(v) => { setTypeId(v); markDirty(); }}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {caseTypes.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Folder</label>
        <Select value={folderId || '__none__'} onValueChange={(v) => { setFolderId(v === '__none__' ? '' : v); markDirty(); }}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Root" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Root (no folder)</SelectItem>
            {folders.map((f: any) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated Time (min)</label>
        <Input
          type="number"
          min={0}
          value={estimatedTime}
          onChange={(e) => { setEstimatedTime(e.target.value); markDirty(); }}
          placeholder="Minutes"
          className="h-9"
        />
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Labels</label>
        <div className="flex flex-wrap gap-1.5 p-2 border border-border-subtle rounded-md min-h-[42px]">
          {labels.map((label: any) => (
            <Badge
              key={label.id}
              variant={selectedLabels.includes(label.id) ? 'default' : 'outline'}
              style={selectedLabels.includes(label.id) ? { backgroundColor: label.color } : {}}
              className="cursor-pointer text-[11px]"
              onClick={() => {
                setSelectedLabels((prev: string[]) =>
                  prev.includes(label.id) ? prev.filter((l: string) => l !== label.id) : [...prev, label.id]
                );
                markDirty();
              }}
            >
              {label.name}
            </Badge>
          ))}
          {labels.length === 0 && (
            <span className="text-[11px] text-muted-foreground">No labels available</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AIPanel() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-primary to-violet-500 rounded text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          <h4 className="text-sm font-semibold">AI Suggestions</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Let AI help you improve your test case
        </p>
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <Sparkles className="h-3 w-3" />
            Generate test steps
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Suggest edge cases
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Improve coverage
          </Button>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel() {
  const entries = [
    { id: '1', action: 'Status changed', from: 'Draft', to: 'Ready', user: 'Ahmed Khan', time: '2 hours ago' },
    { id: '2', action: 'Step added', detail: 'Step 3', user: 'Sara Al-Ahmad', time: '1 day ago' },
    { id: '3', action: 'Created', user: 'Ahmed Khan', time: '2 days ago' },
  ];
  
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 p-2.5 bg-surface-2 rounded-lg">
          <div className="flex items-center justify-center w-7 h-7 bg-primary/10 text-primary rounded-full shrink-0">
            <History className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {entry.action}
              {entry.from && entry.to && (
                <span className="text-muted-foreground">
                  : {entry.from} → {entry.to}
                </span>
              )}
              {entry.detail && (
                <span className="text-muted-foreground">: {entry.detail}</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">
              by {entry.user} • {entry.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TestCaseEditor;
