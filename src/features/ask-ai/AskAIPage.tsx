/**
 * Ask AI Page (Unified)
 * Merged CATY AI with Ask AI UI shell - all functionality on /releases/ask-ai
 */

import React, { useState, useMemo } from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import {
  useCatyConversations,
  useCreateCatyConversation,
  useDeleteCatyConversation,
  useSendCatyMessage,
  useCatyMessages,
} from '@/hooks/useCatyAI';
import { useContextPanel } from './hooks/useContextPanel';
import { ConversationsPanel } from './components/ConversationsPanel';
import { ChatHeader } from './components/ChatHeader';
import { QuickActions } from './components/QuickActions';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { AIContextPanel } from './components/AIContextPanel';
import { exportChatAsMarkdown, exportChatAsPdf } from '@/utils/exports';
import { toast } from 'sonner';
import type { Conversation, Message } from './types';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export function AskAIPage() {
  const { user } = useAuth();
  const { projectId: contextProjectId } = useProjectContext();
  const projectId = contextProjectId || DEFAULT_PROJECT_ID;

  // Real CATY data layer
  const { data: catyConversations = [], isLoading: isConversationsLoading } = useCatyConversations(user?.id || '', projectId);
  const createConversationMutation = useCreateCatyConversation();
  const deleteConversationMutation = useDeleteCatyConversation();
  const sendMessageMutation = useSendCatyMessage();

  // UI state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    catyConversations.length > 0 ? catyConversations[0].id : null
  );
  const [inputText, setInputText] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Transform CATY data to UI types
  const conversations: Conversation[] = useMemo(() => 
    catyConversations.map(cc => ({
      id: cc.id,
      userId: cc.user_id,
      projectId: cc.project_id,
      title: cc.title || 'Untitled Conversation',
      summary: null,
      context: { releaseId: null, cycleIds: [], folderIds: [], releaseName: null, cycleNames: [], folderNames: [] },
      messageCount: cc.message_count || 0,
      status: cc.is_archived ? 'archived' : 'active',
      createdAt: cc.created_at,
      updatedAt: cc.updated_at,
      lastMessageAt: cc.updated_at,
    })),
    [catyConversations]
  );

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  // Fetch messages for active conversation
  const { data: catyMessages = [] } = useCatyMessages(activeConversationId || '');

  // Transform CATY messages to UI types
  const messages: Message[] = useMemo(() =>
    catyMessages.map(cm => ({
      id: cm.id,
      conversationId: cm.conversation_id,
      role: cm.role,
      content: {
        type: cm.structured_content ? 'rich' : 'text',
        text: cm.content,
        components: cm.structured_content?.components,
      },
      createdAt: cm.created_at,
    })),
    [catyMessages]
  );

  const {
    contextData,
    toggleRelease,
    toggleCycle,
    toggleFolder,
    isContextPanelOpen,
    setContextPanelOpen,
  } = useContextPanel(projectId);

  const handleSend = () => {
    if (inputText.trim() && activeConversationId) {
      sendMessageMutation.mutate({
        conversationId: activeConversationId,
        content: inputText,
      });
      setInputText('');
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
  };

  const handleCreateConversation = async () => {
    if (!user) return;
    try {
      const conversation = await createConversationMutation.mutateAsync({
        userId: user.id,
        projectId,
        type: 'chat',
      });
      setActiveConversationId(conversation.id);
      setInputText('');
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setInputText('');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversationMutation.mutateAsync(id);
      if (activeConversationId === id) {
        const nextConversation = conversations.find(c => c.id !== id);
        setActiveConversationId(nextConversation?.id || null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'md') => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    setIsExporting(true);
    try {
      const chatMessages = messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content.text || '',
        timestamp: m.createdAt,
      }));

      const title = activeConversation?.title || 'AI Conversation';
      const filename = `catalyst-ai-chat`;

      if (format === 'md') {
        exportChatAsMarkdown(chatMessages, {
          filename,
          title,
          includeTimestamp: true,
        });
        toast.success('Chat exported as Markdown');
      } else {
        await exportChatAsPdf(chatMessages, {
          filename,
          title,
          brandName: 'Catalyst Platform',
          includeTimestamp: true,
        });
        toast.success('Chat exported as PDF');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export chat');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex bg-muted">
      {/* Conversations Panel */}
      <ConversationsPanel
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onCreate={handleCreateConversation}
        onDelete={handleDeleteConversation}
      />

      {/* Chat Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          conversationTitle={activeConversation?.title}
          onClear={handleCreateConversation}
          onExport={handleExport}
          isExporting={isExporting}
          hasMessages={messages.length > 0}
        />
        
        <QuickActions onAction={handleQuickAction} />
        
        <MessageList
          messages={messages}
          isTyping={sendMessageMutation.isPending}
          streamingContent=""
        />

        <MessageInput
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          onCancel={() => {}}
          isTyping={sendMessageMutation.isPending}
          suggestedQuestions={[]}
        />
      </div>

      {/* Context Panel Toggle (when closed) */}
      {!isContextPanelOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setContextPanelOpen(true)}
          className="fixed right-4 top-20 z-10 h-10 w-10 bg-background shadow-lg border-border"
        >
          <PanelRight className="w-5 h-5" />
        </Button>
      )}

      {/* AI Context Panel */}
      <AIContextPanel
        data={contextData}
        onToggleRelease={toggleRelease}
        onToggleCycle={toggleCycle}
        onToggleFolder={toggleFolder}
        isOpen={isContextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
      />
    </div>
  );
}

export default AskAIPage;
