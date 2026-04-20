/**
 * ═══════════════════════════════════════════════════════════════════
 * ChannelToggles — Inline and standalone channel configuration
 * Reusable component for toggling notification delivery channels.
 * ═══════════════════════════════════════════════════════════════════
 */

import { memo } from 'react';
import { Bell, Mail, Zap, MessageSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip } from '@/components/ads';
import type { ChannelsConfig } from '@/types/notification-triggers';

// ── Channel metadata ────────────────────────────────────────────
const CHANNEL_DEFS: {
  key: keyof ChannelsConfig;
  label: string;
  description: string;
  Icon: typeof Bell;
}[] = [
  {
    key: 'in_app',
    label: 'In-App',
    description: 'Show in notification panel bell icon',
    Icon: Bell,
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Send email notification to recipient',
    Icon: Mail,
  },
  {
    key: 'toast',
    label: 'Toast',
    description: 'Show real-time toast popup in browser',
    Icon: Zap,
  },
  {
    key: 'slack',
    label: 'Slack',
    description: 'Send to connected Slack channel',
    Icon: MessageSquare,
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
            <Icon className="h-3 w-3 text-[#94A3B8]" />
            <Switch
              checked={channels[key]}
              onCheckedChange={(v) => onChange(key, v)}
              disabled={disabled}
              className="h-4 w-7 data-[state=checked]:bg-[#2563EB] disabled:opacity-30"
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
        <span className="text-xs font-medium text-[#0F172A]">Delivery Channels</span>
        <span className="text-[10px] text-[#94A3B8]">
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
                ? 'bg-[rgba(37,99,235,0.04)] border-[#2563EB]/20'
                : 'bg-white border-[var(--bd-default, #E2E8F0)] hover:bg-[rgba(0,0,0,0.02)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${
                channels[key] ? 'text-[#2563EB]' : 'text-[#94A3B8]'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#0F172A]">{label}</p>
              <p className="text-[10px] text-[#475569] truncate">{description}</p>
            </div>
            <Switch
              checked={channels[key]}
              onCheckedChange={(v) => onChange(key, v)}
              disabled={disabled}
              className="h-4 w-7 data-[state=checked]:bg-[#2563EB] flex-shrink-0"
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
    return <span className="text-[10px] text-[#94A3B8]">No channels</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {active.map(({ key, label, Icon }) => (
        <div
          key={key}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[var(--bd-default, #E2E8F0)]"
        >
          <Icon className="h-2.5 w-2.5 text-[#475569]" />
          <span className="text-[9px] font-medium text-[#475569]">{label}</span>
        </div>
      ))}
    </div>
  );
}
