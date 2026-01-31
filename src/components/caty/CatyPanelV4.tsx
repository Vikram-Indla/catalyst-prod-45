/**
 * Caty V4 — Main Panel Component (Lovable AI Powered)
 * Enterprise-grade AI Assistant for capacity management
 * Uses Gemini 3 Flash via Lovable AI Gateway with streaming
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';

// V4 Components
import { CatyHeader } from './CatyHeader';
import { CatyGreetingCard } from './CatyGreetingCard';
import { CatyMessageBubble } from './CatyMessage';
import { CatyTypingIndicator } from './CatyTypingIndicator';
import { CatySuggestions } from './CatySuggestions';
import { CatyInput } from './CatyInput';
import { CatySkeletonCard, CatyErrorState } from './CatyStates';
import { useCapacityData } from './useCapacityData';
import { useCatyKeyboard } from './useCatyKeyboard';
import { useCatyAI, type Message } from './useCatyAI';
import { formatTimeAgo, type ChatMessage } from './types';

// Import ring-fenced styles
import '@/styles/caty.css';

export function CatyPanelV4() {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  
  // Auth
  const { user } = useAuth();
  
  // Capacity data hook
  const { stats, isLoading, isError, refetch } = useCapacityData();
  
  // AI streaming hook
  const { isStreaming, streamResponse, abortStream } = useCatyAI();
  
  // Keyboard shortcuts
  useCatyKeyboard({ 
    onClose: () => setIsOpen(false), 
    inputRef, 
    isOpen 
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Helpers
  const getUserFirstName = () => {
    if (profile?.full_name) return profile.full_name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((w: string) => w.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Contextual suggestions
  const getSuggestions = (): string[] => {
    if (stats.critical > 0) {
      return ["Show critical resources", "Contract renewals", "Who needs attention?"];
    }
    if (stats.warning > 0) {
      return ["Show warnings", "Upcoming renewals", "Department breakdown"];
    }
    return ["Total resources", "Show all departments", "Contract renewals"];
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Toggle department expansion
  const toggleDeptExpand = (deptId: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  // Convert chat messages to AI format
  const getAIMessages = useCallback((): Message[] => {
    return messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
  }, [messages]);

  // Handle message submit with streaming
  const handleSubmit = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userQuery = inputValue.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userQuery,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Create assistant message placeholder for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    let assistantContent = '';

    // Add empty assistant message that will be updated
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    // Build messages array for AI
    const aiMessages: Message[] = [
      ...getAIMessages(),
      { role: 'user', content: userQuery }
    ];

    // Stream response
    await streamResponse(
      aiMessages,
      // onDelta - update the last message with new tokens
      (deltaText: string) => {
        assistantContent += deltaText;
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].id === assistantMessageId) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: assistantContent,
            };
          }
          return updated;
        });
      },
      // onDone
      () => {
        // Final update with complete content
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].id === assistantMessageId) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: assistantContent || 'I apologize, but I could not generate a response. Please try again.',
            };
          }
          return updated;
        });
      },
      // onError
      (error: string) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].id === assistantMessageId) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: `Sorry, I encountered an error: ${error}. Please try again.`,
            };
          }
          return updated;
        });
      }
    );
  };

  // Handle KPI click
  const handleKpiClick = (type: 'critical' | 'warning' | 'total') => {
    const queries = {
      critical: 'Show critical resources ending within 30 days',
      warning: 'Show warning resources ending within 90 days',
      total: 'Show me a breakdown of all resources by department'
    };
    setInputValue(queries[type]);
    setTimeout(() => handleSubmit(), 100);
  };

  // Handle feedback
  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback } : m
    ));
    // TODO: Persist feedback to database
  };

  // Handle copy
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ''));
  };

  // Handle refresh
  const handleRefresh = () => {
    abortStream();
    setMessages([]);
    refetch();
  };

  const lastUpdatedText = formatTimeAgo(stats.lastUpdated);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "caty-fab",
          isOpen && "opacity-0 pointer-events-none"
        )}
        aria-label="Open Caty AI Assistant"
      >
        <img 
          src={catalystLogoWhite} 
          alt="Catalyst AI" 
          className="w-10 h-10"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
        {stats.critical > 0 && (
          <div className="caty-fab-badge" aria-label={`${stats.critical} critical alerts`}>
            {stats.critical}
          </div>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="caty-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Panel */}
      {isOpen && (
        <div 
          className={cn(
            "caty-panel",
            isMinimized && "minimized"
          )}
          role="dialog"
          aria-label="Caty Capacity AI Assistant"
          aria-modal="true"
        >
          <CatyHeader
            onClose={() => setIsOpen(false)}
            onMinimize={() => setIsMinimized(!isMinimized)}
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
            lastUpdated={lastUpdatedText}
          />

          {!isMinimized && (
            <>
              {/* Conversation Area */}
              <div 
                ref={conversationRef}
                className="caty-conversation"
              >
                {/* Loading State */}
                {isLoading && <CatySkeletonCard />}

                {/* Error State */}
                {isError && (
                  <CatyErrorState 
                    type="api-error" 
                    onRetry={refetch} 
                  />
                )}

                {/* Initial Greeting Card */}
                {!isLoading && !isError && (
                  <CatyGreetingCard
                    greeting={getGreeting()}
                    userName={getUserFirstName()}
                    stats={stats}
                    expandedDepts={expandedDepts}
                    onDeptToggle={toggleDeptExpand}
                    onKpiClick={handleKpiClick}
                    timestamp={new Date()}
                  />
                )}

                {/* Conversation Messages */}
                {messages.map(message => (
                  <CatyMessageBubble
                    key={message.id}
                    message={message}
                    userInitials={getUserInitials()}
                    onCopy={handleCopy}
                    onFeedback={handleFeedback}
                    isStreaming={isStreaming && message.type === 'assistant' && message === messages[messages.length - 1]}
                  />
                ))}

                {/* Typing Indicator - only show when starting stream with empty content */}
                {isStreaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
                  <CatyTypingIndicator />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              <CatySuggestions
                suggestions={getSuggestions()}
                onSelect={(text) => {
                  setInputValue(text);
                  inputRef.current?.focus();
                }}
                disabled={isStreaming}
              />

              {/* Input */}
              <CatyInput
                ref={inputRef}
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSubmit}
                disabled={isStreaming}
                placeholder={isStreaming ? "Generating response..." : "Ask about capacity..."}
              />
            </>
          )}

          {/* Live region for screen readers */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isStreaming && 'Caty is generating a response'}
          </div>
        </div>
      )}
    </>
  );
}
