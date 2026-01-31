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

// Part 2: Main component will be added below
