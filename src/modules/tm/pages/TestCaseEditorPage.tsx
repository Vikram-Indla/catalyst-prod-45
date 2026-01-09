/**
 * Test Case Editor Page - High-Volume QA Optimized Layout
 * Target: 200 cases/day with 500+ words, 10-20 steps each
 * 
 * Key optimizations:
 * - Compact header with inline Priority, Type, Status
 * - Full-width content (no always-visible right panel)
 * - Expanded text areas (200px+ description, 350px+ steps)
 * - Quality checklist as popover badge (not inline)
 * - Slide-out drawer for Trace/Props/AI/History
 * - Keyboard shortcuts for speed
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, PanelRightOpen, User, Clock, FolderOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import CompactHeader from '../components/TestCaseEditor/CompactHeader';
import QualityBadge from '../components/TestCaseEditor/QualityBadge';
import SlideOutPanel from '../components/TestCaseEditor/SlideOutPanel';
import ExpandedTestSteps from '../components/TestCaseEditor/ExpandedTestSteps';
import { CollapsibleSection } from '../components/TestCaseEditor';
import { useCurrentUser } from '../hooks/useCurrentUser';

type Status = 'draft' | 'ready' | 'approved' | 'deprecated';
type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type TestType = 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e';

interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  testData?: string;
  expectedResult: string;
}

export function TestCaseEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  
  // Get dynamic user
  const { user, loading: userLoading } = useCurrentUser();

  // Form state - NO MOCK DATA, empty by default
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('draft');
  const [priority, setPriority] = useState<Priority>('P3');
  const [testType, setTestType] = useState<TestType>('functional');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState<string[]>([]);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [folder, setFolder] = useState('Root');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [title, status, priority, testType, description, preconditions, steps]);

  // Quality checklist items
  const checklistItems = [
    { id: 'title', label: 'Title provided', required: true, completed: title.length > 0 },
    { id: 'description', label: 'Description defined (100+ chars)', required: false, completed: description.length >= 100 },
    { id: 'preconditions', label: 'Preconditions specified', required: false, completed: preconditions.length > 0 && preconditions.some(p => p.length > 0) },
    { id: 'steps', label: 'Has test steps', required: true, completed: steps.length > 0 },
    { id: 'expected', label: 'All steps have expected results', required: true, completed: steps.length > 0 && steps.every(s => s.expectedResult.length > 0) },
    { id: 'requirement', label: 'Linked to requirement', required: true, completed: false },
    { id: 'priority', label: 'Priority set (not P3)', required: false, completed: priority !== 'P3' },
  ];

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    setHasChanges(false);
    toast.success('Test case saved');
  }, []);

  const handleSaveAndNew = useCallback(async () => {
    await handleSave();
    // Reset form for new case
    setTitle('');
    setDescription('');
    setPreconditions([]);
    setSteps([]);
    setStatus('draft');
    setPriority('P3');
    setTestType('functional');
    toast.info('Ready for new test case');
  }, [handleSave]);

  const handleAddPrecondition = () => {
    setPreconditions([...preconditions, '']);
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

  const handleAIAssist = () => {
    toast.info('AI Assist coming soon');
  };

  const handleFix = (itemId: string) => {
    if (itemId === 'title') {
      document.querySelector<HTMLInputElement>('input[placeholder*="title"]')?.focus();
    } else if (itemId === 'description') {
      document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="description"]')?.focus();
    } else if (itemId === 'steps') {
      handleAddStep();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-1)]">
      {/* Compact Header - 48px with inline controls */}
      <CompactHeader
        isNew={isNew}
        title={title}
        onTitleChange={setTitle}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        testType={testType}
        onTestTypeChange={setTestType}
        folderPath="Root"
        isSaving={isSaving}
        hasChanges={hasChanges}
        onSave={handleSave}
        onSaveAndNew={handleSaveAndNew}
      />

      {/* Toolbar row - AI Assist, Quality Badge, Panel Toggle */}
      <div
        className="flex items-center justify-between px-4 border-b bg-[var(--bg-0)] shrink-0"
        style={{ height: '44px', borderColor: 'var(--stroke-1)' }}
      >
        {/* Left - AI Assist */}
        <Button
          onClick={handleAIAssist}
          size="sm"
          className="h-8 px-3 gap-1.5 text-white border-none"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            boxShadow: '0 4px 14px -2px rgba(124, 58, 237, 0.3)',
          }}
        >
          <Sparkles className="h-4 w-4" />
          AI Assist
        </Button>

        {/* Right - Quality Badge & Panel Toggle */}
        <div className="flex items-center gap-3">
          <QualityBadge items={checklistItems} onFix={handleFix} />
          
          <button
            onClick={() => setIsPanelOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--row-hover)] transition-colors"
          >
            <PanelRightOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-6 px-6 space-y-6">
          
          {/* HERO TITLE FIELD - 24px, Bold, Prominent */}
          <div>
            <label
              className="block font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2"
              style={{ fontSize: '11px', letterSpacing: '0.5px' }}
            >
              TEST CASE TITLE <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTitleTouched(true)}
              placeholder="Enter test case title..."
              autoFocus
              className={cn(
                "w-full",
                "text-xl font-semibold",
                "px-4 py-3",
                "bg-white",
                "border-2 rounded-lg",
                "shadow-sm",
                "transition-all duration-150",
                "placeholder:text-gray-400 placeholder:font-normal",
                "focus:outline-none focus:ring-4",
                titleTouched && !title 
                  ? "border-[#dc2626] focus:border-[#dc2626] focus:ring-[#fee2e2]" 
                  : "border-gray-200 hover:border-gray-300 focus:border-[#2563eb] focus:ring-[#dbeafe]"
              )}
              style={{ color: 'var(--text-1)' }}
            />
            {titleTouched && !title && (
              <p className="mt-2 text-xs text-[#dc2626] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Title is required
              </p>
            )}
            {title && (
              <p className="mt-2 text-xs text-gray-500">
                e.g., "Verify user login with valid credentials"
              </p>
            )}
          </div>

          {/* Meta Info Row - Dynamic User */}
          <div className="flex items-center gap-3 text-sm text-[var(--text-3)] flex-wrap">
            {/* Owner/Creator - DYNAMIC */}
            <div className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.fullName}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[#dbeafe] flex items-center justify-center">
                  <span className="text-xs font-medium text-[#2563eb]">
                    {user?.initials || <User className="h-3 w-3" />}
                  </span>
                </div>
              )}
              <span className="font-medium text-[var(--text-2)]">
                {userLoading ? 'Loading...' : user?.fullName || 'Not signed in'}
              </span>
            </div>
            
            <span className="text-[var(--text-4)]">•</span>
            
            {/* Case Status */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{isNew ? 'New case' : `Editing`}</span>
            </div>
            
            <span className="text-[var(--text-4)]">•</span>
            
            {/* Folder */}
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>{folder}</span>
            </div>
          </div>
          
          {/* Description - Large Text Area (min 200px) */}
          <div>
            <label
              className="block font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2"
              style={{ fontSize: '11px', letterSpacing: '0.5px' }}
            >
              DESCRIPTION / OBJECTIVE
            </label>
            <div
              className="rounded-lg border-2 border-gray-200 bg-white overflow-hidden shadow-sm hover:border-gray-300 focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#dbeafe] transition-all"
            >
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
                  lineHeight: '1.6',
                  fontSize: '14px',
                }}
              />
              <div
                className="flex items-center justify-between px-4 py-2 border-t text-xs bg-gray-50"
                style={{ borderColor: '#e5e5e5', color: '#737373' }}
              >
                <span>{description.length} characters • {description.split(/\s+/).filter(Boolean).length} words</span>
                <span>Tip: Be specific about expected behavior</span>
              </div>
            </div>
          </div>

          {/* Preconditions - Collapsible, default 100px */}
          <CollapsibleSection
            title="PRECONDITIONS"
            count={preconditions.filter(p => p.length > 0).length}
            actionLabel="+ Add"
            onAction={handleAddPrecondition}
            defaultExpanded={preconditions.length > 0}
          >
            {preconditions.length === 0 ? (
              <button
                onClick={handleAddPrecondition}
                className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <span>+</span> Add precondition
              </button>
            ) : (
              <div className="space-y-2">
                {preconditions.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6 font-medium">{i + 1}.</span>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const next = [...preconditions];
                        next[i] = e.target.value;
                        setPreconditions(next);
                      }}
                      placeholder="e.g., User is logged in as admin"
                      className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe] focus:outline-none transition-all"
                      style={{ fontSize: '13px', color: 'var(--text-1)' }}
                    />
                    <button
                      onClick={() => {
                        const next = preconditions.filter((_, idx) => idx !== i);
                        setPreconditions(next);
                      }}
                      className="p-1.5 rounded text-[var(--text-4)] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Test Steps - Expanded, min 350px */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="font-semibold text-[var(--text-2)] uppercase tracking-wide"
                  style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                >
                  TEST STEPS <span className="text-[#dc2626]">*</span>
                </span>
                <span
                  className="px-1.5 py-0.5 font-semibold rounded-full bg-[#ccfbf1] text-[#0d9488]"
                  style={{ minWidth: '20px', textAlign: 'center', fontSize: '10px' }}
                >
                  {steps.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAIAssist}
                  size="sm"
                  className="h-7 px-3 text-xs gap-1.5 text-white border-none"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    boxShadow: '0 2px 8px -2px rgba(124, 58, 237, 0.3)',
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Steps
                </Button>
                <Button
                  onClick={handleAddStep}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs border-2 border-gray-200 hover:border-gray-300"
                >
                  + Add Step
                </Button>
              </div>
            </div>
            
            <div
              className="rounded-lg border-2 border-gray-200 bg-white p-4 shadow-sm"
            >
              <ExpandedTestSteps
                steps={steps}
                onStepsChange={setSteps}
                onAddStep={handleAddStep}
                minHeight={350}
              />
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </ScrollArea>

      {/* Slide-out Panel (hidden by default) */}
      <SlideOutPanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
      />
    </div>
  );
}

export default TestCaseEditorPage;
