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
  // Try to parse structured response for assistant messages
  const structuredResponse = useMemo(() => {
    if (message.type !== 'assistant' || message.isHtml) {
      return null;
    }
    return parseStructuredResponse(message.content);
  }, [message.content, message.type, message.isHtml]);

  const renderContent = () => {
    // HTML content (legacy fallback responses)
    if (message.isHtml) {
      return <div dangerouslySetInnerHTML={{ __html: message.content }} />;
    }

    // Structured JSON response
    if (structuredResponse) {
      return (
        <CatyAnswerCard 
          response={structuredResponse} 
          onAction={onAction}
        />
      );
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
