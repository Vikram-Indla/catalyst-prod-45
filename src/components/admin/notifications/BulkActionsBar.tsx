/**
 * ═══════════════════════════════════════════════════════════════════
 * BulkActionsBar — Floating bar for batch operations on triggers
 * Appears when one or more triggers are selected via checkboxes.
 * ═══════════════════════════════════════════════════════════════════
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
import AutomationIcon from '@atlaskit/icon/core/automation';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CommentIcon from '@atlaskit/icon/core/comment';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import EmailIcon from '@atlaskit/icon/core/email';
import NotificationIcon from '@atlaskit/icon/core/notification';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import CrossIcon from '@atlaskit/icon/glyph/cross';
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TriggerBulkAction, ChannelsConfig } from '@/types/notification-triggers';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedKeys: string[];
  onAction: (action: TriggerBulkAction) => void;
  onClear: () => void;
}

export const BulkActionsBar = memo(function BulkActionsBar({
  selectedCount,
  selectedKeys,
  onAction,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const handleEnableAll = () => {
    onAction({ type: 'enable_all', triggerKeys: selectedKeys });
  };

  const handleDisableAll = () => {
    onAction({ type: 'disable_all', triggerKeys: selectedKeys });
  };

  const handleResetDefaults = () => {
    onAction({ type: 'reset_defaults', triggerKeys: selectedKeys });
  };

  const handleSetChannel = (channel: keyof ChannelsConfig, value: boolean) => {
    onAction({
      type: 'set_channel',
      triggerKeys: selectedKeys,
      channel,
      channelValue: value,
    });
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 bg-[#DEEBFF] rounded-md px-4 py-2.5 border border-[#B3D4FF] shadow-sm">
      {/* Selection count */}
      <span className="text-sm font-medium text-[#0747A6]">
        {selectedCount} trigger{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <Separator orientation="vertical" className="h-5 bg-[#B3D4FF]" />

      {/* Quick actions */}
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7 bg-white/80 border-[#B3D4FF] text-[#0747A6] hover:bg-white"
        onClick={handleEnableAll}
      >
        <CheckCircleIcon label="" size="small" />
        Enable All
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7 bg-white/80 border-[#B3D4FF] text-[#0747A6] hover:bg-white"
        onClick={handleDisableAll}
      >
        <CrossCircleIcon label="" size="small" />
        Disable All
      </Button>

      {/* Channel bulk set dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 bg-white/80 border-[#B3D4FF] text-[#0747A6] hover:bg-white"
          >
            Set Channel
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {/* In-App */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <NotificationIcon label="" size="small" />
              In-App
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('in_app', true)}>
                Enable for selected
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('in_app', false)}>
                Disable for selected
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Email */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <EmailIcon label="" size="small" />
              Email
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('email', true)}>
                Enable for selected
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('email', false)}>
                Disable for selected
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Toast */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <AutomationIcon label="" size="small" />
              Toast
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('toast', true)}>
                Enable for selected
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('toast', false)}>
                Disable for selected
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Slack */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <CommentIcon label="" size="small" />
              Slack
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('slack', true)}>
                Enable for selected
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => handleSetChannel('slack', false)}>
                Disable for selected
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Reset */}
          <DropdownMenuItem className="text-xs text-[var(--ds-text-danger,#DC2626)]" onClick={handleResetDefaults}>
            <RefreshIcon label="" size="small" />
            Reset to Defaults
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear selection */}
      <Button
        size="sm"
        variant="ghost"
        className="text-xs h-7 ml-auto text-[#0747A6] hover:text-[#0747A6]/80"
        onClick={onClear}
      >
        <CrossIcon label="" size="small" />
        Clear
      </Button>
    </div>
  );
});
