/**
 * AIIntelligencePanel — Resource 360° AI Intelligence Side Panel
 * LINEAR PRECISION design (9.5/10 contrast)
 * 55% width, max 840px, slide-right animation
 * Auto-triggers AI generation if no cached profile exists.
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
  useAutoGenerateIfMissing,
} from '@/hooks/useAIIntelligence';
import { useWeeklyStory } from '@/hooks/useWeeklyStory';
import { getWeekNumber } from '@/constants/r360WeekConfig';
import { getAvatarColor } from '@/types/initiative';

interface Props {
  resourceId: string;
  onClose: () => void;
}

const AIIntelligencePanel: React.FC<Props> = ({ resourceId, onClose }) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { data: resource, isLoading: resourceLoading } = useResourceInfo(resourceId);
  const { data: hubClosures = [] } = useHubClosures(resourceId, resource?.jira_account_id);
  const { data: backlogData } = useDeliveryBacklog(resourceId, resource?.jira_account_id);
  const { data: patternData } = useAIPatterns(resourceId);
  const { data: stalenessLabel } = useStalenessLabel(resourceId);
  const { syncData, refreshAI, syncing, generating } = useAIActions(resourceId, resource?.jira_account_id);
  const { storyData, isLoading: storyLoading, selectedDate, onPrevWeek, onNextWeek } = useWeeklyStory(resourceId, resource?.jira_account_id);

  // Auto-trigger AI generation if no profile exists
  const { autoGenerating } = useAutoGenerateIfMissing(resourceId, resource?.jira_account_id);
  const isGenerating = generating || autoGenerating;

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
      el.style.background = 'var(--rai-primary-bg)';
      setTimeout(() => { el.style.background = ''; }, 1200);
    }
  }, []);

  const name = resource?.full_name || '';
  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  const weekNum = getWeekNumber(selectedDate);
  const avatarBg = name ? getAvatarColor(name) : '#2563EB';
  const avatarUrl = resource?.avatar_url || null;

  const noAIData = !patternData?.summary && !patternData?.insights?.length;

  return (
    <div data-module="ai-intelligence">
      {/* Backdrop */}
      <div className="rai-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="rai-panel">
        {/* Top bar */}
        <div className="rai-topbar">
          <button className="rai-topbar-btn" onClick={onClose}>← Back to Resources</button>
          <div style={{ flex: 1 }} />
          {stalenessLabel && (
            <span style={{ fontSize: 11, color: 'var(--rai-ink-muted)', fontFamily: 'var(--rai-font-mono)' }}>
              Data: {stalenessLabel}
            </span>
          )}
          <button className="rai-topbar-btn" onClick={syncData} disabled={syncing}>
            {syncing ? '⏳ Syncing…' : '🔄 Sync Data'}
          </button>
          <button className="rai-topbar-btn rai-primary-btn" onClick={refreshAI} disabled={isGenerating}>
            {isGenerating ? '⏳ Generating…' : '✨ Refresh AI'}
          </button>
          <button className="rai-topbar-btn" onClick={onClose} style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Identity bar */}
        <div className="rai-identity">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                border: '2px solid #E4E4E7', background: avatarBg,
              }}
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
                const fallback = el.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="rai-avatar" style={{ background: avatarBg, display: avatarUrl ? 'none' : 'flex' }}>{initials}</div>
          <div style={{ flex: 1 }}>
            {resourceLoading ? (
              <>
                <div className="rai-skeleton" style={{ height: 22, width: 160, borderRadius: 4, marginBottom: 6 }} />
                <div className="rai-skeleton" style={{ height: 14, width: 120, borderRadius: 4 }} />
              </>
            ) : (
              <>
                <div className="rai-name">{name || 'Loading…'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="rai-role-subtitle">{resource?.role_name || 'Team Member'}</span>
                  <span className="rai-rid-badge">{resource?.rid || ''}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="rai-body" ref={bodyRef}>
          {/* Auto-generating banner */}
          {isGenerating && noAIData && (
            <div style={{
              margin: '0 0 16px 0',
              padding: '16px 20px',
              background: 'var(--rai-primary-bg, var(--cp-blue-wash))',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 20, height: 20,
                border: '2px solid var(--cp-blue)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#7DB8FC' }}>
                  Generating AI Intelligence…
                </div>
                <div style={{ fontSize: 11, color: 'var(--cp-blue)', marginTop: 2 }}>
                  First-time analysis — computing metrics and generating behavioral patterns.
                </div>
              </div>
            </div>
          )}

          {/* Story Teaser */}
          <StoryTeaser
            hook={storyData?.hookEn || ''}
            weekNumber={weekNum}
            closed={storyData?.kpis.closed || 0}
            inReview={storyData?.kpis.inReview || 0}
            remaining={storyData?.kpis.remaining || 0}
            onScrollToStory={scrollToStory}
            isLoading={storyLoading}
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
