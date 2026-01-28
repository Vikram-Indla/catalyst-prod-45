/**
 * Caty V4 — Message Components
 * AI and User message bubbles with actions
 */

import { Copy, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';
import { cn } from '@/lib/utils';
import type { ChatMessage } from './types';

interface CatyMessageProps {
  message: ChatMessage;
  userInitials?: string;
  onCopy?: (content: string) => void;
  onRefresh?: () => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
}

export function CatyMessageBubble({ 
  message, 
  userInitials = 'U',
  onCopy,
  onRefresh,
  onFeedback
}: CatyMessageProps) {
  const isUser = message.type === 'user';
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const formattedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  return (
    <div className={cn("caty-message", isUser ? "user" : "ai")}>
      <div className="caty-message-avatar">
        {isUser ? (
          <span>{userInitials}</span>
        ) : (
          <img 
            src={catalystLogoWhite} 
            alt="" 
            className="w-5 h-5"
          />
        )}
      </div>
      
      <div className="caty-message-content">
        <div className="caty-message-bubble">
          {renderContent(message.content)}
        </div>
        
        <div className="caty-message-meta">
          <span className="caty-message-time">
            {formatTime(message.timestamp)}
          </span>
          
          {!isUser && (
            <div className="caty-message-actions">
              {onCopy && (
                <button 
                  className="caty-message-action"
                  onClick={() => onCopy(message.content)}
                  aria-label="Copy message"
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </button>
              )}
              {onRefresh && (
                <button 
                  className="caty-message-action"
                  onClick={onRefresh}
                  aria-label="Refresh response"
                >
                  <RefreshCw size={12} />
                </button>
              )}
              
              {onFeedback && (
                <div className="caty-feedback-btns">
                  <button 
                    className={cn(
                      "caty-feedback-btn",
                      message.feedback === 'positive' && "selected positive"
                    )}
                    onClick={() => onFeedback(message.id, 'positive')}
                    aria-label="Good response"
                    aria-pressed={message.feedback === 'positive'}
                  >
                    <ThumbsUp size={12} />
                  </button>
                  <button 
                    className={cn(
                      "caty-feedback-btn",
                      message.feedback === 'negative' && "selected negative"
                    )}
                    onClick={() => onFeedback(message.id, 'negative')}
                    aria-label="Bad response"
                    aria-pressed={message.feedback === 'negative'}
                  >
                    <ThumbsDown size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
