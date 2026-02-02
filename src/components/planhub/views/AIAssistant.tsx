import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Props {
  planId?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'What are the main risks?',
  'Show critical path tasks',
  'Summarize resource utilization',
  'Which tasks are behind schedule?',
];

export default function AIAssistant({ planId }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Check if plan selected
    if (!planId) {
      toast({ 
        title: 'No plan selected', 
        description: 'Please select a plan from the library first',
        variant: 'destructive' 
      });
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/planhub-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            plan_id: planId,
            message: content,
            context: {
              include_tasks: true,
              include_resources: true,
            },
          }),
        }
      );

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add credits to continue using the AI assistant.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI request failed');
      }

      const data = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update suggestions if provided
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
      }
    } catch (error: any) {
      console.error('AI error:', error);
      
      toast({
        title: 'AI Error',
        description: error.message || 'Failed to get AI response',
        variant: 'destructive',
      });
      
      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error.message || 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <div className="ph-page-header">
        <h1 className="ph-page-title">AI Assistant</h1>
        <p className="ph-page-subtitle">
          {planId ? 'Ask questions about your plan' : 'Select a plan to start chatting'}
        </p>
      </div>

      <div className="ph-page-body">
        <div className="ph-ai-chat">
          {/* Header */}
          <div className="ph-ai-header">
            <div className="ph-ai-avatar">
              <Bot size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>PlanHub AI</div>
              <div className="ph-text-sm ph-text-gray-500">Powered by Google Gemini</div>
            </div>
          </div>

          {/* Messages */}
          <div className="ph-ai-messages">
            {messages.length === 0 && (
              <div className="ph-ai-empty">
                <Sparkles size={48} style={{ color: 'var(--ph-purple)', opacity: 0.5, marginBottom: 16 }} />
                <p className="ph-text-gray-500">Start a conversation by asking about your plan</p>
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className={`ph-ai-message ${message.role}`}>
                <div className="ph-ai-message-avatar">
                  {message.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="ph-ai-bubble">
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ph-ai-message assistant">
                <div className="ph-ai-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="ph-ai-bubble">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length > 0 && !isLoading && (
            <div className="ph-ai-suggestions">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(suggestion)}
                  className="ph-ai-suggestion"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="ph-ai-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={planId ? "Ask about risks, resources, timeline..." : "Select a plan first"}
              disabled={!planId || isLoading}
            />
            <button type="submit" className="ph-ai-send" disabled={!planId || isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
