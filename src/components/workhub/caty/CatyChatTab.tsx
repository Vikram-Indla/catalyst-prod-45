/**
 * CatyChatTab — Chat interface for natural language queries
 */

import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useCatyChat } from '@/hooks/workhub/useCatyAI';

const SUGGESTION_CHIPS = [
  'How are we doing?',
  'Release status',
  'Who\'s overloaded?',
  'What\'s overdue?',
  'Top priorities',
];

export function CatyChatTab() {
  const { messages, isTyping, sendMessage, clearChat } = useCatyChat();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide suggestions after first exchange
  useEffect(() => {
    if (messages.length > 2) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const handleSuggestionClick = (text: string) => {
    handleSendMessage(text);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, var(--ds-text-brand, #2563eb), var(--ds-background-brand-bold-hovered, #1D4ED8))',
              }}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--wh-text-secondary)' }}
            >
              Welcome! I'm Caty, your AI portfolio assistant. I analyze your
              ProjectHub data in real-time. Ask me anything about releases,
              resources, themes, or work items.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="rounded-xl px-3.5 py-2.5 max-w-[80%] text-xs whitespace-pre-wrap"
                style={{
                  backgroundColor:
                    msg.role === 'user'
                      ? 'var(--wh-primary)'
                      : 'var(--ds-surface-sunken, #f1f5f9)',
                  color:
                    msg.role === 'user'
                      ? 'white'
                      : 'var(--wh-text-primary)',
                  borderRadius:
                    msg.role === 'user'
                      ? '12px 12px 4px 12px'
                      : '12px 12px 12px 4px',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3.5 py-2.5 flex gap-1.5"
              style={{
                backgroundColor: 'var(--ds-surface-sunken, #f1f5f9)',
                borderRadius: '12px 12px 12px 4px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--ds-text-subtlest, #94a3b8)',
                    animation: `bounce 1.4s infinite`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
              <style>{`
                @keyframes bounce {
                  0%, 80%, 100% { transform: translateY(0); }
                  40% { transform: translateY(-6px); }
                }
              `}</style>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && messages.length <= 1 && (
        <div className="px-4 pb-3">
          <p
            className="text-xs font-medium mb-2"
            style={{ color: 'var(--wh-text-secondary)' }}
          >
            Suggestions:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSuggestionClick(chip)}
                className="px-3 py-1.5 rounded-full border text-xs font-medium hover:opacity-80 transition-all"
                style={{
                  backgroundColor: 'var(--ds-text-inverse, #ffffff)',
                  borderColor: 'var(--wh-border)',
                  color: 'var(--wh-text-primary)',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div
        className="p-3 border-t flex items-center gap-2"
        style={{ borderColor: 'var(--wh-border)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your portfolio..."
          className="flex-1 px-4 py-2 rounded-2xl border text-xs outline-none transition-all"
          style={{
            borderColor: 'var(--wh-border)',
            color: 'var(--wh-text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--wh-primary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--wh-border)';
          }}
        />
        <button
          onClick={() => handleSendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
          style={{
            backgroundColor: input.trim() && !isTyping ? 'var(--wh-primary)' : 'var(--ds-border, #e2e8f0)',
          }}
        >
          <Send
            className="w-4 h-4"
            style={{
              color:
                input.trim() && !isTyping
                  ? 'white'
                  : 'var(--wh-text-tertiary)',
            }}
          />
        </button>
      </div>

      {/* Clear Button */}
      {messages.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={clearChat}
            className="text-xs hover:opacity-80 transition-opacity"
            style={{ color: 'var(--wh-primary)' }}
          >
            Clear chat
          </button>
        </div>
      )}
    </div>
  );
}
