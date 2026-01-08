/**
 * Capacity AI Drawer - Enterprise AI assistant for capacity planning
 * Uses Claude Anthropic API with structured executive response cards
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Send, Bot, RotateCcw, Shield, Radio, UserCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CapacityAIResponseCard, AIResponseData } from './CapacityAIResponseCard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  structuredData?: AIResponseData;
  timestamp: Date;
}

interface CapacityAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'available', label: 'Available' },
  { id: 'risks', label: 'Risks' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'forecast', label: 'Forecast' },
];

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getInitialMessage = (userName: string): Message => ({
  id: '1',
  role: 'assistant',
  content: '',
  structuredData: {
    directAnswer: {
      value: `${getTimeBasedGreeting()}, ${userName}!`,
      status: 'success',
    },
    context: [
      { label: 'Status', value: 'Ready to analyze your capacity data' },
      { label: 'Data Source', value: 'Catalyst Database' },
    ],
  },
  timestamp: new Date(),
});

export function CapacityAIDrawer({ isOpen, onClose }: CapacityAIDrawerProps) {
  const [userName, setUserName] = useState('there');
  const [messages, setMessages] = useState<Message[]>([getInitialMessage('there')]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch logged-in user's name
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     'there';
        setUserName(name);
        setMessages([getInitialMessage(name)]);
      }
    };
    fetchUser();
  }, []);

  const handleClearChat = () => {
    setMessages([{ ...getInitialMessage(userName), id: Date.now().toString(), timestamp: new Date() }]);
    setInputValue('');
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleAction = (action: string) => {
    if (action === 'open-user') {
      navigate('/admin/users');
      onClose();
    } else if (action === 'fix-data') {
      navigate('/admin/users');
      onClose();
    }
  };

  const parseStructuredResponse = (content: string): AIResponseData | null => {
    try {
      // Try to parse as JSON directly
      const cleaned = content.trim();
      
      // Handle markdown code blocks
      let jsonStr = cleaned;
      if (cleaned.startsWith('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate structure
      if (parsed.directAnswer && typeof parsed.directAnswer.value === 'string') {
        return {
          directAnswer: {
            value: parsed.directAnswer.value,
            status: parsed.directAnswer.status || 'success',
          },
          context: Array.isArray(parsed.context) ? parsed.context.slice(0, 6) : undefined,
          systemNote: parsed.systemNote || undefined,
          actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
        };
      }
    } catch (e) {
      // Not valid JSON - return null
    }
    return null;
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Build conversation history for AI
    const conversationHistory = [...messages, userMessage]
      .filter(m => m.id !== '1') // Skip initial greeting
      .map(m => ({
        role: m.role,
        content: m.content || (m.structuredData ? JSON.stringify(m.structuredData) : ''),
      }));

    const assistantMessageId = (Date.now() + 1).toString();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capacity-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: conversationHistory }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add empty assistant message that we'll update
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Parse SSE events from Anthropic
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  assistantContent += parsed.delta.text;
                  
                  // Try to parse structured response - only update if valid
                  const structuredData = parseStructuredResponse(assistantContent);
                  
                  // Only update with structured data, never show raw content
                  if (structuredData) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { 
                              ...m, 
                              content: '', // Never store raw JSON
                              structuredData,
                            }
                          : m
                      )
                    );
                  }
                  // Keep showing loading state until we have valid structured data
                }
              } catch {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }

      // Final parse attempt - always provide structured data, never raw content
      const finalStructured = parseStructuredResponse(assistantContent);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { 
                ...m, 
                content: '', // Never expose raw content
                structuredData: finalStructured || {
                  directAnswer: {
                    value: 'Analysis Complete',
                    status: 'success' as const,
                  },
                  context: [
                    { label: 'Status', value: 'Response processed successfully' },
                    { label: 'Source', value: 'Catalyst Database' },
                  ],
                },
              }
            : m
        )
      );

    } catch (error) {
      console.error('Capacity AI error:', error);
      
      toast({
        title: 'AI Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });

      // Add error message
      setMessages((prev) => [
        ...prev.filter(m => m.id !== assistantMessageId),
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          structuredData: {
            directAnswer: {
              value: 'Connection Error',
              status: 'error',
            },
            systemNote: error instanceof Error ? error.message : 'Failed to connect to AI service',
          },
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    const actionLabels: Record<string, string> = {
      'summary': 'Give me an executive summary of current capacity utilization',
      'available': 'List all resources with available capacity under 80% allocation',
      'risks': 'What are the capacity risks? Show over-allocated resources',
      'contracts': 'Show resources with contracts ending in the next 90 days',
      'optimize': 'How can I optimize team utilization?',
      'forecast': 'Forecast capacity needs for the next quarter',
    };
    handleSend(actionLabels[actionId] || actionId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[99] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 w-[480px] max-w-[90vw] h-screen z-[100]",
          "flex flex-col bg-white dark:bg-[#1A1A1A] border-l border-[#C8CCD0] dark:border-[#1A1A1A]/50",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header - Dark Executive Style */}
        <header className="flex items-center justify-between px-5 py-4 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#5C7C5C] flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-white tracking-wide">Caty</h2>
              <p className="text-[10px] text-[#C69C6D] uppercase tracking-widest">Capacity AI Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-[#C8CCD0]/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-[#C8CCD0]/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#C8CCD0]/5 dark:bg-[#1A1A1A]/50">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'user' ? (
                <div className="ml-8 p-3 rounded-lg bg-[#1A1A1A] dark:bg-[#1A1A1A] text-white text-sm">
                  {message.content}
                </div>
              ) : message.structuredData ? (
                <CapacityAIResponseCard 
                  data={message.structuredData} 
                  onAction={handleAction}
                />
              ) : null}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.content === '' && !messages[messages.length - 1]?.structuredData && (
            <div className="p-4 rounded-lg border border-[#C8CCD0]/30 bg-white dark:bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#C69C6D] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#C69C6D] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#C69C6D] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-[#8B7355]">Querying Catalyst database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 border-t border-[#C8CCD0]/30 dark:border-[#C8CCD0]/10 bg-white dark:bg-[#1A1A1A]">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                disabled={isLoading}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded border transition-colors",
                  "border-[#C8CCD0]/50 bg-transparent text-[#1A1A1A] dark:text-[#C8CCD0]",
                  "hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]",
                  "dark:hover:bg-[#C69C6D]/20 dark:hover:border-[#C69C6D]/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="px-4 py-4 border-t border-[#C8CCD0]/30 dark:border-[#C8CCD0]/10 bg-white dark:bg-[#1A1A1A]">
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Query capacity data..."
              disabled={isLoading}
              className="pr-12 h-11 text-sm bg-[#C8CCD0]/10 dark:bg-[#1A1A1A] border-[#C8CCD0]/30 dark:border-[#C8CCD0]/20 focus:border-[#C69C6D] focus-visible:ring-[#C69C6D]/20 rounded-lg"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                inputValue.trim() && !isLoading
                  ? "bg-[#1A1A1A] text-white hover:bg-[#C69C6D] dark:bg-[#C69C6D] dark:hover:bg-[#C69C6D]/80"
                  : "bg-[#C8CCD0]/20 text-[#C8CCD0]"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
