import { useState, useCallback, useEffect } from 'react';

export type ChatView = 'chat' | 'dms' | 'activity' | 'later' | 'people' | 'drafts';
export type ThreadMode = 'closed' | 'overlay' | 'docked-md' | 'docked-lg';
export type DraftsTab = 'drafts' | 'scheduled' | 'sent';

export interface ShellState {
  sidebarCollapsed: boolean;
  threadMode: ThreadMode;
  activeView: ChatView;
  threadMessageId: string | null;
  draftsActiveTab: DraftsTab;
}

export interface ShellActions {
  toggleSidebar: () => void;
  setActiveView: (view: ChatView) => void;
  openThread: (messageId: string) => void;
  closeThread: () => void;
  setDraftsActiveTab: (tab: DraftsTab) => void;
}

function resolveThreadMode(vw: number, hasThread: boolean): ThreadMode {
  if (!hasThread) return 'closed';
  if (vw >= 1680) return 'docked-lg';
  if (vw >= 1440) return 'docked-md';
  if (vw >= 1024) return 'overlay';
  return 'overlay';
}

export function useShellState(): ShellState & ShellActions {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<ChatView>('chat');
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);
  const [draftsActiveTab, setDraftsActiveTab] = useState<DraftsTab>('drafts');
  const [viewportW, setViewportW] = useState(() => window.innerWidth);

  useEffect(() => {
    const handler = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const threadMode = resolveThreadMode(viewportW, threadMessageId !== null);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(c => !c), []);

  const openThread = useCallback((messageId: string) => setThreadMessageId(messageId), []);

  const closeThread = useCallback(() => setThreadMessageId(null), []);

  return {
    sidebarCollapsed,
    threadMode,
    activeView,
    threadMessageId,
    draftsActiveTab,
    toggleSidebar,
    setActiveView,
    openThread,
    closeThread,
    setDraftsActiveTab,
  };
}
