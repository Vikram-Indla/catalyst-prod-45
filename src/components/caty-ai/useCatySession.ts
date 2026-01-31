/**
 * Caty AI V7 — Session Hook
 */

import { useState, useCallback } from 'react';
import { CatyMessage, CatySession, CatyContext } from './types';
import { CATY_STORAGE_KEY, CATY_MAX_SESSIONS } from './constants';

export function useCatySession(initialContext: CatyContext) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CatyMessage[]>([]);
  const [context, setContext] = useState<CatyContext>(initialContext);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const saveSession = useCallback(() => {
    if (messages.length === 0) return;

    const session: CatySession = {
      id: currentSessionId || generateId(),
      created: currentSessionId ? '' : new Date().toISOString(),
      updated: new Date().toISOString(),
      context,
      messages,
    };

    if (!currentSessionId) {
      setCurrentSessionId(session.id);
      session.created = session.updated;
    }

    const sessions: CatySession[] = JSON.parse(localStorage.getItem(CATY_STORAGE_KEY) || '[]');
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...session };
    } else {
      sessions.unshift(session);
    }

    localStorage.setItem(CATY_STORAGE_KEY, JSON.stringify(sessions.slice(0, CATY_MAX_SESSIONS)));
  }, [currentSessionId, messages, context]);

  const loadSession = useCallback((sessionId: string) => {
    const sessions: CatySession[] = JSON.parse(localStorage.getItem(CATY_STORAGE_KEY) || '[]');
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setContext(session.context);
    }
  }, []);

  const getSessions = useCallback((): CatySession[] => {
    return JSON.parse(localStorage.getItem(CATY_STORAGE_KEY) || '[]');
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(CATY_STORAGE_KEY);
  }, []);

  const addMessage = useCallback((type: 'user' | 'assistant', content: string, isHtml = false) => {
    const newMessage: CatyMessage = {
      id: generateId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      isHtml,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateLastAssistantMessage = useCallback((content: string, isHtml = false) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.type === 'assistant') {
        return prev.map((m, i) => 
          i === prev.length - 1 ? { ...m, content, isHtml } : m
        );
      }
      // Create new assistant message if none exists
      return [...prev, {
        id: generateId(),
        type: 'assistant' as const,
        content,
        timestamp: new Date().toISOString(),
        isHtml,
      }];
    });
  }, []);

  const newSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    context,
    setContext,
    addMessage,
    updateLastAssistantMessage,
    saveSession,
    loadSession,
    getSessions,
    clearHistory,
    newSession,
  };
}
