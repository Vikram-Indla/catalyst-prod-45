/**
 * Details Tab - Test Case Metadata
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Tag, X, ChevronRight, Search, Plus, User, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { TabProps } from './types';

export function DetailsTab({ formData, setFormData, projectId, validation }: TabProps) {
  const [labelInput, setLabelInput] = useState('');
  const [componentInput, setComponentInput] = useState('');
  const [folderSearchOpen, setFolderSearchOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['test-folders-tree', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_folders')
        .select('id, name, parent_folder_id')
        .eq('program_id', projectId)
        .eq('entity_type', 'test_cases')
        .order('path');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch users for owner dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredFolders = folderSearch
    ? folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
    : folders;

  const selectedFolder = folders.find(f => f.id === formData.folderId);

  const addLabel = () => {
    const label = labelInput.trim();
    if (label && !formData.labels.includes(label)) {
      setFormData(prev => ({ ...prev, labels: [...prev.labels, label] }));
      setLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setFormData(prev => ({ ...prev, labels: prev.labels.filter(l => l !== label) }));
  };

  const addComponent = () => {
    const comp = componentInput.trim();
    if (comp && !formData.components.includes(comp)) {
      setFormData(prev => ({ ...prev, components: [...prev.components, comp] }));
      setComponentInput('');
    }
  };

  const removeComponent = (comp: string) => {
    setFormData(prev => ({ ...prev, components: prev.components.filter(c => c !== comp) }));
  };

  const hasError = (field: string) => 
    validation.errors.some(e => e.field === field && e.severity === 'error');

  return (
    <div className="grid grid-cols-2 gap-6 p-4">
      {/* Left Column */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label className={cn('text-xs', hasError('title') && 'text-status-error')}>
            Title <span className="text-status-error">*</span>
          </Label>
          <Input
            placeholder="Enter test case title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={cn(
              'h-9 text-sm bg-surface-2 mt-1',
              hasError('title') && 'border-status-error'
            )}
            autoFocus
          />
        </div>

        {/* Folder */}
        <div>
          <Label className={cn('text-xs', hasError('folderId') && 'text-status-error')}>
            Folder <span className="text-status-error">*</span>
          </Label>
          <Popover open={folderSearchOpen} onOpenChange={setFolderSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  'w-full h-9 justify-between text-sm bg-surface-2 mt-1',
                  !formData.folderId && 'text-text-tertiary',
                  hasError('folderId') && 'border-status-error'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {selectedFolder?.name || 'Select folder'}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-surface-1 border-border-default" align="start">
              <div className="p-2 border-b border-border-default">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                  <Input
                    placeholder="Search folders..."
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    className="h-8 pl-8 text-sm bg-surface-2"
                  />
                </div>
              </div>
              <ScrollArea className="h-48">
                <div className="p-1">
                  {filteredFolders.length === 0 ? (
                    <div className="p-4 text-center text-text-tertiary text-sm">
                      No folders found
                    </div>
                  ) : (
                    filteredFolders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, folderId: folder.id }));
                          setFolderSearchOpen(false);
                          setFolderSearch('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left',
                          formData.folderId === folder.id
                            ? 'bg-accent-subtle text-accent-primary'
                            : 'hover:bg-surface-hover text-text-secondary'
                        )}
                      >
                        <FolderOpen className="h-4 w-4 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Row: Status, Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as any }))}
            >
              <SelectTrigger className="h-9 text-sm bg-surface-2 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-1">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready" disabled={!validation.canBeReady}>
                  Ready {!validation.canBeReady && '(validation required)'}
                </SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as any }))}
            >
              <SelectTrigger className="h-9 text-sm bg-surface-2 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-1">
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row: Type, Risk */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as any }))}
            >
              <SelectTrigger className="h-9 text-sm bg-surface-2 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-1">
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="exploratory">Exploratory</SelectItem>
                <SelectItem value="bdd">BDD (Gherkin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Risk</Label>
            <Select
              value={formData.risk}
              onValueChange={(v) => setFormData(prev => ({ ...prev, risk: v as any }))}
            >
              <SelectTrigger className="h-9 text-sm bg-surface-2 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-1">
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Owner */}
        <div>
          <Label className="text-xs">Owner</Label>
          <Select
            value={formData.ownerId || '__none__'}
            onValueChange={(v) => setFormData(prev => ({ ...prev, ownerId: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger className="h-9 text-sm bg-surface-2 mt-1">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-text-tertiary" />
                <SelectValue placeholder="Unassigned" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-surface-1">
              <SelectItem value="__none__">Unassigned</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estimate */}
        <div>
          <Label className="text-xs">Estimate (minutes)</Label>
          <div className="relative mt-1">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <Input
              type="number"
              placeholder="30"
              value={formData.estimateMinutes ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                estimateMinutes: e.target.value ? parseInt(e.target.value) : null,
              }))}
              className="h-9 pl-8 text-sm bg-surface-2"
            />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        {/* Components */}
        <div>
          <Label className="text-xs">Components</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add component"
              value={componentInput}
              onChange={(e) => setComponentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addComponent())}
              className="h-9 text-sm bg-surface-2 flex-1"
            />
            <Button variant="outline" size="sm" onClick={addComponent} className="h-9 px-3">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {formData.components.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.components.map(comp => (
                <Badge key={comp} variant="secondary" className="text-xs gap-1 pr-1">
                  {comp}
                  <button onClick={() => removeComponent(comp)} className="hover:text-status-error">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Labels */}
        <div>
          <Label className="text-xs">Labels / Tags</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add label"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              className="h-9 text-sm bg-surface-2 flex-1"
            />
            <Button variant="outline" size="sm" onClick={addLabel} className="h-9 px-3">
              <Tag className="h-3.5 w-3.5" />
            </Button>
          </div>
          {formData.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.labels.map(label => (
                <Badge key={label} variant="outline" className="text-xs gap-1 pr-1">
                  {label}
                  <button onClick={() => removeLabel(label)} className="hover:text-status-error">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Approval Gate */}
        <div className="flex items-center gap-3 p-3 rounded-md border border-border-default bg-surface-2">
          <Switch
            id="requires-approval"
            checked={formData.requiresApproval}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresApproval: checked }))}
          />
          <div>
            <Label htmlFor="requires-approval" className="text-sm font-medium cursor-pointer">
              Requires approval before execution
            </Label>
            <p className="text-xs text-text-tertiary mt-0.5">
              Enable review gate for this test case
            </p>
          </div>
        </div>

        {/* Preconditions */}
        <div>
          <Label className="text-xs">Preconditions</Label>
          <Textarea
            placeholder="What conditions must be met before running this test?"
            value={formData.preconditions}
            onChange={(e) => setFormData(prev => ({ ...prev, preconditions: e.target.value }))}
            className="text-sm bg-surface-2 min-h-[80px] mt-1"
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            placeholder="Describe what this test case validates..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="text-sm bg-surface-2 min-h-[100px] mt-1"
          />
        </div>
      </div>
    </div>
  );
}
