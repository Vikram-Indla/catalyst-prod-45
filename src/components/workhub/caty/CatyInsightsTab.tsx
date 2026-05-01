/**
 * CatyInsightsTab — Insights tab with portfolio snapshot + action items
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { useCatyInsights } from '@/hooks/workhub/useCatyAI';
import { ProgressRing } from '../shared/ProgressRing';

export function CatyInsightsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { insights, isLoading } = useCatyInsights();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workhub'] });
  }, [queryClient]);

  const handleActionClick = (route: string) => {
    navigate(route);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--wh-primary)' }}
        />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-4 text-center">
        <p style={{ color: 'var(--wh-text-secondary)' }}>No data available</p>
      </div>
    );
  }

  const { summary, actionItems } = insights;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Portfolio Snapshot */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--wh-border)' }}>
        <h3
          className="text-xs font-semibold mb-3"
          style={{ color: 'var(--wh-text-primary)' }}
        >
          PORTFOLIO SNAPSHOT
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Completion */}
          <div
            className="p-3 rounded-lg border flex flex-col items-center justify-center gap-1"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: 'var(--wh-border-light)',
            }}
          >
            <div className="relative w-12 h-12">
              <ProgressRing
                percent={summary.completion}
                size={48}
                strokeWidth={3}
                color="var(--wh-primary)"
                showLabel={false}
              />
              <span
                className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color: 'var(--wh-primary)' }}
              >
                {summary.completion}%
              </span>
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--wh-text-secondary)' }}
            >
              Complete
            </span>
          </div>

          {/* Total Items */}
          <div
            className="p-3 rounded-lg border flex flex-col items-center justify-center"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: 'var(--wh-border-light)',
            }}
          >
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--wh-text-primary)', fontFamily: 'var(--cp-font-heading)' }}
            >
              {summary.totalItems}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--wh-text-secondary)' }}
            >
              Total Items
            </span>
          </div>

          {/* Active Releases */}
          <div
            className="p-3 rounded-lg border flex flex-col items-center justify-center"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: 'var(--wh-border-light)',
            }}
          >
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--wh-text-primary)', fontFamily: 'var(--cp-font-heading)' }}
            >
              {summary.activeReleases}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--wh-text-secondary)' }}
            >
              Active Releases
            </span>
          </div>

          {/* Due This Week */}
          <div
            className="p-3 rounded-lg border flex flex-col items-center justify-center"
            style={{
              backgroundColor: summary.dueThisWeek > 0 ? '#fef3c7' : '#f8fafc',
              borderColor: summary.dueThisWeek > 0 ? '#fcd34d' : 'var(--wh-border-light)',
            }}
          >
            <span
              className="text-lg font-bold"
              style={{
                color: summary.dueThisWeek > 0 ? '#d97706' : 'var(--wh-text-primary)',
                fontFamily: 'var(--cp-font-heading)',
              }}
            >
              {summary.dueThisWeek}
            </span>
            <span
              className="text-xs font-medium"
              style={{
                color: summary.dueThisWeek > 0 ? '#d97706' : 'var(--wh-text-secondary)',
              }}
            >
              Due This Week
            </span>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="flex-1 flex flex-col p-4">
        <h3
          className="text-xs font-semibold mb-3"
          style={{ color: 'var(--wh-text-primary)' }}
        >
          ACTION ITEMS ({actionItems.length})
        </h3>

        {actionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <CheckCircle className="w-6 h-6" style={{ color: '#10b981' }} />
            <p
              className="text-xs font-medium text-center"
              style={{ color: 'var(--wh-text-secondary)' }}
            >
              All clear! No critical actions needed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
            {actionItems.map((item, idx) => {
              const severityConfig = {
                high: {
                  icon: AlertTriangle,
                  bgColor: '#fee2e2',
                  color: '#dc2626',
                },
                medium: {
                  icon: AlertCircle,
                  bgColor: '#fef3c7',
                  color: '#d97706',
                },
                low: {
                  icon: Info,
                  bgColor: '#dbeafe',
                  color: '#2563eb',
                },
              };

              const config = severityConfig[item.severity];
              const IconComponent = config.icon;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--ds-text-inverse, #ffffff)',
                    borderColor: 'var(--wh-border-light)',
                  }}
                >
                  <div className="flex gap-2 mb-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.bgColor }}
                    >
                      <IconComponent className="w-3.5 h-3.5" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--wh-text-primary)' }}
                      >
                        {item.title}
                      </p>
                      <p
                        className="text-xs mt-0.5 line-clamp-2"
                        style={{ color: 'var(--wh-text-secondary)' }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleActionClick(item.route)}
                    className="text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--wh-primary)' }}
                  >
                    {item.action} →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-3 border-t text-xs flex items-center justify-between"
        style={{
          borderColor: 'var(--wh-border)',
          backgroundColor: 'var(--wh-surface)',
          color: 'var(--wh-text-tertiary)',
        }}
      >
        <span>Last analyzed: just now</span>
        <button
          onClick={handleRefresh}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Refresh insights"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
