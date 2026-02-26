import React, { useState } from 'react';
import { LangToggle, type Lang } from './LangToggle';
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

const STATUS_AR: Record<string, string> = {
  progress: 'قيد التنفيذ',
  done: 'مُنجَز',
  review: 'قيد المراجعة',
};

const KPI_LABELS_AR: Record<string, string> = {
  pickedUp: 'التُقِطَت',
  closed: 'أُغلِقَت',
  inReview: 'قيد المراجعة',
  remaining: 'المتبقّي',
};

interface Props {
  data: WeeklyStoryData | null;
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  isLoading: boolean;
}

export const WeeklyStory: React.FC<Props> = ({ data, selectedDate, onPrevWeek, onNextWeek, isLoading }) => {
  const [lang, setLang] = useState<Lang>('en');
  const weekNum = getWeekNumber(selectedDate);
  const weekRange = formatWeekRange(selectedDate);
  const isAr = lang === 'ar';

  return (
    <div className="rai-section" id="weeklyStory">
      <div className="rai-section-header">
        <span className="rai-section-title">Weekly Story</span>
        <span className="rai-ai-badge">✦ AI</span>
        <div style={{ marginLeft: 'auto' }}>
          <LangToggle lang={lang} onChange={setLang} />
        </div>
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
        <div className={isAr ? 'rai-rtl' : ''} style={{ transition: 'opacity 300ms', opacity: 1 }}>
          {/* Context banner */}
          <div className="rai-context-banner">
            <div className="rai-context-icon">🔴</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={isAr ? 'rai-ar-context-title' : 'rai-context-title'}>
                {isAr ? data.contextTitleAr : data.contextTitle}
              </div>
              <div className="rai-context-subtitle" style={isAr ? { fontFamily: 'var(--rai-font-ar)', fontSize: 12 } : {}}>
                {isAr ? data.contextSubtitleAr : data.contextSubtitle}
              </div>
            </div>
            <div className="rai-context-stat">
              <div className="rai-context-stat-value">{data.backlogCount}</div>
              <div className="rai-context-stat-label">{isAr ? 'المتراكم' : 'BACKLOG'}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rai-timeline">
            {data.days.map((day, idx) => {
              const dayNames = isAr ? R360_WEEK_CONFIG.dayNames.ar : R360_WEEK_CONFIG.dayNames.en;
              const dayTags = isAr ? R360_WEEK_CONFIG.dayTags.ar : R360_WEEK_CONFIG.dayTags.en;
              const weekStart = getWeekStart(selectedDate);
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + day.dayIndex);

              const markerClass = day.tag === 'peak' ? 'rai-peak' :
                day.tag === 'quiet' ? 'rai-quiet' : '';

              return (
                <div key={day.dayIndex} className="rai-day-block">
                  <div className={`rai-day-marker ${markerClass}`} />
                  <div className="rai-day-header">
                    <span className={isAr ? 'rai-ar-day-name' : 'rai-day-name'}>
                      {dayNames[day.dayIndex]}
                    </span>
                    <span className="rai-day-date">
                      {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {day.tag && (
                      <span className={isAr ? 'rai-day-tag-ar' : 'rai-day-tag'}>
                        {dayTags[day.tag]}
                      </span>
                    )}
                  </div>

                  {day.events.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--rai-ink-muted)', fontStyle: 'italic', paddingLeft: isAr ? 0 : 4, paddingRight: isAr ? 4 : 0 }}>
                      {isAr ? 'لا توجد نشاطات' : 'No activity'}
                    </div>
                  )}

                  {day.events.map((evt, ei) => (
                    <div key={ei} className="rai-event">
                      <span className="rai-event-time">{evt.time}</span>
                      <span className={isAr ? 'rai-ar-body' : 'rai-event-body'}>
                        {isAr ? (evt.textAr || evt.text) : evt.text}
                        {evt.refs?.map(ref => (
                          <span key={ref} className="rai-ticket-ref" style={{ marginLeft: isAr ? 0 : 4, marginRight: isAr ? 4 : 0 }}>{ref}</span>
                        ))}
                        {evt.statusBadge && (
                          <span className={`rai-status-badge rai-status-${evt.statusBadge}`} style={{ marginLeft: isAr ? 0 : 6, marginRight: isAr ? 6 : 0 }}>
                            {isAr ? STATUS_AR[evt.statusBadge] : evt.statusBadge === 'progress' ? 'In Progress' : evt.statusBadge === 'done' ? 'Done' : 'In Review'}
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
        <p style={{ fontSize: 13, color: 'var(--rai-ink-muted)', fontStyle: 'italic' }}>
          No weekly data available for this period. Try navigating to a different week.
        </p>
      )}
    </div>
  );
};
