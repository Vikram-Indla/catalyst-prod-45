// Aqd¹⁰ Lists Table
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Pin, MoreHorizontal, Check, Clock, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AqdList } from '@/types/aqd';

interface AqdListsTableProps {
  lists: AqdList[];
  onTogglePin: (id: string, isPinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string, hasItems: boolean) => void;
}

export function AqdListsTable({ lists, onTogglePin, onArchive, onDelete }: AqdListsTableProps) {
  const navigate = useNavigate();

  const getStatusBadge = (list: AqdList) => {
    if (list.is_archived) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Archive className="h-3 w-3" />
          Archived
        </Badge>
      );
    }
    if (list.current_week_status === 'checkout_pending') {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600 bg-orange-50 animate-pulse">
          <Clock className="h-3 w-3" />
          Checkout Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600 bg-green-50">
        <Check className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  const formatWeekRange = (list: AqdList) => {
    if (!list.current_week_number) return '—';
    const weekNum = String(list.current_week_number).padStart(2, '0');
    const weekStart = list.current_week_start ? format(new Date(list.current_week_start), 'MMM d') : '';
    return weekStart ? `W${weekNum} - ${weekStart}` : `W${weekNum}`;
  };

  return (
    <div className="bg-background border border-border rounded-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">
              #
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              List Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Created By
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Week
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Items
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Checkout Status
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lists.map((list, index) => {
            // Create slug from list name
            const listSlug = encodeURIComponent(list.name.toLowerCase().replace(/\s+/g, '-'));
            return (
            <tr
              key={list.id}
              onClick={() => navigate(`/aqd/${listSlug}`)}
              className="hover:bg-muted/30 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3 text-sm text-muted-foreground font-medium">
                {index + 1}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold text-sm">
                    10
                  </div>
                  <div>
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {list.name}
                      {list.is_pinned && (
                        <Pin className="h-3 w-3 text-primary fill-primary" />
                      )}
                    </div>
                    {list.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {list.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {list.created_by_name || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatWeekRange(list)}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium">
                  {list.completed_count ?? 0}/{list.item_count ?? 0}
                </div>
              </td>
              <td className="px-4 py-3">
                {getStatusBadge(list)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(list.id, !list.is_pinned);
                    }}
                  >
                    <Pin className={cn(
                      "h-4 w-4",
                      list.is_pinned ? "fill-primary text-primary" : "text-muted-foreground"
                    )} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onArchive(list.id);
                      }}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive List
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          const hasItems = (list.item_count ?? 0) > 0;
                          onDelete(list.id, hasItems);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {(list.item_count ?? 0) > 0 ? 'Delete (will archive)' : 'Delete Permanently'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      
      {lists.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <div className="text-4xl mb-2">⭐</div>
          <div className="font-medium">No priority lists yet</div>
          <div className="text-sm">Create your first Aqd¹⁰ list to start tracking top priorities</div>
        </div>
      )}
    </div>
  );
}
