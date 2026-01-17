/**
 * Conversations Panel Component
 * Shows conversation history with search
 */

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '../types';

interface ConversationsPanelProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function ConversationsPanel({
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
  onDelete,
}: ConversationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groupedConversations = {
    today: filteredConversations.filter(c => 
      new Date(c.lastMessageAt).toDateString() === today.toDateString()
    ),
    yesterday: filteredConversations.filter(c => 
      new Date(c.lastMessageAt).toDateString() === yesterday.toDateString()
    ),
    older: filteredConversations.filter(c => {
      const date = new Date(c.lastMessageAt);
      return date.toDateString() !== today.toDateString() && 
             date.toDateString() !== yesterday.toDateString();
    }),
  };

  return (
    <div className="w-[280px] bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
        <Button
          onClick={onCreate}
          size="sm"
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-4 h-9 text-[13px]"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-10 bg-slate-50 border-slate-200 text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {groupedConversations.today.length > 0 && (
          <ConversationGroup
            label="Today"
            conversations={groupedConversations.today}
            activeId={activeConversationId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        )}
        {groupedConversations.yesterday.length > 0 && (
          <ConversationGroup
            label="Yesterday"
            conversations={groupedConversations.yesterday}
            activeId={activeConversationId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        )}
        {groupedConversations.older.length > 0 && (
          <ConversationGroup
            label="Previous"
            conversations={groupedConversations.older}
            activeId={activeConversationId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationGroupProps {
  label: string;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationGroup({ label, conversations, activeId, onSelect, onDelete }: ConversationGroupProps) {
  return (
    <div className="mb-2">
      <div className="px-5 py-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      {conversations.map(conv => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeId}
          onSelect={() => onSelect(conv.id)}
          onDelete={() => onDelete(conv.id)}
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({ conversation, isActive, onSelect, onDelete }: ConversationItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "px-5 py-3.5 cursor-pointer border-l-[3px] transition-colors group",
        isActive 
          ? "border-l-[#d97706] bg-slate-50" 
          : "border-l-transparent hover:bg-slate-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-sm font-medium truncate mb-1",
            isActive ? "text-[#d97706]" : "text-slate-900"
          )}>
            {conversation.title}
          </h3>
          <p className="text-[13px] text-slate-500 truncate">
            {conversation.preview || 'No messages yet'}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
