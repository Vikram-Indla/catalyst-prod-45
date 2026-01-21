import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, ChevronRight, Clock, User, AlertCircle, Link, Paperclip, MessageSquare, Mountain, Puzzle, Bookmark, CheckSquare, ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { WorkItem, WorkItemStatus, WorkItemPriority, STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG, WorkItemType } from '../../types';

interface DetailsDrawerProps {
  workItem: WorkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: WorkItem) => void;
}

interface DraftState {
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
}

const STORAGE_KEY_PREFIX = 'spaces_backlog_draft_';

const TYPE_ICONS: Record<WorkItemType, React.ElementType> = {
  objective: Mountain,
  strategic_initiative: Mountain,
  epic: Mountain,
  feature: Puzzle,
  story: Bookmark,
  subtask: CheckSquare,
};

const PRIORITY_ICONS: Record<string, React.ElementType> = {
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
};

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  workItem,
  isOpen,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (workItem) {
      const savedDraft = localStorage.getItem(`${STORAGE_KEY_PREFIX}${workItem.id}`);
      if (savedDraft) {
        try {
          setDraft(JSON.parse(savedDraft));
          setIsDirty(true);
        } catch {
          initializeDraft();
        }
      } else {
        initializeDraft();
      }
    }
  }, [workItem?.id]);

  const initializeDraft = useCallback(() => {
    if (workItem) {
      setDraft({
        title: workItem.title,
        description: workItem.description || '',
        status: workItem.status,
        priority: workItem.priority,
      });
      setIsDirty(false);
    }
  }, [workItem]);

  useEffect(() => {
    if (workItem && draft && isDirty) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${workItem.id}`, JSON.stringify(draft));
    }
  }, [draft, isDirty, workItem?.id]);

  const handleFieldChange = useCallback((field: keyof DraftState, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
    setIsDirty(true);
    if (field === 'title' && !value.trim()) {
      setValidationErrors(prev => ({ ...prev, title: 'Title is required' }));
    } else if (field === 'title') {
      setValidationErrors(prev => { const { title, ...rest } = prev; return rest; });
    }
  }, [draft]);

  const handleSave = useCallback(() => {
    if (!workItem || !draft) return;
    if (!draft.title.trim()) {
      setValidationErrors({ title: 'Title is required' });
      return;
    }
    const updatedItem: WorkItem = {
      ...workItem,
      title: draft.title,
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedItem);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${workItem.id}`);
    setIsDirty(false);
  }, [workItem, draft, onSave]);

  const handleDiscard = useCallback(() => {
    if (workItem) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${workItem.id}`);
      initializeDraft();
      setValidationErrors({});
    }
  }, [workItem, initializeDraft]);

  if (!isOpen || !workItem || !draft) return null;

  const typeConfig = TYPE_CONFIG[workItem.type];
  const TypeIcon = TYPE_ICONS[workItem.type];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className={cn(
        "fixed top-0 right-0 h-full w-[600px] bg-background border-l border-border shadow-2xl z-50",
        "transform transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn("p-1.5 rounded", typeConfig.bgColor)}>
              <TypeIcon className={cn("h-4 w-4", typeConfig.textColor)} />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{workItem.key}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                <Clock className="h-3 w-3 mr-1" />Unsaved
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-140px)] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-4">
              <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Details</TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2"><MessageSquare className="h-4 w-4 mr-1.5" />Comments</TabsTrigger>
              <TabsTrigger value="links" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2"><Link className="h-4 w-4 mr-1.5" />Links</TabsTrigger>
              <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2"><Paperclip className="h-4 w-4 mr-1.5" />Files</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 mt-0">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={draft.title} onChange={(e) => handleFieldChange('title', e.target.value)} className={cn(validationErrors.title && "border-destructive")} />
                {validationErrors.title && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{validationErrors.title}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={draft.status} onValueChange={(v) => handleFieldChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", cfg.dotColor)} />{cfg.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={draft.priority} onValueChange={(v) => handleFieldChange('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
                        const Icon = PRIORITY_ICONS[cfg.icon];
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2"><Icon className={cn("h-4 w-4", cfg.color)} />{cfg.label}</div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={draft.description} onChange={(e) => handleFieldChange('description', e.target.value)} placeholder="Add a description..." className="min-h-[120px]" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div><span className="text-xs text-muted-foreground">Created</span><p className="text-sm">{workItem.createdAt}</p></div>
                <div><span className="text-xs text-muted-foreground">Updated</span><p className="text-sm">{workItem.updatedAt}</p></div>
                {workItem.assignee && (
                  <div><span className="text-xs text-muted-foreground">Assignee</span>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-3 w-3 text-primary" /></div><span className="text-sm">{workItem.assignee.name}</span></div>
                  </div>
                )}
                {workItem.storyPoints !== undefined && <div><span className="text-xs text-muted-foreground">Story Points</span><p className="text-sm">{workItem.storyPoints}</p></div>}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="flex-1 flex items-center justify-center text-muted-foreground mt-0">
              <div className="text-center"><MessageSquare className="h-12 w-12 mb-3 opacity-20 mx-auto" /><p className="text-sm">No comments yet</p></div>
            </TabsContent>
            <TabsContent value="links" className="flex-1 flex items-center justify-center text-muted-foreground mt-0">
              <div className="text-center"><Link className="h-12 w-12 mb-3 opacity-20 mx-auto" /><p className="text-sm">No linked items</p></div>
            </TabsContent>
            <TabsContent value="attachments" className="flex-1 flex items-center justify-center text-muted-foreground mt-0">
              <div className="text-center"><Paperclip className="h-12 w-12 mb-3 opacity-20 mx-auto" /><p className="text-sm">No attachments</p></div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-border bg-background flex items-center justify-between">
          <div>{isDirty && <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty || Object.keys(validationErrors).length > 0} className="gap-2"><Save className="h-4 w-4" />Save</Button>
          </div>
        </div>
      </div>
    </>
  );
};
