/**
 * Catalyst AI Assistant Panel - Premium conversational AI interface
 * 
 * IMPORTANT: This is a UI-only redesign. All business logic, API calls,
 * and state management should be preserved when integrating.
 */

import React from 'react';
import { X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIPriorityCard } from './AIPriorityCard';
import { AINextItem } from './AINextItem';
import { AIProgressCard } from './AIProgressCard';
import { AISuggestion } from './AISuggestion';
import { AIGreeting } from './AIGreeting';

export interface AIPriorityItem {
  id: string;
  key: string;
  title: string;
  aiReason: string;
  timeLeft: string;
  updatedAt: string;
  status?: 'danger' | 'warning' | 'success';
}

export interface AINextItemData {
  id: string;
  key: string;
  title: string;
  aiContext: string;
}

export interface AIStats {
  closed: number;
  percentChange: number;
  slaRate: number;
  personalBest: number;
  ops: number;
  del: number;
  pln: number;
}

export interface AISuggestionData {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface CatalystAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  criticalCount?: number;
  priorityItem?: AIPriorityItem;
  nextItems?: AINextItemData[];
  stats?: AIStats;
  suggestions?: AISuggestionData[];
  onItemClick?: (id: string) => void;
  onStartTask?: (id: string) => void;
}

export function CatalystAIPanel({
  isOpen,
  onClose,
  userName = 'there',
  criticalCount = 0,
  priorityItem,
  nextItems = [],
  stats,
  suggestions = [],
  onItemClick,
  onStartTask,
}: CatalystAIPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-[99] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 w-[360px] h-screen bg-card border-l border-border z-[100]",
          "flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Premium Dark Header */}
        <header className="flex items-center justify-between px-5 py-4 bg-primary">
          <div className="flex items-center gap-3">
            {/* AI Avatar */}
            <div className="w-9 h-9 bg-primary-foreground/20 rounded-[10px] flex items-center justify-center shadow-md">
              <Zap className="w-[18px] h-[18px] text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-primary-foreground">Catalyst AI</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/60">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Analyzing your work
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-7 h-7 bg-primary-foreground/10 rounded-md flex items-center justify-center text-primary-foreground/60 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-muted/30">
          {/* Greeting */}
          <AIGreeting userName={userName} criticalCount={criticalCount} />

          {/* Priority Card - Start Here */}
          {priorityItem && (
            <section className="mb-6">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                Start here
              </h3>
              <AIPriorityCard
                item={priorityItem}
                onClick={() => onItemClick?.(priorityItem.id)}
                onStartTask={() => onStartTask?.(priorityItem.id)}
              />
            </section>
          )}

          {/* Next Up Items */}
          {nextItems.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                Then
              </h3>
              {nextItems.map((item, index) => (
                <AINextItem
                  key={item.id}
                  item={item}
                  index={index + 2}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </section>
          )}

          {/* Progress Card */}
          {stats && (
            <section className="mb-6">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                Your week
              </h3>
              <AIProgressCard stats={stats} />
            </section>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                I can help with
              </h3>
              {suggestions.map((suggestion) => (
                <AISuggestion
                  key={suggestion.id}
                  icon={suggestion.icon}
                  label={suggestion.label}
                  onClick={suggestion.onClick}
                />
              ))}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
