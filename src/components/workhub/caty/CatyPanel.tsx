/**
 * CatyPanel — AI Assistant side panel
 * Slides in from right, 380px wide, contains Insights + Chat tabs
 */

import { useState } from 'react';
import { X, Lightbulb, MessageSquare } from 'lucide-react';
import { CatyInsightsTab } from './CatyInsightsTab';
import { CatyChatTab } from './CatyChatTab';

interface CatyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CatyPanel({ isOpen, onClose }: CatyPanelProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 z-[calc(var(--wh-z-caty)-1)] bg-black/20 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-screen bg-white border-l flex flex-col shadow-xl animate-in slide-in-from-right duration-200"
        style={{
          width: 'var(--wh-caty-width)',
          borderColor: 'var(--wh-border)',
          zIndex: 'var(--wh-z-caty)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-4 border-b"
          style={{ borderColor: 'var(--wh-border)' }}
        >
          <div className="flex-1 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1D4ED8)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-sm font-bold"
                style={{ color: 'var(--wh-text-primary)', fontFamily: 'var(--cp-font-heading)' }}
              >
                Caty AI
              </h2>
              <p
                className="text-xs"
                style={{ color: 'var(--wh-text-tertiary)' }}
              >
                AI-powered portfolio intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--wh-text-secondary)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: 'var(--wh-border)' }}
        >
          <button
            onClick={() => setActiveTab('insights')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors"
            style={{
              borderBottomColor:
                activeTab === 'insights'
                  ? 'var(--wh-primary)'
                  : 'transparent',
              color:
                activeTab === 'insights'
                  ? 'var(--wh-primary)'
                  : 'var(--wh-text-secondary)',
              backgroundColor: activeTab === 'insights' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
            }}
          >
            <Lightbulb className="w-4 h-4" />
            Insights
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors"
            style={{
              borderBottomColor:
                activeTab === 'chat' ? 'var(--wh-primary)' : 'transparent',
              color:
                activeTab === 'chat'
                  ? 'var(--wh-primary)'
                  : 'var(--wh-text-secondary)',
              backgroundColor: activeTab === 'chat' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
            }}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'insights' && <CatyInsightsTab />}
          {activeTab === 'chat' && <CatyChatTab />}
        </div>
      </div>
    </>
  );
}
