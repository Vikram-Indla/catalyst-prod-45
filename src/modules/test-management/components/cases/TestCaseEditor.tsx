/**
 * Test Case Editor - Full-Page Editor Component
 * Refactored to use focused sub-components matching test-case-editor-final.html (9.5+ quality)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, Clock } from 'lucide-react';

import {
  EditorHeader,
  EditorToolbar,
  ObjectiveSection,
  PreconditionsSection,
  StepsSection,
  ContextPanel,
} from './editor';

import type { TestCase, TestStep, Folder, CaseStatus } from '../../api/types';

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
  folders: Folder[];
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
  const qualityScore = testCase ? 85 : 0;
  const executionHistory: ('pass' | 'fail')[] = testCase ? ['pass', 'pass', 'pass', 'fail', 'pass', 'pass'] : [];
  const collaborators = testCase ? [
    { id: '1', name: 'Ahmed Khan', initials: 'AK', color: 'bg-primary', isOnline: true },
    { id: '2', name: 'Sara Al-Ahmad', initials: 'SA', color: 'bg-success', isOnline: false },
  ] : [];

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

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <EditorHeader
        caseKey={testCase?.case_key}
        status={status}
        folderName={currentFolder?.name}
        qualityScore={qualityScore}
        executionResults={executionHistory}
        collaborators={collaborators}
        isDirty={isDirty}
        isSaving={isSubmitting || false}
        onBack={onClose}
        onSave={handleSubmit}
        onClone={testCase ? () => {} : undefined}
        onClose={onClose}
        disabled={!title.trim()}
      />

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <main className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <EditorToolbar
            onAIAssist={() => setActiveContextTab('ai')}
          />

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
                    {testCase?.owner_name || 'Current User'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {testCase ? `Updated ${new Date(testCase.updated_at).toLocaleDateString()}` : 'New case'}
                  </span>
                  {testCase && <span>v1</span>}
                </div>
              </div>

              {/* Objective Section */}
              <ObjectiveSection
                objective={objective}
                onChange={(value) => { setObjective(value); markDirty(); }}
                className="mb-5"
              />

              {/* Preconditions Section */}
              <PreconditionsSection
                preconditions={preconditions}
                onChange={(value) => { setPreconditions(value); markDirty(); }}
                className="mb-5"
              />

              {/* Steps Section */}
              <StepsSection
                steps={stepsList}
                onChange={(value) => { setStepsList(value); markDirty(); }}
                expandedSteps={expandedSteps}
                onToggleStep={toggleStepExpand}
                className="mb-5"
              />
            </div>
          </ScrollArea>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* CONTEXT PANEL */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <ContextPanel
          activeTab={activeContextTab}
          onTabChange={setActiveContextTab}
          status={status}
          priorityId={priorityId}
          typeId={typeId}
          folderId={folderId}
          estimatedTime={estimatedTime}
          selectedLabels={selectedLabels}
          priorities={priorities}
          caseTypes={caseTypes}
          folders={folders}
          labels={labels}
          onStatusChange={(value) => { setStatus(value); markDirty(); }}
          onPriorityChange={(value) => { setPriorityId(value); markDirty(); }}
          onTypeChange={(value) => { setTypeId(value); markDirty(); }}
          onFolderChange={(value) => { setFolderId(value); markDirty(); }}
          onEstimatedTimeChange={(value) => { setEstimatedTime(value); markDirty(); }}
          onLabelsChange={(value) => { setSelectedLabels(value); markDirty(); }}
        />
      </main>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="flex items-center justify-between px-5 py-2 bg-background border-t border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>{stepsList.length} steps</span>
          {estimatedTime && <span>~{estimatedTime} min</span>}
        </div>
      </footer>
    </div>
  );
}
