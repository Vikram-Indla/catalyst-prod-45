/**
 * AIIntelligencePanel — Resource 360° AI Intelligence Side Panel
 * LINEAR PRECISION design (9.5/10 contrast)
 * 55% width, max 840px, slide-right animation
 */
import React, { useCallback, useEffect, useRef } from 'react';
import '@/styles/ai-intelligence.css';
import { StoryTeaser } from './ai-intelligence/StoryTeaser';
import { ResourcePattern } from './ai-intelligence/ResourcePattern';
import { HubClosures } from './ai-intelligence/HubClosures';
import { DeliveryBacklog } from './ai-intelligence/DeliveryBacklog';
import { BehavioralPatterns } from './ai-intelligence/BehavioralPatterns';
import { WeeklyStory } from './ai-intelligence/WeeklyStory';
import { StoryBeacon } from './ai-intelligence/StoryBeacon';
import {
  useResourceInfo,
  useHubClosures,
  useDeliveryBacklog,
  useAIPatterns,
  useStalenessLabel,
  useAIActions,
} from '@/hooks/useAIIntelligence';
import { useWeeklyStory } from '@/hooks/useWeeklyStory';
import { getWeekNumber } from '@/constants/r360WeekConfig';

interface Props {
  resourceId: string;
  onClose: () => void;
}

const AIIntelligencePanel: React.FC<Props> = ({ resourceId, onClose }) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { data: resource } = useResourceInfo(resourceId);
  const { data: hubClosures = [] } = useHubClosures(resourceId, resource?.jira_account_id);
  const { data: backlogData } = useDeliveryBacklog(resourceId, resource?.jira_account_id);
  const { data: patternData } = useAIPatterns(resourceId);
  const { data: stalenessLabel } = useStalenessLabel(resourceId);
  const { syncData, refreshAI, syncing, generating } = useAIActions(resourceId, resource?.jira_account_id);
  const { storyData, isLoading: storyLoading, selectedDate, onPrevWeek, onNextWeek } = useWeeklyStory(resourceId, resource?.jira_account_id);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const scrollToStory = useCallback(() => {
    const el = document.getElementById('weeklyStory');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      // Blue flash
      el.style.background = 'var(--rai-primary-bg)';
      setTimeout(() => { el.style.background = ''; }, 1200);
    }
  }, []);

  const initials = resource?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';
  const weekNum = getWeekNumber(selectedDate);

  return (
    <div data-module="ai-intelligence">
      {/* Backdrop */}
      <div className="rai-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="rai-panel">
        {/* Top bar */}
        <div className="rai-topbar">
          <button className="rai-topbar-btn" onClick={onClose}>← Back</button>
          <div style={{ flex: 1 }} />
          {stalenessLabel && (
            <span style={{ fontSize: 11, color: 'var(--rai-ink-muted)', fontFamily: 'var(--rai-font-mono)' }}>
              Data: {stalenessLabel}
            </span>
          )}
          <button className="rai-topbar-btn" onClick={syncData} disabled={syncing}>
            {syncing ? '⏳ Syncing…' : '🔄 Sync'}
          </button>
          <button className="rai-topbar-btn rai-primary-btn" onClick={refreshAI} disabled={generating}>
            {generating ? '⏳ Generating…' : '✨ Refresh AI'}
          </button>
          <button className="rai-topbar-btn" onClick={onClose}>✕</button>
        </div>

        {/* Identity bar */}
        <div className="rai-identity">
          <div className="rai-avatar">{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="rai-name">{resource?.full_name || 'Loading…'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="rai-role-subtitle">{resource?.role_name || 'Team Member'}</span>
              <span className="rai-rid-badge">{resource?.rid || ''}</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="rai-body" ref={bodyRef}>
          {/* Story Teaser */}
          <StoryTeaser
            hook={storyData?.hookEn || 'Loading weekly story…'}
            weekNumber={weekNum}
            closed={storyData?.kpis.closed || 0}
            inReview={storyData?.kpis.inReview || 0}
            remaining={storyData?.kpis.remaining || 0}
            onScrollToStory={scrollToStory}
          />

          {/* Resource Pattern */}
          <ResourcePattern
            summary={patternData?.summary || null}
            warning={patternData?.warning || null}
          />

          {/* Hub Closures */}
          <HubClosures data={hubClosures} />

          {/* Delivery Backlog */}
          <DeliveryBacklog
            metrics={backlogData?.metrics || { avgSubtaskDays: null, avgStoryDays: null, avgBugDays: null, pickupSpeedHours: null }}
            hubs={backlogData?.hubs || []}
          />

          {/* Behavioral Patterns */}
          <BehavioralPatterns insights={patternData?.insights || []} />

          {/* Weekly Story */}
          <WeeklyStory
            data={storyData}
            selectedDate={selectedDate}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            isLoading={storyLoading}
          />
        </div>

        {/* Story Beacon */}
        <StoryBeacon
          hook={storyData?.hookEn || ''}
          onScrollToStory={scrollToStory}
        />
      </div>
    </div>
  );
};

export default AIIntelligencePanel;
