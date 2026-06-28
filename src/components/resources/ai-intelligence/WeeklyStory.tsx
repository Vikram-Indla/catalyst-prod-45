import React from 'react';
import { R360_WEEK_CONFIG, getWeekNumber, formatWeekRange, getWeekStart } from '@/constants/r360WeekConfig';

export interface WeekDayEvent {
  time: string;
  text: string;
  textAr?: string;
  refs?: string[];
  statusBadge?: 'progress' | 'done' | 'review';
}

export interface WeekDay {
  dayIndex: number; // 0=Sun..4=Thu
  events: WeekDayEvent[];
  tag?: 'first' | 'peak' | 'close' | 'quiet' | 'last';
}

export interface WeeklyStoryData {
  contextTitle: string;
  contextTitleAr: string;
  contextSubtitle: string;
  contextSubtitleAr: string;
  backlogCount: number;
  days: WeekDay[];
  kpis: { pickedUp: number; closed: number; inReview: number; remaining: number };
  hookEn: string;
  hookAr: string;
}

interface Props {
  data: WeeklyStoryData | null;
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  isLoading: boolean;
}

export const WeeklyStory: React.FC<Props> = ({ data, selectedDate, onPrevWeek, onNextWeek, isLoading }) => {
  const weekNum = getWeekNumber(selectedDate);
  const weekRange = formatWeekRange(selectedDate);

  return (
    <div className="rai-section" id="weeklyStory">
      <div className="rai-section-header">
        <span className="rai-section-title">Weekly Story</span>
        <span className="rai-ai-badge">✦ AI</span>
      </div>

      {/* Week selector */}
      <div className="rai-week-selector">
        <button className="rai-week-nav" onClick={onPrevWeek}>◄</button>
        <span className="rai-week-label">W{weekNum}</span>
        <span className="rai-week-range">{weekRange}</span>
        <button className="rai-week-nav" onClick={onNextWeek}>►</button>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[60, 80, 60, 40, 70].map((h, i) => (
            <div key={i} className="rai-skeleton" style={{ height: h }} />
          ))}
        </div>
      )}

      {!isLoading && data && (
        <div>
          {/* Context banner */}
          <div className="rai-context-banner">
            <div className="rai-context-icon">🔴</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rai-context-title">{data.contextTitle}</div>
              <div className="rai-context-subtitle">{data.contextSubtitle}</div>
            </div>
            <div className="rai-context-stat">
              <div className="rai-context-stat-value">{data.backlogCount}</div>
              <div className="rai-context-stat-label">BACKLOG</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rai-timeline">
            {data.days.map((day) => {
              const dayNames = R360_WEEK_CONFIG.dayNames.en;
              const dayTags = R360_WEEK_CONFIG.dayTags.en;
              const weekStart = getWeekStart(selectedDate);
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + day.dayIndex);

              const markerClass = day.tag === 'peak' ? 'rai-peak' :
                day.tag === 'quiet' ? 'rai-quiet' : '';

              return (
                <div key={day.dayIndex} className="rai-day-block">
                  <div className={`rai-day-marker ${markerClass}`} />
                  <div className="rai-day-header">
                    <span className="rai-day-name">{dayNames[day.dayIndex]}</span>
                    <span className="rai-day-date">
                      {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {day.tag && (
                      <span className="rai-day-tag">{dayTags[day.tag]}</span>
                    )}
                  </div>

                  {day.events.length === 0 && (
                    <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--rai-ink-muted)', fontStyle: 'italic', paddingLeft: 4 }}>
                      No activity
                    </div>
                  )}

                  {day.events.map((evt, ei) => (
                    <div key={ei} className="rai-event">
                      <span className="rai-event-time">{evt.time}</span>
                      <span className="rai-event-body">
                        {evt.text}
                        {evt.refs?.map(ref => (
                          <span key={ref} className="rai-ticket-ref" style={{ marginLeft: 4 }}>{ref}</span>
                        ))}
                        {evt.statusBadge && (
                          <span className={`rai-status-badge rai-status-${evt.statusBadge}`} style={{ marginLeft: 6 }}>
                            {evt.statusBadge === 'progress' ? 'In Progress' : evt.statusBadge === 'done' ? 'Done' : 'In Review'}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && !data && (
        <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--rai-ink-muted)', fontStyle: 'italic' }}>
          No weekly data available for this period. Try navigating to a different week.
        </p>
      )}
    </div>
  );
};
