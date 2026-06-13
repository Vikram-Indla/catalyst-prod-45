/**
 * InlineCreateCard — Canonical inline issue creation for kanban columns.
 *
 * Replaces per-board create flows with a unified component:
 * - TextArea (summary, autoFocus, appearance="subtle")
 * - DropdownMenu (issue type with JiraIssueTypeIcon)
 * - Date picker (createPortal to document.body, position:fixed for A2 halt fix)
 * - Assignee search (debounced 300ms)
 * - Submit button (disabled when summary empty)
 * - Error handling + form clear on success
 *
 * Props:
 *   projectKey: Jira project key (BAU, INV, etc.)
 *   columnId: Destination column ID
 *   swimlaneGroupKey?: Optional swimlane group (for swimlane boards)
 *   onCreateCard: Callback fired on successful creation with CreatedIssue data
 *   onCancel: Callback fired when user cancels (Escape or Cancel button)
 *
 * Returns:
 *   { issueId, issueKey, issueType, summary, status, dueDate?, assigneeId? }
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button';
import TextField from '@atlaskit/textfield';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { catalystToast } from '@/lib/catalystToast';
import { useCreatemeta } from '@/hooks/useCreatemeta';
import { useSearchAssignees } from '@/hooks/useSearchAssignees';
import { SPACING_TOKENS } from './kanban-tokens';

export interface CreatedIssue {
  issueId: string;
  issueKey: string;
  issueType: string;
  summary: string;
  status: string;
  dueDate?: string;
  assigneeId?: string;
}

interface InlineCreateCardProps {
  projectKey: string;
  columnId: string;
  swimlaneGroupKey?: string;
  onCreateCard: (issue: CreatedIssue) => void;
  onCancel: () => void;
}

const CREATABLE_TYPES = ['Story', 'Task', 'Bug', 'Defect', 'Feature'];

function InlineCreateCardComponent({
  projectKey,
  columnId,
  swimlaneGroupKey,
  onCreateCard,
  onCancel,
}: InlineCreateCardProps) {
  const [summary, setSummary] = useState('');
  const [issueTypeId, setIssueTypeId] = useState<string>('10006'); // Story default
  const [issueName, setIssueName] = useState('Story');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignee search dropdown visibility
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<Array<{ id: string; name: string }>>([]);

  // Date picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const assigneePickerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  // Fetch createmeta using hook
  const { data: createmetaData, isLoading: isLoadingCreatemeta, error: createmetaError } = useCreatemeta(projectKey);
  const issueTypes = createmetaData?.projects[0]?.issuetypes
    ?.filter((t: any) => CREATABLE_TYPES.includes(t.name))
    ?.map((t: any) => ({ id: t.id, name: t.name })) || [];

  // Fetch assignee search results using hook
  const { data: assigneeSearchData, isLoading: isSearchingAssignee } = useSearchAssignees(projectKey, assigneeSearch);

  // Focus summary on mount
  useEffect(() => {
    summaryRef.current?.focus();
  }, []);

  // Debounced assignee search
  const searchAssignees = useCallback(async (query: string) => {
    if (!query.trim()) {
      setAssigneeOptions([]);
      return;
    }
    setIsSearchingAssignee(true);
    try {
      const response = await fetch(
        `/rest/api/3/user/assignable/search?projectKey=${projectKey}&query=${encodeURIComponent(query)}&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${await getAuthToken()}` },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const users = await response.json();
      setAssigneeOptions(
        users.map((u: any) => ({ id: u.accountId, name: u.displayName }))
      );
    } catch (err) {
      console.error('Failed to search assignees:', err);
    } finally {
      setIsSearchingAssignee(false);
    }
  }, [projectKey]);

  // Debounce assignee search
  useEffect(() => {
    if (!assigneeSearch) {
      setAssigneeOptions([]);
      return;
    }
    const timer = setTimeout(() => searchAssignees(assigneeSearch), 300);
    return () => clearTimeout(timer);
  }, [assigneeSearch, searchAssignees]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false);
      }
      if (
        assigneePickerRef.current &&
        !assigneePickerRef.current.contains(e.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside, { capture: true });
    return () => document.removeEventListener('click', handleClickOutside, { capture: true });
  }, []);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDatePicker) {
          setShowDatePicker(false);
          e.stopPropagation();
        } else if (showAssigneeDropdown) {
          setShowAssigneeDropdown(false);
          e.stopPropagation();
        } else {
          onCancel();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [showDatePicker, showAssigneeDropdown, onCancel]);

  const getAuthToken = async (): Promise<string> => {
    // For development/testing, use browser's Authorization header from Jira session
    // In production, this would be obtained from backend or Supabase auth
    return 'mock-token'; // This will be handled by the backend API proxy
  };

  const handleSubmit = async () => {
    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        fields: {
          'project.key': projectKey,
          'issuetype.id': issueTypeId,
          summary: summary.trim(),
          ...(dueDate && { duedate: dueDate }),
          ...(assigneeId && { 'assignee.accountId': assigneeId }),
        },
      };

      const response = await fetch('/rest/api/3/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.errorMessages?.[0] || `HTTP ${response.status}`);
      }

      const created = await response.json();
      const createdIssue: CreatedIssue = {
        issueId: created.id,
        issueKey: created.key,
        issueType: issueName,
        summary: summary.trim(),
        status: 'To Do', // Default status for newly created issues
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
      };

      onCreateCard(createdIssue);
      // Clear form
      setSummary('');
      setDueDate('');
      setAssigneeId('');
      setAssigneeSearch('');
      setError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errorMsg);
      console.error('Create issue error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-inline-create-form="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING_TOKENS.gap8,
        padding: '8px',
        background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
        borderRadius: 4,
        border: '1px solid var(--ds-border-neutral, #DFE1E6)',
      }}
    >
      {/* Error message */}
      {error && (
        <div
          style={{
            background: '#FFEBE6',
            color: '#AE2A19',
            padding: '6px 8px',
            borderRadius: 3,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Summary TextArea */}
      <TextField
        ref={summaryRef}
        isCompact
        appearance="subtle"
        placeholder="What needs to be done?"
        value={summary}
        onChange={(e) => setSummary(e.currentTarget.value)}
        disabled={isSubmitting}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        style={{ width: '100%' }}
      />

      {/* Issue Type Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            appearance="subtle"
            isDisabled={isSubmitting}
            iconBefore={
              issueTypes.find((t) => t.id === issueTypeId) && (
                <JiraIssueTypeIcon
                  type={issueName.toLowerCase()}
                  size={14}
                />
              )
            }
          >
            {issueName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {issueTypes.map((type) => (
            <DropdownMenuItem
              key={type.id}
              onClick={() => {
                setIssueTypeId(type.id);
                setIssueName(type.name);
              }}
            >
              <JiraIssueTypeIcon type={type.name.toLowerCase()} size={14} />
              {type.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Picker */}
      <div style={{ position: 'relative' }}>
        <Button
          appearance="subtle"
          isDisabled={isSubmitting}
          onClick={() => setShowDatePicker(!showDatePicker)}
        >
          {dueDate ? `Due: ${dueDate}` : 'Add due date'}
        </Button>
        {showDatePicker &&
          createPortal(
            <div
              ref={datePickerRef}
              data-inline-create-portal="true"
              style={{
                position: 'fixed',
                background: 'var(--ds-background-elevation-raised, #ffffff)',
                border: '1px solid var(--ds-border-neutral, #DFE1E6)',
                borderRadius: 4,
                padding: '8px',
                zIndex: 10000,
                minWidth: 200,
                boxShadow: '0 4px 8px rgba(9,30,66,0.15)',
              }}
            >
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.currentTarget.value)}
                style={{ width: '100%' }}
              />
            </div>,
            document.body
          )}
      </div>

      {/* Assignee Search */}
      <div style={{ position: 'relative' }}>
        <TextField
          isCompact
          appearance="subtle"
          placeholder="Assign to..."
          value={assigneeSearch}
          onChange={(e) => setAssigneeSearch(e.currentTarget.value)}
          onFocus={() => setShowAssigneeDropdown(true)}
          disabled={isSubmitting}
        />
        {showAssigneeDropdown &&
          createPortal(
            <div
              ref={assigneePickerRef}
              data-inline-create-portal="true"
              style={{
                position: 'fixed',
                background: 'var(--ds-background-elevation-raised, #ffffff)',
                border: '1px solid var(--ds-border-neutral, #DFE1E6)',
                borderRadius: 4,
                padding: '0',
                zIndex: 10000,
                minWidth: 200,
                maxHeight: 200,
                overflowY: 'auto',
                boxShadow: '0 4px 8px rgba(9,30,66,0.15)',
              }}
            >
              {isSearchingAssignee ? (
                <div style={{ padding: '8px', fontSize: 12 }}>Searching...</div>
              ) : assigneeOptions.length > 0 ? (
                assigneeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setAssigneeId(option.id);
                      setAssigneeSearch(option.name);
                      setShowAssigneeDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--ds-background-neutral-subtle, #F7F8F9)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'transparent';
                    }}
                  >
                    {option.name}
                  </button>
                ))
              ) : assigneeSearch ? (
                <div style={{ padding: '8px', fontSize: 12 }}>
                  No results for "{assigneeSearch}"
                </div>
              ) : null}
            </div>,
            document.body
          )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: SPACING_TOKENS.gap8 }}>
        <Button
          appearance="primary"
          isDisabled={!summary.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </Button>
        <Button
          appearance="subtle"
          isDisabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export { InlineCreateCardComponent as InlineCreateCard };
export default InlineCreateCardComponent;
