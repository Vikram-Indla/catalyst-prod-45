import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Minus, Paperclip, Send } from 'lucide-react';
import './CatyWidget.css';
import { useCatySession } from './hooks/useCatySession';
import { useCatyToast } from './hooks/useCatyToast';
import { CATY_RESPONSES } from './responses';
import { CatyMessage, CatyContext, CatySession } from './types';

const HubIcon = () => (
  <svg viewBox="0 0 100 100" fill="none">
    <line x1="50" y1="50" x2="22" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
    <line x1="50" y1="50" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
    <line x1="50" y1="50" x2="22" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
    <line x1="50" y1="50" x2="78" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="22" cy="22" r="12" fill="white"/>
    <circle cx="78" cy="22" r="12" fill="white"/>
    <circle cx="22" cy="78" r="12" fill="white"/>
    <circle cx="78" cy="78" r="12" fill="white"/>
    <circle cx="50" cy="50" r="18" fill="white"/>
    <circle cx="50" cy="50" r="9" fill="#2563eb"/>
  </svg>
);

const CatyHeader = ({ onHistory, onEscalate, isOnline }: { onHistory: () => void; onEscalate: () => void; isOnline: boolean }) => (
  <header className="caty-header">
    <div className="caty-header-left">
      <div className="caty-header-icon"><HubIcon /></div>
      <div>
        <div className="caty-header-title">Caty AI</div>
        <div className="caty-header-subtitle">
          <span className={`caty-status-dot ${!isOnline ? 'offline' : ''}`} />
          <span>Capacity Intelligence Assistant</span>
        </div>
      </div>
    </div>
    <div className="caty-header-actions">
      <button className="caty-header-btn" onClick={onHistory} aria-label="History"><Clock size={22} /></button>
      <button className="caty-header-btn escalate" onClick={onEscalate} aria-label="Escalate"><Users size={22} /></button>
      <button className="caty-header-btn" aria-label="Minimize"><Minus size={22} /></button>
    </div>
  </header>
);

const CatyContextBar = ({ context }: { context: CatyContext }) => (
  <div className="caty-context-bar">
    <span className="caty-context-label">Context:</span>
    <div className="caty-context-tags">
      <span className="caty-context-tag active">{context.department}</span>
      <span className="caty-context-tag">{context.period}</span>
      <span className="caty-context-tag">{context.view}</span>
    </div>
  </div>
);

const formatTime = (ts: string) => {
  const d = new Date(ts);
  return `Today, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const CatyMessageItem = ({ msg }: { msg: CatyMessage }) => (
  <div className={`caty-message ${msg.type}`}>
    <div className={`caty-avatar ${msg.type}`}>
      {msg.type === 'assistant' ? <HubIcon /> : 'VK'}
    </div>
    <div className="caty-msg-body">
      {msg.isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
      ) : (
        <div className="caty-bubble"><p>{msg.content}</p></div>
      )}
      <span className="caty-msg-time">{formatTime(msg.timestamp)}</span>
    </div>
  </div>
);

const CatyTyping = () => (
  <div className="caty-message assistant">
    <div className="caty-avatar assistant"><HubIcon /></div>
    <div className="caty-msg-body">
      <div className="caty-typing">
        <div className="caty-typing-dot" />
        <div className="caty-typing-dot" />
        <div className="caty-typing-dot" />
      </div>
    </div>
  </div>
);

const CatyEmpty = ({ onSend }: { onSend: (t: string) => void }) => (
  <div className="caty-empty">
    <div className="caty-empty-icon"><HubIcon /></div>
    <h3>Caty AI</h3>
    <p>Capacity Intelligence Assistant</p>
    <div className="caty-empty-suggestions">
      <p className="caty-empty-label">Suggested queries</p>
      <button onClick={() => onSend('Show Q2 capacity forecast for Delivery')}>Show Q2 capacity forecast for Delivery</button>
      <button onClick={() => onSend('List expiring contracts this month')}>List expiring contracts this month</button>
      <button onClick={() => onSend('Find available .NET developers')}>Find available .NET developers</button>
    </div>
  </div>
);

const CatySuggestions = ({ onSend, onEscalate }: { onSend: (t: string) => void; onEscalate: () => void }) => (
  <div className="caty-suggestions">
    <button className="caty-suggestion alert" onClick={() => onSend('Show expiring contracts')}>View Expiring Contracts</button>
    <button className="caty-suggestion" onClick={() => onSend('Find available .NET developers')}>Find .NET Resources</button>
    <button className="caty-suggestion" onClick={() => onSend('Show Q2 capacity forecast')}>Q2 Forecast</button>
    <button className="caty-suggestion escalate" onClick={onEscalate}>Connect to Specialist</button>
  </div>
);

const CatyInput = ({ onSend, disabled }: { onSend: (t: string) => void; disabled: boolean }) => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    setValue(ta.value);
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      if (ref.current) ref.current.style.height = 'auto';
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="caty-input-area">
      <div className="caty-input-wrapper">
        <button className="caty-input-btn" aria-label="Attach"><Paperclip size={22} /></button>
        <div className="caty-input-field">
          <textarea ref={ref} value={value} onChange={handleChange} onKeyDown={handleKey} placeholder="Ask about capacity, contracts, or resource allocation..." rows={1} />
        </div>
        <button className="caty-send-btn" onClick={handleSend} disabled={!value.trim() || disabled} aria-label="Send"><Send size={22} /></button>
      </div>
    </div>
  );
};

const getPreview = (s: CatySession) => {
  const last = s.messages.filter(m => m.type === 'user').pop();
  const t = last?.content.replace(/<[^>]*>/g, '') || 'No messages';
  return t.substring(0, 50) + (t.length > 50 ? '...' : '');
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const CatyHistory = ({ isOpen, sessions, onClose, onLoad, onClear }: { isOpen: boolean; sessions: CatySession[]; onClose: () => void; onLoad: (id: string) => void; onClear: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="caty-history">
      <div className="caty-history-header">
        <h2>Conversation History</h2>
        <button className="caty-close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="caty-history-list">
        {sessions.length === 0 ? (
          <div className="caty-history-empty">No previous conversations</div>
        ) : sessions.map(s => (
          <div key={s.id} className="caty-history-item" onClick={() => onLoad(s.id)}>
            <div className="caty-history-title">{s.context.department}</div>
            <div className="caty-history-preview">{getPreview(s)}</div>
            <div className="caty-history-date">{formatDate(s.updated)}</div>
          </div>
        ))}
      </div>
      <div className="caty-history-actions"><button onClick={onClear}>Clear All History</button></div>
    </div>
  );
};

// Part 3: Main CatyWidget component will be added below
