/**
 * Chat Header Component
 * Shows AI avatar, status, and actions
 */

import React, { useState } from 'react';
import { Bot, RotateCcw, Download, FileText, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  conversationTitle?: string;
  onClear: () => void;
  onExport: (format: 'pdf' | 'md') => void;
  isExporting?: boolean;
  hasMessages?: boolean;
}

export function ChatHeader({ 
  conversationTitle, 
  onClear, 
  onExport,
  isExporting = false,
  hasMessages = true,
}: ChatHeaderProps) {
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

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting || !hasMessages}
                  className="h-10 px-4 text-[13px] font-medium text-slate-600 border-slate-200"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Export conversation</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport('pdf')}>
              <FileDown className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('md')}>
              <FileText className="w-4 h-4 mr-2" />
              Export as Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
