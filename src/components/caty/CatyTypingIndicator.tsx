/**
 * Caty V4 — Typing Indicator
 * Animated dots showing AI is processing
 */

import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';

export function CatyTypingIndicator() {
  return (
    <div className="caty-message ai" role="status" aria-label="Caty is typing">
      <div className="caty-message-avatar">
        <img 
          src={catalystLogoWhite} 
          alt="" 
          className="w-5 h-5"
        />
      </div>
      <div className="caty-message-content">
        <div className="caty-message-bubble">
          <div className="caty-typing">
            <span className="caty-typing-dot" style={{ animationDelay: '0s' }} />
            <span className="caty-typing-dot" style={{ animationDelay: '0.2s' }} />
            <span className="caty-typing-dot" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
