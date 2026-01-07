/**
 * Capacity AI Drawer - Chat-based AI assistant for capacity planning
 * Uses Claude Anthropic API for real AI responses with streaming
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Send, Bot, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
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
  { id: 'find-backend', label: 'Find Backend' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'forecast', label: 'Forecast' },
];

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: 'I can help you analyze capacity, find resources, and optimize workloads using your real capacity data.\n\nTry: "Executive summary" or "Find available developers"',
  timestamp: new Date(),
};

export function CapacityAIDrawer({ isOpen, onClose }: CapacityAIDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleClearChat = () => {
    setMessages([{ ...INITIAL_MESSAGE, id: Date.now().toString(), timestamp: new Date() }]);
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
        content: m.content,
      }));

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
      const assistantMessageId = (Date.now() + 1).toString();

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
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                
                // Handle different event types from Anthropic
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  assistantContent += parsed.delta.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: assistantContent }
                        : m
                    )
                  );
                }
              } catch {
                // Ignore parse errors for incomplete JSON
              }
            } else if (line.startsWith('event: ')) {
              // Handle event types if needed
            }
          }
        }
      }

      // If no content was streamed, set a fallback
      if (!assistantContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: 'I apologize, but I could not generate a response. Please try again.' }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Capacity AI error:', error);
      
      toast({
        title: 'AI Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });

      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    const actionLabels: Record<string, string> = {
      'summary': 'Give me an executive summary of our current capacity',
      'available': 'Show me resources with available capacity',
      'risks': 'What are the capacity risks I should be aware of?',
      'find-backend': 'Find available backend developers',
      'optimize': 'How can I optimize our team utilization?',
      'forecast': 'Forecast our capacity needs for the next month',
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
          "fixed top-0 right-0 w-[420px] max-w-[90vw] h-screen z-[100]",
          "flex flex-col bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Blue Gradient Header */}
        <header className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8]">
          <div className="flex items-center gap-3">
            {/* AI Icon */}
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Capacity AI</h2>
              <p className="text-[12px] text-white/70">Powered by Claude</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-xl p-4",
                message.role === 'assistant'
                  ? "bg-[hsl(var(--muted))] mr-4"
                  : "bg-[#2563eb]/10 ml-4 border border-[#2563eb]/20"
              )}
            >
              {message.role === 'assistant' && (
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-2">
                  Capacity AI
                </p>
              )}
              <div className="text-[13px] text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap">
                {message.content.split('\n').map((line, i) => {
                  // Handle bold text with **text**
                  const boldPattern = /\*\*(.*?)\*\*/g;
                  const parts = line.split(boldPattern);
                  
                  return (
                    <p key={i} className={line === '' ? 'h-2' : undefined}>
                      {parts.map((part, j) => 
                        j % 2 === 1 ? (
                          <strong key={j} className="font-semibold">{part}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <div className="bg-[hsl(var(--muted))] rounded-xl p-4 mr-4">
              <p className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-2">
                Capacity AI
              </p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-3 border-t border-[hsl(var(--border))]">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                disabled={isLoading}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors",
                  "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]",
                  "hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--foreground))/20]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-[hsl(var(--border))]">
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about capacity..."
              disabled={isLoading}
              className="pr-12 h-11 text-[13px] rounded-full border-[#2563eb]/30 focus:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                inputValue.trim() && !isLoading
                  ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
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
