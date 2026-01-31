import { useState, useCallback } from 'react';
import { CatyMessage, CatySession, CatyContext } from '../types';

const STORAGE_KEY = 'caty_ai_sessions';
const MAX_SESSIONS = 50;

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

    const sessions: CatySession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = sessions.findIndex(s => s.id === session.id);

    if (idx >= 0) sessions[idx] = { ...sessions[idx], ...session };
    else sessions.unshift(session);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  }, [currentSessionId, messages, context]);

  const loadSession = useCallback((sessionId: string) => {
    const sessions: CatySession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setContext(session.context);
    }
  }, []);

  const getSessions = useCallback((): CatySession[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const addMessage = useCallback((type: 'user' | 'assistant', content: string, isHtml = false) => {
    const msg: CatyMessage = { id: generateId(), type, content, timestamp: new Date().toISOString(), isHtml };
    setMessages(prev => [...prev, msg]);
    return msg.id;
  }, []);

  return { messages, context, addMessage, saveSession, loadSession, getSessions, clearHistory };
}
