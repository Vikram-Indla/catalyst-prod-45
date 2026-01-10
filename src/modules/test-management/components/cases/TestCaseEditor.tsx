/**
 * Test Case Editor - Complete Rebuild
 * Bloomberg/Enterprise quality - Field-by-field specification match
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QATesterPicker } from '@/components/ui/qa-tester-picker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Save,
  X,
  Plus,
  Trash2,
  Lock,
  Clock,
  User,
  FileEdit,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  Cog,
  RefreshCw,
  Flame,
  Link as LinkIcon,
  Zap,
  Shield,
  Users,
  FolderOpen,
  Tag,
  Paperclip,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Image as ImageIcon,
  MoreVertical,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowRight,
  Search,
  BookOpen,
  Layers,
  Target,
  Bug,
} from 'lucide-react';

import { validateTestCaseForReady } from './editor/QualityChecklist';
import type { TestCase, TestStep, Folder, CaseStatus } from '../../api/types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-muted-foreground' },
  { value: 'in_review', label: 'In Review', color: 'bg-blue-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'needs_revision', label: 'Needs Revision', color: 'bg-orange-500' },
  { value: 'deprecated', label: 'Deprecated', color: 'bg-destructive' },
] as const;

const TYPE_OPTIONS = [
  { value: 'functional', label: 'Functional', icon: Cog },
  { value: 'regression', label: 'Regression', icon: RefreshCw },
  { value: 'smoke', label: 'Smoke', icon: Flame },
  { value: 'integration', label: 'Integration', icon: LinkIcon },
  { value: 'performance', label: 'Performance', icon: Zap },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'usability', label: 'Usability', icon: Users },
];

const PRIORITY_OPTIONS = [
  { value: 'P1', label: 'P1 - Critical', color: 'bg-destructive', description: 'Must test first' },
  { value: 'P2', label: 'P2 - High', color: 'bg-orange-500', description: 'Important functionality' },
  { value: 'P3', label: 'P3 - Medium', color: 'bg-yellow-500', description: 'Normal priority' },
  { value: 'P4', label: 'P4 - Low', color: 'bg-muted-foreground', description: 'Nice to have' },
];

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
}

interface TeamMember {
  id: string;
  name: string;
  avatar_url?: string;
}

interface TestCaseEditorProps {
  testCase?: TestCase | null;
  steps?: TestStep[];
  folders: Folder[];
  priorities: { id: string; name: string; color: string }[];
  caseTypes: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  teamMembers?: TeamMember[];
  currentUserId?: string;
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

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
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
  teamMembers = [],
  currentUserId,
  onSave,
  onClose,
  isSubmitting,
  projectId,
  defaultFolderId,
}: TestCaseEditorProps) {
  const isEditing = !!testCase;

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState<PreconditionInput[]>([]);
  const [status, setStatus] = useState<string>('draft');
  const [priorityId, setPriorityId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [estimate, setEstimate] = useState<string>('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [references, setReferences] = useState<string>('');
  const [stepsList, setStepsList] = useState<StepInput[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>('');

  // UI state
  const [preconditionsExpanded, setPreconditionsExpanded] = useState(true);
  const [stepsExpanded, setStepsExpanded] = useState(true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  // Linked items state
  interface LinkedItem {
    id: string;
    type: 'story' | 'feature' | 'epic' | 'defect';
    key: string;
    title: string;
  }
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);

  // Governance state
  const isApproved = testCase?.status === 'approved';
  const isEditable = !isApproved;

  // Initialize form
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setSummary(testCase.description?.split('\n')[0] || '');
      setDescription(testCase.description || '');
      setPreconditions(
        testCase.preconditions
          ? [{ id: generateId(), text: testCase.preconditions }]
          : []
      );
      setStatus(testCase.status || 'draft');
      setPriorityId(testCase.priority_id || '');
      setTypeId(testCase.type_id || '');
      setFolderId(testCase.folder_id || '');
      setSelectedLabels(testCase.labels?.map(l => l.id) || []);
      setEstimate(testCase.estimated_time_minutes?.toString() || '');
      setAssigneeId((testCase as any).assigned_to || currentUserId || '');
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
      setSummary('');
      setDescription('');
      setPreconditions([]);
      setStatus('draft');
      setPriorityId('');
      setTypeId('');
      setFolderId(defaultFolderId || '');
      setSelectedLabels([]);
      setEstimate('');
      setStepsList([]);
      setAssigneeId(currentUserId || '');
    }
    setIsDirty(false);
  }, [testCase, initialSteps, defaultFolderId, currentUserId]);

  // Handlers
  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleAddStep = () => {
    const newStep: StepInput = {
      id: generateId(),
      step_number: stepsList.length + 1,
      action: '',
      test_data: '',
      expected_result: '',
      attachments: [],
    };
    setStepsList([...stepsList, newStep]);
    setExpandedSteps(prev => new Set(prev).add(newStep.id));
    markDirty();
  };

  const handleUpdateStep = (id: string, field: keyof StepInput, value: string) => {
    setStepsList(stepsList.map(s => (s.id === id ? { ...s, [field]: value } : s)));
    markDirty();
  };

  const handleDeleteStep = (id: string) => {
    const updated = stepsList.filter(s => s.id !== id);
    updated.forEach((s, i) => (s.step_number = i + 1));
    setStepsList(updated);
    markDirty();
  };

  const handleDuplicateStep = (step: StepInput) => {
    const index = stepsList.findIndex(s => s.id === step.id);
    const newStep: StepInput = {
      ...step,
      id: generateId(),
      step_number: index + 2,
    };
    const updated = [...stepsList];
    updated.splice(index + 1, 0, newStep);
    updated.forEach((s, i) => (s.step_number = i + 1));
    setStepsList(updated);
    markDirty();
  };

  const toggleStepExpand = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddPrecondition = () => {
    setPreconditions([...preconditions, { id: generateId(), text: '' }]);
    markDirty();
  };

  const handleUpdatePrecondition = (id: string, value: string) => {
    setPreconditions(preconditions.map(p => (p.id === id ? { ...p, text: value } : p)));
    markDirty();
  };

  const handleDeletePrecondition = (id: string) => {
    setPreconditions(preconditions.filter(p => p.id !== id));
    markDirty();
  };

  const handleSubmit = useCallback(() => {
    if (!summary.trim()) {
      toast.error('Summary is required');
      return;
    }

    const stepsWithMissingExpected = stepsList.filter(
      step => step.action?.trim() && !step.expected_result?.trim()
    );

    if (stepsWithMissingExpected.length > 0) {
      toast.error(
        `${stepsWithMissingExpected.length} step(s) missing expected results.`
      );
      return;
    }

    const caseData = {
      project_id: projectId,
      title: summary.trim(),
      description: description.trim() || summary.trim() || undefined,
      preconditions: preconditions.map(p => p.text).join('\n') || undefined,
      status,
      priority_id: priorityId || undefined,
      type_id: typeId || undefined,
      folder_id: folderId || undefined,
      tags: selectedLabels.length > 0 ? selectedLabels : undefined,
      assigned_to: assigneeId || undefined,
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
    projectId, title, summary, description, preconditions, status, priorityId,
    typeId, folderId, estimate, selectedLabels, stepsList, onSave, assigneeId,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  const currentFolder = folders.find(f => f.id === folderId);
  const selectedType = caseTypes.find(t => t.id === typeId);
  const selectedPriority = priorities.find(p => p.id === priorityId);

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* HEADER BAR */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 h-14 border-b bg-background shrink-0">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Status Dropdown - Only show for existing cases */}
          {isEditing && (
            <Select value={status} onValueChange={(v) => { setStatus(v); markDirty(); }}>
              <SelectTrigger className="w-[140px] h-9">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-muted-foreground'
                  )} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", opt.color)} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Case Key */}
          <span className="text-sm font-medium text-muted-foreground">
            {testCase?.case_key || 'New Case'}
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Assignee Picker - Only shows QA Testers */}
          {isEditing && (
            <QATesterPicker
              value={assigneeId || null}
              onChange={(v) => { 
                setAssigneeId(v === 'UNASSIGNED' ? '' : (v || '')); 
                markDirty(); 
              }}
              placeholder="Assign to QA..."
              showUnassigned
            />
          )}

          {/* Save button */}
          <Button
            onClick={handleSubmit}
            disabled={!summary.trim() || isSubmitting}
            className="h-9 px-4 gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
          </Button>

          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - FULL WIDTH */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-8 py-6">
          {/* Approved Lock Banner */}
          {isApproved && (
            <Alert variant="default" className="mb-6 border-orange-300 bg-orange-50">
              <Lock className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-700">Locked Test Case</AlertTitle>
              <AlertDescription className="text-orange-600">
                This test case is approved and cannot be modified.
              </AlertDescription>
            </Alert>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* SUMMARY FIELD - HERO ELEMENT */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Summary <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => { setSummary(e.target.value); markDirty(); }}
              placeholder="Brief one-line description of what this test validates..."
              autoFocus
              maxLength={200}
              disabled={!isEditable}
              className={cn(
                "w-full",
                "text-2xl font-semibold",
                "px-4 py-3",
                "bg-background",
                "border-2 border-border rounded-lg",
                "shadow-sm",
                "focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none",
                "hover:border-muted-foreground/50",
                "placeholder:text-muted-foreground/50 placeholder:font-normal",
                "transition-all duration-150",
                !summary && "border-destructive/50"
              )}
            />
            <div className="flex justify-between mt-1.5">
              {!summary && (
                <span className="text-xs text-destructive">Summary is required</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{summary.length}/200</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* METADATA FIELDS - 3 COLUMN GRID */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Type <span className="text-destructive">*</span>
              </label>
              <Select value={typeId} onValueChange={(v) => { setTypeId(v); markDirty(); }}>
                <SelectTrigger className="w-full h-10 border-border">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Cog className="w-4 h-4 text-muted-foreground" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Priority <span className="text-destructive">*</span>
              </label>
              <Select value={priorityId} onValueChange={(v) => { setPriorityId(v); markDirty(); }}>
                <SelectTrigger className="w-full h-10 border-border">
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Folder */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Folder <span className="text-destructive">*</span>
              </label>
              <Select value={folderId} onValueChange={(v) => { setFolderId(v); markDirty(); }}>
                <SelectTrigger className="w-full h-10 border-border">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Select folder..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* DESCRIPTION / OBJECTIVE */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Objective / Description
            </label>
            <div className="border border-border rounded-lg shadow-sm overflow-hidden bg-background">
              {/* Rich Text Toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 border-b border-border">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Underline className="h-4 w-4" /></Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ListOrdered className="h-4 w-4" /></Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Code className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><LinkIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ImageIcon className="h-4 w-4" /></Button>
              </div>
              
              <Textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                placeholder="Describe the purpose of this test case. What functionality does it verify? What is the expected behavior?"
                disabled={!isEditable}
                className={cn(
                  "w-full",
                  "min-h-[250px]",
                  "max-h-[500px]",
                  "resize-y",
                  "px-4 py-3",
                  "text-sm leading-relaxed",
                  "border-none rounded-none",
                  "focus-visible:ring-0",
                  "placeholder:text-muted-foreground/50"
                )}
              />
              
              <div className="flex justify-between items-center px-3 py-2 bg-muted/50 border-t border-border text-xs text-muted-foreground">
                <span>{description.length} characters · {description.split(/\s+/).filter(Boolean).length} words</span>
                <span>Tip: Be specific about expected behavior</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* PRECONDITIONS */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mb-6 border border-border rounded-lg bg-background overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border cursor-pointer"
              onClick={() => setPreconditionsExpanded(!preconditionsExpanded)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preconditions
                </h3>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {preconditions.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddPrecondition(); }}
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  + Add
                </button>
                {preconditionsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
            {preconditionsExpanded && (
              <div className="p-4">
                {preconditions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No preconditions defined
                    <button
                      onClick={handleAddPrecondition}
                      className="block mx-auto mt-2 text-primary hover:text-primary/80 text-sm"
                    >
                      + Add precondition
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {preconditions.map((pre, idx) => (
                      <div key={pre.id} className="flex items-start gap-2 group">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <Input
                          value={pre.text}
                          onChange={(e) => handleUpdatePrecondition(pre.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && isEditable) {
                              e.preventDefault();
                              handleAddPrecondition();
                            }
                          }}
                          placeholder="Enter precondition..."
                          className="flex-1"
                          disabled={!isEditable}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePrecondition(pre.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TEST STEPS */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mb-6 border border-border rounded-lg bg-background overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border cursor-pointer"
              onClick={() => setStepsExpanded(!stepsExpanded)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Test Steps
                </h3>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-100 text-green-700">
                  {stepsList.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddStep(); }}
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  + Add Step
                </button>
                {stepsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
            
            {stepsExpanded && (
              <div className="p-4">
                {/* Table Header */}
                <div className="grid grid-cols-[50px_1fr_180px_1fr_80px] gap-2 px-3 py-2 bg-muted/50 rounded-t-lg border border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>#</span>
                  <span>Action <span className="text-destructive">*</span></span>
                  <span>Test Data</span>
                  <span>Expected Result <span className="text-destructive">*</span></span>
                  <span></span>
                </div>

                {/* Step Rows */}
                <div className="border-x border-b border-border rounded-b-lg divide-y divide-border">
                  {stepsList.map((step) => {
                    const isStepExpanded = expandedSteps.has(step.id);
                    return (
                      <div key={step.id} className="bg-background">
                        {/* Collapsed row */}
                        <div
                          className="grid grid-cols-[50px_1fr_180px_1fr_80px] gap-2 px-3 py-3 items-center cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleStepExpand(step.id)}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                              {step.step_number}
                            </span>
                          </div>
                          <div className="text-sm truncate">{step.action || <span className="text-muted-foreground/50">Enter action...</span>}</div>
                          <div className="text-sm truncate text-muted-foreground">{step.test_data || '—'}</div>
                          <div className="text-sm truncate">{step.expected_result || <span className="text-muted-foreground/50">Enter expected result...</span>}</div>
                          <div className="flex items-center gap-1">
                            {step.test_data && (
                              <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">DATA</Badge>
                            )}
                            {isStepExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {/* Expanded view */}
                        {isStepExpanded && (
                          <div className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                  Action <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                  value={step.action}
                                  onChange={(e) => handleUpdateStep(step.id, 'action', e.target.value)}
                                  placeholder="What should the tester do?"
                                  className="min-h-[80px] text-sm"
                                  disabled={!isEditable}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                  Expected Result <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                  value={step.expected_result}
                                  onChange={(e) => handleUpdateStep(step.id, 'expected_result', e.target.value)}
                                  placeholder="What should happen?"
                                  className={cn(
                                    "min-h-[80px] text-sm",
                                    step.action?.trim() && !step.expected_result?.trim() && "border-destructive"
                                  )}
                                  disabled={!isEditable}
                                />
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                Test Data
                              </label>
                              <Input
                                value={step.test_data}
                                onChange={(e) => handleUpdateStep(step.id, 'test_data', e.target.value)}
                                placeholder="Input values, parameters..."
                                className="text-sm font-mono"
                                disabled={!isEditable}
                              />
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                              <span className="text-xs text-muted-foreground">Step {step.step_number} of {stepsList.length}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDuplicateStep(step)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteStep(step.id)}
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
                </div>

                {/* Add Step Button */}
                <button
                  onClick={handleAddStep}
                  className="w-full mt-3 py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Test Step
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* LINKED ITEMS */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mb-6 border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Linked Items
                </h3>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {linkedItems.length}
                </Badge>
              </div>
              <button
                onClick={() => setLinkModalOpen(true)}
                className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Link
              </button>
            </div>
            <div className="p-4">
              {linkedItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No linked items</p>
                  <p className="text-xs mt-1">Link to Stories, Features, Epics, or Defects</p>
                  <button
                    onClick={() => setLinkModalOpen(true)}
                    className="mt-3 text-primary hover:text-primary/80 text-sm"
                  >
                    + Add Link
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedItems.map((item) => {
                    const typeColors: Record<string, string> = {
                      story: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      feature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                      epic: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
                      defect: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    };
                    const TypeIcon = item.type === 'story' ? BookOpen : item.type === 'feature' ? Layers : item.type === 'epic' ? Target : Bug;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 text-xs font-mono rounded", typeColors[item.type])}>
                            {item.key}
                          </span>
                          <span className="text-sm">{item.title}</span>
                        </div>
                        <button
                          onClick={() => setLinkedItems(linkedItems.filter(i => i.id !== item.id))}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Link Modal */}
          <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Link Work Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    placeholder="Search by key or title..."
                    className="pl-10"
                  />
                </div>

                {/* Quick type filters */}
                <div className="flex gap-2">
                  {[
                    { type: 'story', label: 'Story', icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                    { type: 'feature', label: 'Feature', icon: Layers, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                    { type: 'epic', label: 'Epic', icon: Target, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
                    { type: 'defect', label: 'Defect', icon: Bug, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                  ].map(({ type, label, icon: Icon, color }) => (
                    <button
                      key={type}
                      onClick={() => {
                        // Add a sample linked item
                        const newItem = {
                          id: generateId(),
                          type: type as 'story' | 'feature' | 'epic' | 'defect',
                          key: `${type.toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 1000)}`,
                          title: `Sample ${label} - ${linkSearch || 'New Item'}`,
                        };
                        setLinkedItems([...linkedItems, newItem]);
                        setLinkSearch('');
                        markDirty();
                        toast.success(`${label} linked successfully`);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        color,
                        "hover:opacity-80"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Results placeholder */}
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <p>Click a type above to add a linked item</p>
                    <p className="text-xs mt-1">Enter a search term to filter results</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* ADDITIONAL FIELDS ROW */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Attachments */}
            <div className="p-4 border border-border rounded-lg bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attachments</span>
              </div>
              <p className="text-sm text-muted-foreground">0 files</p>
            </div>

            {/* Labels */}
            <div className="p-4 border border-border rounded-lg bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedLabels.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No labels</span>
                ) : (
                  selectedLabels.map(id => {
                    const label = labels.find(l => l.id === id);
                    return label ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {label.name}
                      </Badge>
                    ) : null;
                  })
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* METADATA FOOTER */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Created by: <strong className="text-foreground">{testCase?.owner_name || 'Current User'}</strong></span>
              <span>·</span>
              <span>{testCase?.created_at ? new Date(testCase.created_at).toLocaleDateString() : 'Just now'}</span>
            </div>
            <div>
              Last updated: {testCase?.updated_at ? formatRelativeTime(testCase.updated_at) : 'Never'}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER BAR */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="flex items-center justify-between px-5 py-2.5 bg-background border-t border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isDirty ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
            )} />
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center bg-primary/10 text-primary rounded text-[9px] font-bold">
              {stepsList.length}
            </span>
            steps
          </span>
          {estimate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{estimate}
            </span>
          )}
          <span className="text-muted-foreground/50">|</span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘S</kbd> to save
          </span>
        </div>
      </footer>
    </div>
  );
}
