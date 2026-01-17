/**
 * Chat Header Component
 * Shows AI avatar, status, and actions
 */

import React from 'react';
import { Bot, RotateCcw, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatHeaderProps {
  conversationTitle?: string;
  onClear: () => void;
  onExport: () => void;
}

export function ChatHeader({ conversationTitle, onClear, onExport }: ChatHeaderProps) {
  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-4">
      {/* AI Avatar */}
      <div className="w-12 h-12 bg-[#0d9488] rounded-[14px] flex items-center justify-center flex-shrink-0">
        <Bot className="w-7 h-7 text-white" />
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">Catalyst AI</h1>
          <div className="w-2 h-2 bg-[#0d9488] rounded-full" />
        </div>
        <p className="text-sm text-slate-500">
          {conversationTitle || 'Test Management Assistant'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="h-10 px-4 text-[13px] font-medium text-slate-600 border-slate-200"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear conversation</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-10 px-4 text-[13px] font-medium text-slate-600 border-slate-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export conversation</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
