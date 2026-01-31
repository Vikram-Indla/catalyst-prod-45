/**
 * Caty AI V7 — Message Component
 * Enhanced with structured response rendering and markdown support
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { CatyMessage } from './types';
import { HubIcon } from './constants';
import { CatyAnswerCard } from './CatyAnswerCard';
import { parseStructuredResponse, NextAction } from './schema';

interface CatyMessageProps {
  message: CatyMessage;
  userInitials?: string;
  onAction?: (action: NextAction) => void;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return `Today, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const CatyMessageComponent: React.FC<CatyMessageProps> = ({ 
  message, 
  userInitials = 'VK',
  onAction 
}) => {
  // Detect if this is a streaming/incomplete JSON response
  const streamingState = useMemo(() => {
    if (message.type !== 'assistant' || message.isHtml) {
      return { isStreaming: false, isJsonResponse: false };
    }
    
    const content = message.content.trim();
    
    // Check if it looks like it's starting to be JSON
    const startsWithJson = content.startsWith('{') || content.startsWith('```json');
    
    // Check if brackets are balanced (complete JSON)
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const isComplete = openBraces > 0 && openBraces === closeBraces;
    
    return {
      isStreaming: startsWithJson && !isComplete,
      isJsonResponse: startsWithJson
    };
  }, [message.content, message.type, message.isHtml]);

  // Try to parse structured response for assistant messages
  const structuredResponse = useMemo(() => {
    if (message.type !== 'assistant' || message.isHtml) {
      return null;
    }
    
    const content = message.content.trim();
    
    // Skip empty or very short content
    if (!content || content.length < 20) {
      return null;
    }
    
    // Don't try to parse if we're still streaming JSON
    if (streamingState.isStreaming) {
      return null;
    }
    
    // Check if it looks like JSON (starts with { and ends with })
    const isJsonLike = content.startsWith('{') && content.endsWith('}');
    
    // Also check for JSON wrapped in markdown code block
    const hasJsonBlock = content.includes('```json') || content.includes('```');
    
    if (!isJsonLike && !hasJsonBlock) {
      return null;
    }
    
    const parsed = parseStructuredResponse(content);
    
    // Debug logging
    if (!parsed && isJsonLike) {
      console.log('[CatyMessage] Failed to parse JSON-like content:', content.substring(0, 200));
    }
    
    return parsed;
  }, [message.content, message.type, message.isHtml, streamingState.isStreaming]);

  // INVASIVE FIX: Detect if content contains caty HTML classes
  const containsCatyHtml = useMemo(() => {
    if (message.type !== 'assistant') return false;
    const content = message.content;
    // Check for any caty- class patterns or HTML tags with caty classes
    return content.includes('class="caty-') || 
           content.includes("class='caty-") ||
           content.includes('caty-bubble') ||
           content.includes('caty-metrics-row') ||
           content.includes('caty-data-card') ||
           content.includes('caty-data-row') ||
           content.includes('caty-metric-card');
  }, [message.content, message.type]);

  const renderContent = () => {
    // INVASIVE FIX: Force HTML rendering if content contains caty classes
    // This catches cases where isHtml flag wasn't properly set
    if (message.isHtml || containsCatyHtml) {
      return (
        <div 
          className="caty-response-html"
          dangerouslySetInnerHTML={{ __html: message.content }} 
        />
      );
    }

    // Show processing state while JSON is streaming (incomplete)
    if (streamingState.isStreaming && streamingState.isJsonResponse) {
      return (
        <div className="caty-bubble" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '16px 20px'
        }}>
          <div className="caty-processing-spinner" style={{
            width: '18px',
            height: '18px',
            border: '2px solid var(--caty-border-subtle)',
            borderTopColor: 'var(--caty-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--caty-text-primary)', marginBottom: '4px' }}>
              Querying capacity data...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--caty-text-secondary)' }}>
              Analyzing resources across departments
            </div>
          </div>
        </div>
      );
    }

    // Structured JSON response - render as card
    if (structuredResponse) {
      return (
        <CatyAnswerCard 
          response={structuredResponse} 
          onAction={onAction}
        />
      );
    }
    
    // Check if content looks like JSON but failed to parse - try one more time
    const msgContent = message.content.trim();
    if (message.type === 'assistant' && msgContent.startsWith('{') && msgContent.endsWith('}')) {
      // Last-ditch attempt to parse and render
      try {
        const directParsed = JSON.parse(msgContent);
        if (directParsed.response_type === 'general_answer' || directParsed.response_type === 'resource_answer') {
          console.log('[CatyMessage] Direct parse succeeded where structured parse failed');
          return (
            <CatyAnswerCard 
              response={directParsed} 
              onAction={onAction}
            />
          );
        }
      } catch (e) {
        // Don't show raw JSON - wrap in error card
        console.log('[CatyMessage] Direct JSON parse failed, showing fallback');
      }
    }

    // Regular text/markdown content
    if (message.type === 'assistant') {
      return (
        <div className="caty-bubble caty-markdown-content">
          <ReactMarkdown
            components={{
              // Custom heading styles
              h1: ({ children }) => (
                <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', marginTop: '16px' }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px', marginTop: '14px' }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '12px' }}>
                  {children}
                </h3>
              ),
              // Custom paragraph
              p: ({ children }) => (
                <p style={{ marginBottom: '10px', lineHeight: 1.6 }}>{children}</p>
              ),
              // Custom list styles
              ul: ({ children }) => (
                <ul style={{ marginBottom: '12px', paddingLeft: '20px', listStyleType: 'disc' }}>
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol style={{ marginBottom: '12px', paddingLeft: '20px', listStyleType: 'decimal' }}>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: '4px', lineHeight: 1.5 }}>{children}</li>
              ),
              // Strong/bold
              strong: ({ children }) => (
                <strong style={{ fontWeight: 600, color: 'var(--caty-text-primary)' }}>{children}</strong>
              ),
              // Code blocks
              code: ({ className, children }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code style={{ 
                      background: 'var(--caty-surface-card)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code style={{ 
                    display: 'block',
                    background: 'var(--caty-surface-card)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    marginBottom: '12px'
                  }}>
                    {children}
                  </code>
                );
              },
              // Tables
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    background: 'var(--caty-surface-card)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead style={{ background: 'var(--caty-surface-page)' }}>{children}</thead>
              ),
              th: ({ children }) => (
                <th style={{ 
                  textAlign: 'left', 
                  padding: '10px 12px', 
                  fontWeight: 600,
                  borderBottom: '1px solid var(--caty-border-subtle)'
                }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td style={{ 
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--caty-border-subtle)'
                }}>
                  {children}
                </td>
              ),
              // Blockquote
              blockquote: ({ children }) => (
                <blockquote style={{ 
                  borderLeft: '3px solid var(--caty-accent)',
                  paddingLeft: '12px',
                  marginLeft: 0,
                  marginBottom: '12px',
                  color: 'var(--caty-text-secondary)',
                  fontStyle: 'italic'
                }}>
                  {children}
                </blockquote>
              ),
              // Horizontal rule
              hr: () => (
                <hr style={{ 
                  border: 'none',
                  borderTop: '1px solid var(--caty-border-subtle)',
                  margin: '16px 0'
                }} />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }

    // User message - plain text
    return (
      <div className="caty-bubble">
        <p>{message.content}</p>
      </div>
    );
  };

  return (
    <div className={`caty-message ${message.type}`}>
      <div className={`caty-avatar ${message.type}`}>
        {message.type === 'assistant' ? <HubIcon /> : userInitials}
      </div>
      <div className="caty-msg-body">
        {renderContent()}
        <span className="caty-msg-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
};
