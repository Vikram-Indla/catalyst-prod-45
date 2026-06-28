/**
 * ═══════════════════════════════════════════════════════════════════
 * ChannelToggles — Inline and standalone channel configuration
 * Reusable component for toggling notification delivery channels.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { ComponentType } from 'react';
import { memo } from 'react';
import Toggle from '@atlaskit/toggle';
import { Tooltip } from '@/components/ads';
import type { ChannelsConfig } from '@/types/notification-triggers';
import AutomationIcon from '@atlaskit/icon/core/automation';
import CommentIcon from '@atlaskit/icon/core/comment';
import EmailIcon from '@atlaskit/icon/core/email';
import NotificationIcon from '@atlaskit/icon/core/notification';

// ── Channel metadata ────────────────────────────────────────────
const CHANNEL_DEFS: {
  key: keyof ChannelsConfig;
  label: string;
  description: string;
  Icon: ComponentType<{ label: string; size?: string }>;
}[] = [
  {
    key: 'in_app',
    label: 'In-App',
    description: 'Show in notification panel bell icon',
    Icon: NotificationIcon,
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Send email notification to recipient',
    Icon: EmailIcon,
  },
  {
    key: 'toast',
    label: 'Toast',
    description: 'Show real-time toast popup in browser',
    Icon: AutomationIcon,
  },
  {
    key: 'slack',
    label: 'Slack',
    description: 'Send to connected Slack channel',
    Icon: CommentIcon,
  },
];

// ═══════════════════════════════════════════════════════════════════
// Inline variant — 4 small toggles in a row (for table cells)
// ═══════════════════════════════════════════════════════════════════

interface InlineChannelTogglesProps {
  channels: ChannelsConfig;
  onChange: (channel: keyof ChannelsConfig, value: boolean) => void;
  disabled?: boolean;
}

export const InlineChannelToggles = memo(function InlineChannelToggles({
  channels,
  onChange,
  disabled = false,
}: InlineChannelTogglesProps) {
  return (
    <div className="flex items-center gap-3">
      {CHANNEL_DEFS.map(({ key, label, Icon }) => (
        <Tooltip key={key} delay={200} content={`${label}: ${channels[key] ? 'Enabled' : 'Disabled'}`}>
          <div className="flex items-center gap-1">
            <span style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', display: 'flex' }}>
              <Icon label="" size="small" />
            </span>
            <Toggle
              isChecked={channels[key]}
              onChange={() => onChange(key, !channels[key])}
              isDisabled={disabled}
            />
          </div>
        </Tooltip>
      ))}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// Card variant — Larger toggles with labels (for settings panels)
// ═══════════════════════════════════════════════════════════════════

interface ChannelToggleCardProps {
  channels: ChannelsConfig;
  onChange: (channel: keyof ChannelsConfig, value: boolean) => void;
  disabled?: boolean;
}

export function ChannelToggleCard({
  channels,
  onChange,
  disabled = false,
}: ChannelToggleCardProps) {
  const enabledCount = CHANNEL_DEFS.filter((d) => channels[d.key]).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--ds-text,var(--cp-ink-1, var(--cp-ink-1)))]">Delivery Channels</span>
        <span className="text-[10px] text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))]">
          {enabledCount}/{CHANNEL_DEFS.length} active
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CHANNEL_DEFS.map(({ key, label, description, Icon }) => (
          <button
            key={key}
            onClick={() => !disabled && onChange(key, !channels[key])}
            disabled={disabled}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-colors duration-150 ${
              channels[key]
                ? 'bg-[var(--ds-background-information, rgba(37,99,235,0.04))] border-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]/20'
                : 'bg-white border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] hover:bg-[var(--ds-shadow-raised, rgba(0,0,0,0.02))]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              style={{
                color: channels[key] ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <Icon label="" size="small" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--ds-text,var(--cp-ink-1, var(--cp-ink-1)))]">{label}</p>
              <p className="text-[10px] text-[var(--ds-text-subtle)] truncate">{description}</p>
            </div>
            <Toggle
              isChecked={channels[key]}
              onChange={() => onChange(key, !channels[key])}
              isDisabled={disabled}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Summary variant — Read-only badges showing active channels
// ═══════════════════════════════════════════════════════════════════

interface ChannelBadgesProps {
  channels: ChannelsConfig;
}

export function ChannelBadges({ channels }: ChannelBadgesProps) {
  const active = CHANNEL_DEFS.filter((d) => channels[d.key]);

  if (active.length === 0) {
    return <span className="text-[10px] text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))]">No channels</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {active.map(({ key, label, Icon }) => (
        <div
          key={key}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))]"
        >
          <span style={{ color: 'var(--ds-text-subtle)', display: 'flex' }}>
            <Icon label="" size="small" />
          </span>
          <span className="text-[9px] font-medium text-[var(--ds-text-subtle)]">{label}</span>
        </div>
      ))}
    </div>
  );
}
