/**
 * Message List Component
 * Renders chat messages with rich content support
 */

import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ResponseComponentRenderer } from './ResponseComponentRenderer';
import type { Message, ResponseComponent } from '../types';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  streamingContent: string;
}

export function MessageList({ messages, isTyping, streamingContent }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <ScrollArea className="flex-1 bg-[#fafafa]" ref={scrollRef}>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Welcome message if no messages */}
        {messages.length === 0 && !isTyping && (
          <WelcomeMessage />
        )}

        {/* Messages */}
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator with streaming content */}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-9 h-9 bg-[#0d9488] rounded-xl flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 pt-1">
              {streamingContent ? (
                <div className="text-sm text-slate-800 leading-relaxed">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-[#0d9488] animate-pulse ml-0.5" />
                </div>
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function WelcomeMessage() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-[#0d9488] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Bot className="w-9 h-9 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        Welcome to Catalyst AI
      </h2>
      <p className="text-slate-500 max-w-md mx-auto">
        I'm your test management assistant. Ask me about coverage, defects, test execution, 
        or let me help you generate test cases and analyze quality metrics.
      </p>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-4">
        <div className="max-w-md">
          <div className="bg-[#2563eb] text-white px-5 py-3.5 rounded-[20px] rounded-br-[4px] text-sm leading-relaxed">
            {message.content.text}
          </div>
        </div>
        <div className="w-9 h-9 bg-[#2563eb] rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-4">
      <div className="w-9 h-9 bg-[#0d9488] rounded-xl flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 space-y-4 max-w-2xl">
        {/* Badge */}
        {message.content.components && message.content.components.length > 0 && (
          <span className="inline-block px-3 py-1 text-[11px] font-semibold uppercase tracking-wide bg-[#0d9488]/10 text-[#0d9488] rounded">
            Analysis
          </span>
        )}
        
        {/* Text content */}
        {message.content.text && (
          <div className="text-sm text-slate-800 leading-relaxed">
            {formatMarkdown(message.content.text)}
          </div>
        )}

        {/* Rich components */}
        {message.content.components?.map((component, index) => (
          <ResponseComponentRenderer key={index} component={component} />
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// Simple markdown formatter
function formatMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[#0d9488]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
