/**
 * Ask AI Page
 * Conversational AI interface for test management
 * Catalyst Platform | v9.8 Build
 */

import React from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAskAI } from './hooks/useAskAI';
import { useContextPanel } from './hooks/useContextPanel';
import { ConversationsPanel } from './components/ConversationsPanel';
import { ChatHeader } from './components/ChatHeader';
import { QuickActions } from './components/QuickActions';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { AIContextPanel } from './components/AIContextPanel';

export function AskAIPage() {
  const {
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
  } = useAskAI();

  const {
    contextData,
    toggleRelease,
    toggleCycle,
    toggleFolder,
    isContextPanelOpen,
    setContextPanelOpen,
  } = useContextPanel();

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex bg-[#fafafa]">
      {/* Conversations Panel */}
      <ConversationsPanel
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelect={selectConversation}
        onCreate={createConversation}
        onDelete={deleteConversation}
      />

      {/* Chat Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          conversationTitle={activeConversation?.title}
          onClear={createConversation}
          onExport={() => {}}
        />
        
        <QuickActions onAction={handleQuickAction} />
        
        <MessageList
          messages={messages}
          isTyping={isTyping}
          streamingContent={streamingContent}
        />

        <MessageInput
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          onCancel={cancelStreaming}
          isTyping={isTyping}
          suggestedQuestions={suggestedQuestions}
        />
      </div>

      {/* Context Panel Toggle (when closed) */}
      {!isContextPanelOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setContextPanelOpen(true)}
          className="fixed right-4 top-20 z-10 h-10 w-10 bg-white shadow-lg border-slate-200"
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
