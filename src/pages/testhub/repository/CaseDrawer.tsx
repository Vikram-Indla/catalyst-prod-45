import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/standard-button';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { useCreateTestCase, useUpdateTestCase, useCreateCaseVersion } from '@/hooks/test-management/useTestCases';
import { TMTestCase, TMCasePriority, TMCaseType, CaseStatus } from '@/types/test-management';
import { StepEditor, StepInput } from './StepEditor';
import { X } from '@/lib/atlaskit-icons';

interface CaseDrawerProps {
  projectId: string;
  folderId: string | null;
  existingCase: TMTestCase | null;
  onClose: () => void;
}

export function CaseDrawer({ projectId, folderId, existingCase, onClose }: CaseDrawerProps) {
  const isEdit = !!existingCase;

  const [title, setTitle] = useState(existingCase?.title ?? '');
  const [status, setStatus] = useState<CaseStatus>(existingCase?.status ?? 'DRAFT');
  const [priorityId, setPriorityId] = useState<string>(existingCase?.priority_id ?? '');
  const [typeId, setTypeId] = useState<string>(existingCase?.type_id ?? '');
  const [description, setDescription] = useState(existingCase?.objective ?? '');
  const [preconditions, setPreconditions] = useState(existingCase?.preconditions ?? '');
  const [steps, setSteps] = useState<StepInput[]>(
    (existingCase?.steps ?? []).map(s => ({
      action: s.action,
      expected_result: s.expected_result,
      test_data: s.test_data ?? '',
    }))
  );

  // Escape key — capture phase so it doesn't propagate to parent modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const { data: priorities = [] } = useQuery({
    queryKey: ['tm-priorities', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_case_priorities')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      return (data ?? []) as TMCasePriority[];
    },
    enabled: !!projectId,
  });

  const { data: types = [] } = useQuery({
    queryKey: ['tm-types', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_case_types')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      return (data ?? []) as TMCaseType[];
    },
    enabled: !!projectId,
  });

  // Set defaults when priorities/types load (only when creating, not editing)
  useEffect(() => {
    if (!isEdit && !priorityId && priorities.length > 0) {
      const def = (priorities as TMCasePriority[]).find(p => p.is_default) ?? priorities[0];
      if (def?.id) setPriorityId(def.id);
    }
  }, [priorities, isEdit, priorityId]);

  useEffect(() => {
    if (!isEdit && !typeId && types.length > 0) {
      const def = (types as TMCaseType[]).find(t => t.is_default) ?? types[0];
      if (def?.id) setTypeId(def.id);
    }
  }, [types, isEdit, typeId]);

  const createCase = useCreateTestCase();
  const updateCase = useUpdateTestCase();
  const createVersion = useCreateCaseVersion();
  const isPending = createCase.isPending || updateCase.isPending;

  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [replaceInSets, setReplaceInSets] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    const stepsPayload = steps
      .filter(s => s.action.trim())
      .map(s => ({
        action: s.action,
        expected_result: s.expected_result,
        test_data: s.test_data || undefined,
      }));

    if (isEdit && existingCase) {
      await updateCase.mutateAsync({
        id: existingCase.id,
        project_id: projectId,
        title: title.trim(),
        status,
        priority_id: priorityId || undefined,
        type_id: typeId || undefined,
        objective: description || undefined,
        preconditions: preconditions || undefined,
        // Preserve the case's OWN folder on edit. Previously used the prop
        // folderId (= selected sidebar folder), silently moving the case.
        folder_id: existingCase.folder_id ?? undefined,
        steps: stepsPayload,
      });
    } else {
      await createCase.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        status,
        priority_id: priorityId || undefined,
        type_id: typeId || undefined,
        objective: description || undefined,
        preconditions: preconditions || undefined,
        folder_id: folderId ?? undefined,
        steps: stepsPayload,
      });
    }
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--ds-font-size-200)',
    fontWeight: 600,
    color: 'var(--ds-text-subtle, #42526E)',
    marginBottom: 6,
    fontFamily: 'var(--ds-font-family-body)',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 20,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--ds-border, #DFE1E6)',
    borderRadius: 4,
    padding: '6px 10px',
    fontSize: 'var(--ds-font-size-400)',
    fontFamily: 'var(--ds-font-family-body)',
    color: 'var(--ds-text, #172B4D)',
    background: 'var(--ds-surface, #FFFFFF)',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit test case' : 'Create test case'}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 640,
        height: '100vh',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        boxShadow: '-4px 0 20px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--ds-font-size-600)',
            fontWeight: 600,
            color: 'var(--ds-text, #172B4D)',
            fontFamily: 'var(--ds-font-family-body)',
          }}
        >
          {isEdit ? 'Edit test case' : 'Create test case'}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-text-subtle, #42526E)',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 4,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={sectionStyle}>
          <label style={labelStyle}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Test case title"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as CaseStatus)}
              style={selectStyle}
            >
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">Review</option>
              <option value="APPROVED">Approved</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select
              value={priorityId}
              onChange={e => setPriorityId(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Select —</option>
              {(priorities as TMCasePriority[]).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={typeId}
              onChange={e => setTypeId(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Select —</option>
              {(types as TMCaseType[]).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Description / Objective</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this test verify?"
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Preconditions</label>
          <textarea
            value={preconditions}
            onChange={e => setPreconditions(e.target.value)}
            placeholder="Setup required before this test..."
            style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
          />
        </div>

        <div style={sectionStyle}>
          <label style={{ ...labelStyle, marginBottom: 12 }}>Steps</label>
          <StepEditor steps={steps} onChange={setSteps} />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {isEdit && existingCase && (
          <>
            <button
              onClick={() => setVersionModalOpen(true)}
              style={{
                padding: '6px 12px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, borderRadius: 4,
                border: '1px solid var(--ds-border, #DFE1E6)',
                background: 'var(--ds-surface, #FFFFFF)',
                color: 'var(--ds-text-subtle, #42526E)', cursor: 'pointer',
              }}
            >
              New version
            </button>
            <span style={{
              fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)',
              marginRight: 'auto',
            }}>
              v{existingCase.current_version ?? existingCase.version ?? 1}
            </span>
          </>
        )}
        {!isEdit && <span style={{ flex: 1 }} />}
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleSave}
          isDisabled={isPending || !title.trim()}
          iconAfter={isPending ? <Spinner size="small" appearance="invert" /> : undefined}
        >
          {isEdit ? 'Save changes' : 'Create case'}
        </Button>
      </div>

      {/* Create new version modal */}
      {versionModalOpen && isEdit && existingCase && (
        <ModalDialog onClose={() => setVersionModalOpen(false)} width="small">
          <ModalHeader>
            <ModalTitle>Create new version</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)', fontFamily: 'var(--ds-font-family-body)' }}>
              A copy of this case will be created as version {(existingCase.current_version ?? existingCase.version ?? 1) + 1}.
              The current version will be marked as superseded.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={replaceInSets}
                onChange={e => setReplaceInSets(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', fontFamily: 'var(--ds-font-family-body)' }}>
                Replace in all test sets
              </span>
            </label>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setVersionModalOpen(false)}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={createVersion.isPending}
              onClick={() => {
                createVersion.mutate(
                  { case_id: existingCase.id, project_id: projectId, replace_in_sets: replaceInSets },
                  { onSuccess: () => { setVersionModalOpen(false); onClose(); } }
                );
              }}
            >
              {createVersion.isPending ? 'Creating…' : 'Create version'}
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </div>
  );

  return panel;
}
