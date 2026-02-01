// Aqd¹⁰ Item Side Panel
import React, { useState } from 'react';
import { X, Copy, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAqdItem, useAqdItemNotes, useAqdItemHistory, useUpdateAqdItem, useAddAqdItemNote } from '@/hooks/useAqd';
import { STATUS_CONFIG, AQD_LABEL_COLORS } from '@/types/aqd';
import type { AqdItemStatus } from '@/types/aqd';

interface AqdItemPanelProps {
  itemId: string | null;
  onClose: () => void;
}

export function AqdItemPanel({ itemId, onClose }: AqdItemPanelProps) {
  const [noteContent, setNoteContent] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const { data: item, isLoading } = useAqdItem(itemId || undefined);
  const { data: notes = [] } = useAqdItemNotes(itemId || undefined);
  const { data: history = [] } = useAqdItemHistory(itemId || undefined);
  const updateItem = useUpdateAqdItem();
  const addNote = useAddAqdItemNote();

  const handleAddNote = () => {
    if (!noteContent.trim() || !itemId) return;
    addNote.mutate({ itemId, content: noteContent.trim() });
    setNoteContent('');
  };

  if (!itemId) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-0 bottom-0 w-[400px] bg-background border-l border-border shadow-xl z-50",
        "transform transition-transform duration-200 ease-out",
        itemId ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : item ? (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <Input
                value={item.title}
                onChange={(e) => updateItem.mutate({ id: item.id, title: e.target.value })}
                className="text-base font-semibold border-0 px-0 focus-visible:ring-0 hover:bg-muted/50 rounded"
              />
            </div>
            
            {/* Fields */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                <Select
                  value={item.status}
                  onValueChange={(value) => updateItem.mutate({ id: item.id, status: value as AqdItemStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.bgColor === 'transparent' ? '#e5e7eb' : config.bgColor }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Due Date</Label>
                <Input
                  type="date"
                  value={item.due_date || ''}
                  onChange={(e) => updateItem.mutate({ id: item.id, due_date: e.target.value || null })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Labels</Label>
                <div className="flex flex-wrap gap-1.5">
                  {item.labels.map(label => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      className="text-xs"
                      style={{
                        color: AQD_LABEL_COLORS[label.color]?.text || '#6b7280',
                        borderColor: AQD_LABEL_COLORS[label.color]?.border || '#6b7280',
                      }}
                    >
                      {label.name}
                      <button className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    + Add
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                <Textarea
                  value={item.description || ''}
                  onChange={(e) => updateItem.mutate({ id: item.id, description: e.target.value })}
                  placeholder="Add a description..."
                  rows={3}
                />
              </div>
            </div>
            
            {/* Notes Section */}
            <div className="border-t border-border pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Notes</Label>
              
              <div className="space-y-2 mb-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      {note.created_by_name} · {format(new Date(note.created_at), 'MMM d, h:mm a')}
                    </div>
                    <div>{note.content}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <Button size="icon" onClick={handleAddNote} disabled={!noteContent.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* History Section */}
            <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="border-t border-border pt-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">History</Label>
                {isHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3">
                  {history.map(entry => (
                    <div key={entry.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                      <div>
                        <div>
                          <span className="text-muted-foreground">{entry.field_name}</span>
                          {' → '}
                          <span className="font-medium">{entry.new_value}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.changed_by_name} · {format(new Date(entry.changed_at), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-sm text-muted-foreground">No history yet</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">Item not found</div>
        )}
      </div>
    </div>
  );
}
