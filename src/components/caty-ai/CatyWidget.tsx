/**
 * Caty AI V7 — Main Widget Component
 * Powered by Lovable AI Gateway (Gemini 3 Flash)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CatyContext } from './types';
import { useCatySession } from './useCatySession';
import { useCatyToast } from './useCatyToast';
import { CatyHeader } from './CatyHeader';
import { CatyContextBar } from './CatyContextBar';
import { CatyMessageComponent } from './CatyMessage';
import { CatyThinking } from './CatyThinking';
import { CatyInputArea } from './CatyInputArea';
import { CatySuggestionsBar } from './CatySuggestionsBar';
import { CatyEmpty } from './CatyEmpty';
import { CatyHistoryPanel } from './CatyHistoryPanel';
import { CatyBackdrop } from './CatyBackdrop';
import { RESPONSES } from './responses';
import { NextAction } from './schema';
import './CatyWidget.css';
import './CatyAnswerCard.css';
import './CatyOverrides.css';

interface CatyWidgetProps {
  initialContext?: CatyContext;
  onAction?: (action: string) => void;
  onClose?: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/caty-ai-chat`;

// Sanitize malformed AI responses and wrap in proper HTML
const sanitizeResponse = (response: string): string => {
  // If response doesn't contain any caty- classes, wrap it
  if (!response.includes('class="caty-')) {
    // Check for common error patterns
    if (
      response.includes('Unable to') ||
      response.includes('no resource') ||
      response.includes('Data: unknown') ||
      response.includes('cannot provide') ||
      response.includes("don't have") ||
      response.includes('not available')
    ) {
      return `
<div class="caty-bubble">
  <p>I couldn't find data for that query. Please try one of these:</p>
</div>
<div class="caty-data-card">
  <div class="caty-data-card-header info">
    <span class="caty-data-card-title">Available Queries</span>
  </div>
  <div class="caty-data-card-body">
    <div class="caty-data-row">
      <div class="caty-data-info">
        <div class="caty-data-name">Show all resources</div>
        <div class="caty-data-meta">View complete resource inventory</div>
      </div>
    </div>
    <div class="caty-data-row">
      <div class="caty-data-info">
        <div class="caty-data-name">Show expiring contracts</div>
        <div class="caty-data-meta">Contracts ending within 30 days</div>
      </div>
    </div>
    <div class="caty-data-row">
      <div class="caty-data-info">
        <div class="caty-data-name">Off-shore teams</div>
        <div class="caty-data-meta">Resources by country</div>
      </div>
    </div>
  </div>
</div>`;
    }

    // Wrap plain text in bubble
    return `<div class="caty-bubble"><p>${response}</p></div>`;
  }

  // Remove any "Data: unknown" or "Confidence" text
  return response
    .replace(/Data:\s*unknown/gi, '')
    .replace(/Confidence:\s*\w+/gi, '')
    .replace(/<p>\s*<\/p>/g, '');
};

export function CatyWidget({ initialContext, onAction, onClose }: CatyWidgetProps) {
  const defaultContext: CatyContext = {
    department: 'All Departments',
    period: 'Q1 2026',
    location: 'All Locations',
  };

  const {
    messages,
    addMessage,
    updateLastAssistantMessage,
    saveSession,
    loadSession,
    getSessions,
    clearHistory,
    newSession,
    context,
    setContext,
  } = useCatySession(initialContext || defaultContext);

  const [isMinimized, setIsMinimized] = useState(false);

  const { showToast } = useCatyToast();
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [failedQueries, setFailedQueries] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connection restored');
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) saveSession();
  }, [messages, saveSession]);

  useEffect(() => {
    (window as any).catyAction = (action: string) => {
      onAction?.(action);
      showToast('Action initiated');
    };
    return () => {
      delete (window as any).catyAction;
    };
  }, [onAction, showToast]);

  const streamChat = async (userMessage: string) => {
    try {
      const allMessages = [
        ...messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: userMessage }
      ];

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: allMessages,
          context: {
            department: context.department,
            period: context.period,
            location: context.location
          }
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          showToast('Rate limit exceeded, please try again later.');
          return false;
        }
        if (resp.status === 402) {
          showToast('Usage limit reached. Please add credits.');
          return false;
        }
        throw new Error('Failed to start stream');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      // Create initial assistant message
      addMessage('assistant', '');

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            // Final update - sanitize and mark as HTML
            const cleanResponse = sanitizeResponse(assistantContent);
            updateLastAssistantMessage(cleanResponse, true);
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateLastAssistantMessage(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') {
            // Final update - sanitize and mark as HTML
            const cleanResponse = sanitizeResponse(assistantContent);
            updateLastAssistantMessage(cleanResponse, true);
            continue;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateLastAssistantMessage(assistantContent, true);
            }
          } catch { /* ignore */ }
        }
      }

      // Ensure final message is sanitized and marked as HTML
      if (assistantContent) {
        const cleanResponse = sanitizeResponse(assistantContent);
        updateLastAssistantMessage(cleanResponse, true);
      }

      return true;
    } catch (error) {
      console.error('Stream error:', error);
      return false;
    }
  };

  const handleSend = async (text: string) => {
    addMessage('user', text);
    setIsTyping(true);

    const success = await streamChat(text);
    
    if (!success) {
      // Fallback to keyword matching if AI fails
      processQueryFallback(text);
    }
    
    setIsTyping(false);
  };

  // Handle action button clicks from structured responses
  const handleActionClick = useCallback((action: NextAction) => {
    const actionPrompts: Record<string, string> = {
      'utilization_breakdown': 'Show me the detailed utilization breakdown',
      'show_allocations': 'Show all current allocations',
      'show_assignments': 'Show all assignments for this resource',
      'show_expiring_contracts': 'Show contracts expiring soon',
      'show_similar_resources': 'Find similar available resources',
      'generate_report': 'Generate a capacity report',
      'extend_contract': 'Help me extend this contract',
      'assign_resource': 'Help me assign this resource',
    };
    
    const prompt = actionPrompts[action.action_key] || action.label;
    handleSend(prompt);
    showToast(`Action: ${action.label}`);
  }, [showToast]);

  const processQueryFallback = (text: string) => {
    const l = text.toLowerCase();
    let responded = false;

    if (l.includes('forecast') || l.includes('q2') || l.includes('utilization')) {
      addMessage('assistant', RESPONSES.forecast(context.department, 'Q2 2026'), true);
      responded = true;
    } else if (l.includes('expiring') || l.includes('contract') || l.includes('ending')) {
      addMessage('assistant', RESPONSES.contracts(), true);
      responded = true;
    } else if (l.includes('.net') || l.includes('available') || l.includes('replacement') || l.includes('resource')) {
      addMessage('assistant', RESPONSES.resources(), true);
      responded = true;
    }

    if (!responded) {
      addMessage('assistant', RESPONSES.fallback(text));
      setFailedQueries(prev => prev + 1);
    } else {
      setFailedQueries(0);
    }
  };

  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleClose = useCallback(() => {
    setIsPanelOpen(false);
    onClose?.();
  }, [onClose]);

  if (!isPanelOpen) return null;

  // Minimized state - show Catalyst Hub convergence icon (exact SVG spec)
  if (isMinimized) {
    return (
      <button 
        className="caty-minimized-btn"
        onClick={() => setIsMinimized(false)}
        title="Open CATY AI"
        aria-label="Open CATY AI"
      >
        <div className="caty-minimized-icon">
          {/* Catalyst Convergence Hub Logo - Reversed (White) */}
          <svg viewBox="0 0 100 100" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
            {/* Connection lines */}
            <line x1="50" y1="50" x2="22" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="50" y1="50" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="50" y1="50" x2="22" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="50" y1="50" x2="78" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
            {/* Outer nodes */}
            <circle cx="22" cy="22" r="12" fill="white"/>
            <circle cx="78" cy="22" r="12" fill="white"/>
            <circle cx="22" cy="78" r="12" fill="white"/>
            <circle cx="78" cy="78" r="12" fill="white"/>
            {/* Center hub */}
            <circle cx="50" cy="50" r="18" fill="white"/>
            <circle cx="50" cy="50" r="9" fill="#2563eb"/>
          </svg>
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop overlay */}
      <CatyBackdrop 
        isOpen={isPanelOpen} 
        onClose={handleClose} 
      />
      
      {/* Panel container */}
      <div className="caty-widget-container">
        <div className="caty-widget">
          <div className="caty-panel">
            {!isOnline && (
              <div className="caty-offline">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                </svg>
                <span>Connection lost. Attempting to reconnect...</span>
              </div>
            )}

            <CatyHeader 
              isOnline={isOnline} 
              onClose={handleClose} 
              onClearChat={() => {
                newSession();
                showToast('Chat cleared');
              }}
              onMinimize={() => setIsMinimized(true)}
            />

            <CatyContextBar 
              context={context} 
              onDepartmentChange={(dept) => setContext(prev => ({ ...prev, department: dept }))}
            />

            <div className="caty-messages">
              {messages.length === 0 ? (
                <CatyEmpty onSuggestionClick={handleSend} />
              ) : (
                <>
                  {messages.map(msg => (
                    <CatyMessageComponent 
                      key={msg.id} 
                      message={msg} 
                      onAction={handleActionClick}
                      onDrillDown={(type, params) => {
                        // Handle drill-down by sending a new query
                        if (type === 'country' && params.country_name) {
                          handleSend(`Show resources in ${params.country_name}`);
                        }
                      }}
                    />
                  ))}
                  {isTyping && <CatyThinking />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <CatySuggestionsBar onSend={handleSend} />

            <CatyInputArea onSend={handleSend} disabled={!isOnline || isTyping} />

            <CatyHistoryPanel
              isOpen={isHistoryOpen}
              sessions={getSessions()}
              onClose={() => setIsHistoryOpen(false)}
              onLoad={id => {
                loadSession(id);
                setIsHistoryOpen(false);
                showToast('Conversation loaded');
              }}
              onClear={() => {
                clearHistory();
                showToast('History cleared');
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
