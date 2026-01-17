/**
 * Ask AI Hook
 * Handles conversation state, streaming, and AI interactions
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type { 
  Message, 
  Conversation, 
  ConversationContext, 
  ResponseComponent,
  SuggestedQuestion 
} from '../types';

interface UseAskAIReturn {
  // State
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isTyping: boolean;
  streamingContent: string;
  inputText: string;
  suggestedQuestions: SuggestedQuestion[];
  
  // Actions
  setInputText: (text: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  cancelStreaming: () => void;
}

// Mock conversations for demo
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    userId: 'user-1',
    projectId: 'proj-1',
    title: 'Test Coverage Analysis',
    summary: 'Analyzing authentication module coverage',
    context: { releaseId: 'rel-1', cycleIds: ['cyc-1'], folderIds: [], releaseName: 'Release 2.4.0', cycleNames: ['Sprint 24.1'], folderNames: [] },
    messageCount: 4,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    preview: 'The authentication module has 87% coverage...',
  },
  {
    id: 'conv-2',
    userId: 'user-1',
    projectId: 'proj-1',
    title: 'Defect Trends',
    summary: 'Weekly defect analysis',
    context: { releaseId: 'rel-1', cycleIds: [], folderIds: [], releaseName: 'Release 2.4.0', cycleNames: [], folderNames: [] },
    messageCount: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    preview: 'Critical defects decreased by 15%...',
  },
  {
    id: 'conv-3',
    userId: 'user-1',
    projectId: 'proj-1',
    title: 'Release Readiness',
    summary: 'Quality gate evaluation',
    context: { releaseId: 'rel-2', cycleIds: [], folderIds: [], releaseName: 'Release 2.3.1', cycleNames: [], folderNames: [] },
    messageCount: 6,
    status: 'active',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    lastMessageAt: new Date(Date.now() - 172800000).toISOString(),
    preview: 'All quality gates are passing...',
  },
];

// Suggested questions based on context
const DEFAULT_SUGGESTIONS: SuggestedQuestion[] = [
  { id: 'sug-1', text: 'What tests are failing in this cycle?', category: 'execution' },
  { id: 'sug-2', text: 'Show me coverage gaps for authentication', category: 'coverage' },
  { id: 'sug-3', text: 'Generate test cases for the login flow', category: 'generation' },
];

export function useAskAI(): UseAskAIReturn {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>('conv-1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [inputText, setInputText] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>(DEFAULT_SUGGESTIONS);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const simulateAIResponse = useCallback(async (userMessage: string) => {
    setIsTyping(true);
    setStreamingContent('');
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate mock response based on user message
    let responseText = '';
    let components: ResponseComponent[] = [];
    
    if (userMessage.toLowerCase().includes('coverage') || userMessage.toLowerCase().includes('test')) {
      responseText = "Based on my analysis of the **Authentication Module** in Sprint 24.1, here's the current test coverage breakdown:";
      components = [
        {
          type: 'metrics_card',
          title: 'Coverage Metrics',
          metrics: [
            { value: '87%', label: 'Overall Coverage', variant: 'teal' },
            { value: '92%', label: 'Login Flow', variant: 'primary' },
            { value: '68%', label: 'MFA Module', variant: 'danger' },
          ],
        },
        {
          type: 'chart',
          chartType: 'bar',
          title: 'Coverage by Component',
          data: {
            labels: ['Login', 'Register', 'MFA', 'Session', 'SSO'],
            values: [92, 85, 68, 75, 45],
          },
        },
        {
          type: 'action_buttons',
          layout: 'vertical',
          buttons: [
            { id: 'view-report', label: 'View Full Report', icon: 'file-text', variant: 'primary', action: { type: 'navigate', path: '/releases/coverage' } },
            { id: 'suggest-tests', label: 'Suggest Missing Tests', icon: 'plus', variant: 'secondary', action: { type: 'navigate', path: '/releases/test-cases' } },
          ],
        },
      ];
    } else if (userMessage.toLowerCase().includes('defect') || userMessage.toLowerCase().includes('bug')) {
      responseText = "I've analyzed the defect trends for the current release. Here's what I found:";
      components = [
        {
          type: 'metrics_card',
          title: 'Defect Summary',
          metrics: [
            { value: '23', label: 'Open Defects', variant: 'danger' },
            { value: '156', label: 'Closed This Week', variant: 'teal' },
            { value: '-15%', label: 'Trend', variant: 'primary' },
          ],
        },
        {
          type: 'table',
          title: 'Top Priority Defects',
          columns: [
            { key: 'id', label: 'ID', align: 'left' },
            { key: 'title', label: 'Title', align: 'left' },
            { key: 'severity', label: 'Severity', align: 'center' },
          ],
          rows: [
            { id: 'DEF-2341', title: 'Login timeout on mobile', severity: 'Critical' },
            { id: 'DEF-2338', title: 'Session not persisting', severity: 'High' },
            { id: 'DEF-2335', title: 'MFA code not sending', severity: 'High' },
          ],
        },
      ];
    } else if (userMessage.toLowerCase().includes('release') || userMessage.toLowerCase().includes('ready')) {
      responseText = "Let me evaluate the release readiness based on current quality gates:";
      components = [
        {
          type: 'metrics_card',
          title: 'Release Readiness',
          metrics: [
            { value: '94%', label: 'Quality Score', variant: 'teal' },
            { value: '6/7', label: 'Gates Passing', variant: 'primary' },
            { value: '2', label: 'Blockers', variant: 'danger' },
          ],
        },
        {
          type: 'alert',
          variant: 'warning',
          title: 'Attention Required',
          message: 'MFA module has 68% coverage, below the 80% threshold required for release.',
        },
        {
          type: 'action_buttons',
          layout: 'vertical',
          buttons: [
            { id: 'view-gates', label: 'View Quality Gates', icon: 'shield-check', variant: 'primary', action: { type: 'navigate', path: '/releases/quality-gates' } },
            { id: 'view-blockers', label: 'View Blockers', icon: 'alert-circle', variant: 'secondary', action: { type: 'navigate', path: '/releases/defects' } },
          ],
        },
      ];
    } else {
      responseText = "I understand you're asking about \"" + userMessage + "\". Let me help you with that.\n\nBased on the current context of **Release 2.4.0** and **Sprint 24.1 Regression**, I can provide insights on:\n\n• Test execution status and progress\n• Coverage analysis and gaps\n• Defect trends and patterns\n• Release readiness assessment\n\nWould you like me to focus on any specific area?";
      components = [];
    }

    // Simulate streaming
    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setStreamingContent(prev => prev + (i === 0 ? '' : ' ') + words[i]);
    }

    // Create the complete message
    const aiMessage: Message = {
      id: uuid(),
      conversationId: activeConversationId || 'new',
      role: 'assistant',
      content: {
        type: components.length > 0 ? 'rich' : 'text',
        text: responseText,
        components: components.length > 0 ? components : undefined,
      },
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
    setStreamingContent('');
    
    // Update suggestions
    setSuggestedQuestions([
      { id: 'sug-new-1', text: 'What tests should I run next?', category: 'execution' },
      { id: 'sug-new-2', text: 'Show me failed tests from last run', category: 'execution' },
      { id: 'sug-new-3', text: 'Generate a status report', category: 'reporting' },
    ]);
  }, [activeConversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return;

    const userMessage: Message = {
      id: uuid(),
      conversationId: activeConversationId || 'new',
      role: 'user',
      content: { type: 'text', text: content },
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    await simulateAIResponse(content);
  }, [activeConversationId, isTyping, simulateAIResponse]);

  const createConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: uuid(),
      userId: 'user-1',
      projectId: 'proj-1',
      title: 'New Conversation',
      summary: null,
      context: { releaseId: null, cycleIds: [], folderIds: [], releaseName: null, cycleNames: [], folderNames: [] },
      messageCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setMessages([]);
    setSuggestedQuestions(DEFAULT_SUGGESTIONS);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    // In real app, would load messages from API
    setMessages([]);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(conversations[0]?.id || null);
      setMessages([]);
    }
  }, [activeConversationId, conversations]);

  const cancelStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsTyping(false);
    setStreamingContent('');
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    isTyping,
    streamingContent,
    inputText,
    suggestedQuestions,
    setInputText,
    sendMessage,
    createConversation,
    selectConversation,
    deleteConversation,
    cancelStreaming,
  };
}
