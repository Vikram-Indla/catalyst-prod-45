/**
 * Issue Audit Hook
 * Handles audit logging for all issue actions (uses mock data until table is created)
 */

import { useState, useCallback } from 'react';

interface AuditLogEntry {
  id: string;
  issueId: string;
  action: string;
  field?: string;
  fromValue?: string | null;
  toValue?: string | null;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface LogActionParams {
  issueId: string;
  action: string;
  field?: string;
  fromValue?: unknown;
  toValue?: unknown;
  metadata?: Record<string, unknown>;
}

// Mock history for demo purposes
const MOCK_HISTORY: AuditLogEntry[] = [
  {
    id: '1',
    issueId: 'demo',
    action: 'field_changed',
    field: 'Status',
    fromValue: 'To Do',
    toValue: 'In Progress',
    actorId: 'user1',
    actorName: 'John Doe',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    issueId: 'demo',
    action: 'field_changed',
    field: 'Assignee',
    fromValue: null,
    toValue: 'Jane Smith',
    actorId: 'user2',
    actorName: 'Admin User',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    issueId: 'demo',
    action: 'field_changed',
    field: 'Priority',
    fromValue: 'Medium',
    toValue: 'High',
    actorId: 'user1',
    actorName: 'John Doe',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    issueId: 'demo',
    action: 'created',
    field: undefined,
    fromValue: null,
    toValue: null,
    actorId: 'user1',
    actorName: 'John Doe',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

export function useIssueAudit(issueId: string) {
  const [history, setHistory] = useState<AuditLogEntry[]>(
    MOCK_HISTORY.map(h => ({ ...h, issueId }))
  );

  // Log field changes (adds to local state for demo)
  const logFieldChange = useCallback((field: string, fromValue: unknown, toValue: unknown) => {
    const newEntry: AuditLogEntry = {
      id: `${Date.now()}`,
      issueId,
      action: 'field_changed',
      field,
      fromValue: fromValue !== undefined && fromValue !== null ? String(fromValue) : null,
      toValue: toValue !== undefined && toValue !== null ? String(toValue) : null,
      actorId: 'current-user',
      actorName: 'You',
      createdAt: new Date().toISOString(),
    };
    setHistory(prev => [newEntry, ...prev]);
    console.log('Audit log:', newEntry);
  }, [issueId]);

  // Log issue actions
  const logAction = useCallback((action: string, metadata?: Record<string, unknown>) => {
    const newEntry: AuditLogEntry = {
      id: `${Date.now()}`,
      issueId,
      action,
      actorId: 'current-user',
      actorName: 'You',
      createdAt: new Date().toISOString(),
      metadata,
    };
    setHistory(prev => [newEntry, ...prev]);
    console.log('Audit log:', newEntry);
  }, [issueId]);

  return {
    history,
    isLoading: false,
    error: null,
    logFieldChange,
    logAction,
    refetchHistory: () => {},
  };
}

export default useIssueAudit;
