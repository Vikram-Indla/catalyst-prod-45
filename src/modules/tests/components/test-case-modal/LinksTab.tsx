/**
 * Links Tab - Traceability Links
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  Search, 
  FileText, 
  Bug, 
  Layers, 
  Calendar,
  Package,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import type { TabProps, TestCaseLink } from './types';

const LINK_TYPES = [
  { value: 'requirement', label: 'Requirement', icon: FileText, color: 'text-blue-500', required: true },
  { value: 'story', label: 'Story', icon: FileText, color: 'text-green-500', required: true },
  { value: 'feature', label: 'Feature', icon: Layers, color: 'text-purple-500', required: true },
  { value: 'defect', label: 'Defect', icon: Bug, color: 'text-red-500', required: false },
  { value: 'incident', label: 'Incident', icon: AlertCircle, color: 'text-orange-500', required: false },
  { value: 'test_set', label: 'Test Set', icon: Package, color: 'text-cyan-500', required: false },
  { value: 'cycle', label: 'Cycle', icon: Calendar, color: 'text-indigo-500', required: false },
  { value: 'release', label: 'Release', icon: Package, color: 'text-pink-500', required: false },
];

const RELATIONS = [
  { value: 'relates', label: 'Relates to' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'blocked_by', label: 'Blocked by' },
];

interface LinksTabProps extends TabProps {
  addLink: (link: Omit<TestCaseLink, 'id'>) => void;
  removeLink: (id: string) => void;
}

export function LinksTab({
  formData,
  setFormData,
  projectId,
  validation,
  addLink,
  removeLink,
}: LinksTabProps) {
  const [linkType, setLinkType] = useState<string>('story');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch stories for linking
  const { data: stories = [] } = useQuery({
    queryKey: ['stories-for-linking', projectId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select('id, title, story_key, status')
        .limit(20);
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,story_key.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: linkType === 'story' && searchOpen,
  });

  // Fetch features for linking
  const { data: features = [] } = useQuery({
    queryKey: ['features-for-linking', projectId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('id, name, status')
        .limit(20);
      
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: linkType === 'feature' && searchOpen,
  });

  // Fetch defects for linking
  const { data: defects = [] } = useQuery({
    queryKey: ['defects-for-linking', projectId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('defects')
        .select('id, title, defect_id, workflow_status')
        .limit(20);
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,defect_id.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: linkType === 'defect' && searchOpen,
  });

  const getSearchResults = () => {
    switch (linkType) {
      case 'story': return stories.map(s => ({ id: s.id, key: s.story_key, title: s.title }));
      case 'feature': return features.map(f => ({ id: f.id, key: f.id.slice(0, 8), title: f.name }));
      case 'defect': return defects.map(d => ({ id: d.id, key: d.defect_id, title: d.title }));
      default: return [];
    }
  };

  const handleSelectItem = (item: { id: string; key: string; title: string }) => {
    // Check if already linked
    if (formData.links.some(l => l.linkedId === item.id)) {
      return;
    }

    addLink({
      linkedType: linkType as any,
      linkedId: item.id,
      linkedKey: item.key || '',
      linkedTitle: item.title,
      relation: 'relates',
    });
    setSearchOpen(false);
    setSearchQuery('');
  };

  const linkErrors = validation.errors.filter(e => e.tab === 'links');
  const hasTraceabilityLink = formData.links.some(
    l => ['requirement', 'story', 'feature'].includes(l.linkedType)
  );

  const getLinkTypeConfig = (type: string) => LINK_TYPES.find(t => t.value === type);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center gap-3">
          <Select value={linkType} onValueChange={setLinkType}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-1">
              {LINK_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className={cn('h-4 w-4', type.color)} />
                    {type.label}
                    {type.required && <Badge variant="outline" className="text-[10px] h-4">Required</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Link
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 bg-surface-1 border-border-default" align="start">
              <div className="p-2 border-b border-border-default">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                  <Input
                    placeholder={`Search ${getLinkTypeConfig(linkType)?.label.toLowerCase()}s...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-sm bg-surface-2"
                    autoFocus
                  />
                </div>
              </div>
              <ScrollArea className="h-64">
                <div className="p-1">
                  {getSearchResults().length === 0 ? (
                    <div className="p-4 text-center text-text-tertiary text-sm">
                      {searchQuery ? 'No results found' : `Start typing to search ${getLinkTypeConfig(linkType)?.label.toLowerCase()}s`}
                    </div>
                  ) : (
                    getSearchResults().map(item => {
                      const isLinked = formData.links.some(l => l.linkedId === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          disabled={isLinked}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-2 rounded text-sm text-left',
                            isLinked
                              ? 'opacity-50 cursor-not-allowed bg-surface-2'
                              : 'hover:bg-surface-hover'
                          )}
                        >
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.key || 'No Key'}
                          </Badge>
                          <span className="truncate text-text-secondary">{item.title}</span>
                          {isLinked && <CheckCircle className="h-4 w-4 text-status-success ml-auto shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-xs text-text-tertiary">
          {formData.links.length} link{formData.links.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Validation Warning */}
      {!hasTraceabilityLink && (
        <div className="px-4 py-2 bg-status-warning/10 border-b border-status-warning/20">
          <div className="flex items-center gap-2 text-xs text-status-warning">
            <AlertCircle className="h-4 w-4" />
            <span>At least one requirement, story, or feature link is required for Ready status</span>
          </div>
        </div>
      )}

      {/* Links List */}
      <ScrollArea className="flex-1">
        {formData.links.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <LinkIcon className="h-12 w-12 text-text-quaternary mb-4" />
            <h3 className="font-medium text-text-primary mb-2">No Links Added</h3>
            <p className="text-sm text-text-tertiary text-center max-w-md mb-4">
              Link this test case to requirements, stories, features, defects, or other work items for full traceability.
            </p>
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Link
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {formData.links.map(link => {
              const typeConfig = getLinkTypeConfig(link.linkedType);
              const Icon = typeConfig?.icon || FileText;
              const showRelation = ['defect', 'incident'].includes(link.linkedType);

              return (
                <div
                  key={link.id}
                  className="flex items-center gap-3 px-4 py-3 group hover:bg-surface-hover"
                >
                  <Icon className={cn('h-5 w-5 shrink-0', typeConfig?.color)} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {link.linkedKey || link.linkedType.toUpperCase()}
                      </Badge>
                      <span className="truncate text-sm text-text-primary">{link.linkedTitle}</span>
                    </div>
                    <span className="text-xs text-text-tertiary capitalize">{typeConfig?.label}</span>
                  </div>

                  {showRelation && (
                    <Select
                      value={link.relation}
                      onValueChange={(v) => {
                        setFormData(prev => ({
                          ...prev,
                          links: prev.links.map(l =>
                            l.id === link.id ? { ...l, relation: v as any } : l
                          ),
                        }));
                      }}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1">
                        {RELATIONS.map(rel => (
                          <SelectItem key={rel.value} value={rel.value}>
                            {rel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-status-error"
                    onClick={() => removeLink(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
