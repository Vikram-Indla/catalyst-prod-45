/**
 * EpicFeaturesViewTab - New tab for Epic drawer
 * 
 * Contains the "Implementation Links" UI that was moved from Links tab.
 * Shows linked Features under this Epic.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ExternalLink, GitBranch, Link as LinkIcon, Search, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EpicFeaturesViewTabProps {
  epicId: string;
}

const TYPE_BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  'epic': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'feature': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'story': { bg: 'bg-sky-100', text: 'text-sky-700' },
};

export function EpicFeaturesViewTab({ epicId }: EpicFeaturesViewTabProps) {
  const queryClient = useQueryClient();
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [implSearch, setImplSearch] = useState('');
  const [selectedWorkItem, setSelectedWorkItem] = useState<{
    id: string;
    key: string;
    title: string;
    type: string;
    status: string;
    owner: string;
    source: string;
  } | null>(null);

  // Fetch features linked to this epic
  const { data: features, isLoading } = useQuery({
    queryKey: ['epic-features', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, status, created_at')
        .eq('epic_id', epicId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!epicId,
  });

  // Fetch work items for implementation linking
  const { data: workItems = [], isLoading: workItemsLoading } = useQuery({
    queryKey: ['work-items-for-linking', implSearch],
    queryFn: async () => {
      const searchTerm = implSearch.trim();
      if (!searchTerm) return [];
      
      const results: any[] = [];
      
      // Search Epics
      try {
        const { data: epicsByKey } = await supabase
          .from('epics')
          .select('id, epic_key, name, state, owner_name')
          .ilike('epic_key', `%${searchTerm}%`)
          .limit(5);
        
        const { data: epicsByName } = await supabase
          .from('epics')
          .select('id, epic_key, name, state, owner_name')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        const epicsMap = new Map();
        [...(epicsByKey || []), ...(epicsByName || [])].forEach(e => epicsMap.set(e.id, e));
        const epics = Array.from(epicsMap.values());
        
        results.push(...epics.map(e => ({
          id: e.id,
          key: e.epic_key || `E-${e.id.slice(0, 4)}`,
          title: e.name,
          type: 'epic',
          status: e.state || 'new',
          owner: e.owner_name || 'Unassigned',
          source: 'Catalyst Epics'
        })));
      } catch (err) {
        console.error('Error searching epics:', err);
      }
      
      // Search Features
      try {
        const { data: featuresByKey } = await supabase
          .from('features')
          .select('id, display_id, name, status')
          .ilike('display_id', `%${searchTerm}%`)
          .limit(5);
        
        const { data: featuresByName } = await supabase
          .from('features')
          .select('id, display_id, name, status')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        const featuresMap = new Map();
        [...(featuresByKey || []), ...(featuresByName || [])].forEach(f => featuresMap.set(f.id, f));
        const featuresData = Array.from(featuresMap.values());
        
        results.push(...featuresData.map((f: any) => ({
          id: f.id,
          key: f.display_id || `F-${f.id.slice(0, 4)}`,
          title: f.name,
          type: 'feature',
          status: f.status || 'new',
          owner: 'Unassigned',
          source: 'Catalyst Features'
        })));
      } catch (err) {
        console.error('Error searching features:', err);
      }
      
      // Search Stories
      try {
        const { data: storiesByKey } = await supabase
          .from('stories')
          .select('id, story_key, name, status')
          .ilike('story_key', `%${searchTerm}%`)
          .limit(5);
        
        const { data: storiesByName } = await supabase
          .from('stories')
          .select('id, story_key, name, status')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        
        const storiesMap = new Map();
        [...(storiesByKey || []), ...(storiesByName || [])].forEach(s => storiesMap.set(s.id, s));
        const stories = Array.from(storiesMap.values());
        
        results.push(...stories.map((s: any) => ({
          id: s.id,
          key: s.story_key || `S-${s.id.slice(0, 4)}`,
          title: s.name,
          type: 'story',
          status: s.status || 'new',
          owner: 'Unassigned',
          source: 'Catalyst Stories'
        })));
      } catch (err) {
        console.error('Error searching stories:', err);
      }
      
      return results;
    },
    enabled: showLinkForm && implSearch.trim().length >= 1
  });

  // Create implementation link
  const createImplementationLinkMutation = useMutation({
    mutationFn: async (workItem: typeof selectedWorkItem) => {
      if (!workItem) throw new Error('No work item selected');
      
      const insertData = {
        epic_id: epicId,
        title: `${workItem.key} – ${workItem.title}`,
        url: `/${workItem.type}s/${workItem.id}`,
        link_type: workItem.type,
      };
      
      const { error } = await supabase
        .from('epic_links')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-links', 'epic', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic-features', epicId] });
      toast.success('Implementation link added');
      setSelectedWorkItem(null);
      setImplSearch('');
      setShowLinkForm(false);
    },
    onError: () => {
      toast.error('Failed to add implementation link');
    }
  });

  const handleBack = () => {
    setShowLinkForm(false);
    setSelectedWorkItem(null);
    setImplSearch('');
  };

  return (
    <div className="p-4 md:p-5 pb-6 space-y-6">
      {/* Implementation Links Section */}
      <Card className="p-5 border border-border/60 bg-card">
        <h4 className="font-semibold text-[15px] text-foreground mb-4">Implementation Links</h4>
        
        {!showLinkForm ? (
          <button
            className="w-full p-4 border-2 border-dashed border-border rounded-xl text-center cursor-pointer transition-all hover:border-brand-gold/50 hover:bg-brand-gold/5 group"
            onClick={() => setShowLinkForm(true)}
          >
            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center bg-muted/50 rounded-lg group-hover:bg-brand-gold group-hover:text-white transition-all">
              <LinkIcon className="h-5 w-5 text-muted-foreground group-hover:text-white" />
            </div>
            <div className="font-medium text-[13px] text-foreground mb-0.5">Link Work Items</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Link epics, features, or stories</div>
          </button>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            
            <div>
              <Label className="text-[13px] font-medium text-foreground">Search Work Items</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={implSearch}
                  onChange={(e) => setImplSearch(e.target.value)}
                  placeholder="Search by key (E-1234) or title..."
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
                />
              </div>
            </div>

            {implSearch.trim().length >= 1 && (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {workItemsLoading ? (
                    <div className="text-center py-8 text-[13px] text-muted-foreground">
                      Searching...
                    </div>
                  ) : workItems.length > 0 ? (
                    workItems.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedWorkItem(item)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                          selectedWorkItem?.id === item.id 
                            ? "bg-brand-gold/10 border border-brand-gold" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        <span className={cn(
                          "px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded",
                          TYPE_BADGE_CONFIG[item.type]?.bg || 'bg-gray-100',
                          TYPE_BADGE_CONFIG[item.type]?.text || 'text-gray-700'
                        )}>
                          {item.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate">
                            <span className="text-muted-foreground">{item.key}</span> – {item.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>{item.owner}</span>
                            <span>•</span>
                            <span>{item.source}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-[13px] text-muted-foreground">
                      No work items found
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {selectedWorkItem && (
              <div className="p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-lg">
                <div className="text-[12px] text-muted-foreground mb-1">Selected:</div>
                <div className="text-[13px] font-medium text-foreground">
                  {selectedWorkItem.key} – {selectedWorkItem.title}
                </div>
              </div>
            )}

            <Button 
              onClick={() => createImplementationLinkMutation.mutate(selectedWorkItem)} 
              disabled={createImplementationLinkMutation.isPending || !selectedWorkItem}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createImplementationLinkMutation.isPending ? 'Linking...' : 'Link Work Item'}
            </Button>
          </div>
        )}
      </Card>

      {/* Linked Features Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Linked Features ({features?.length || 0})</h3>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Link Feature
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading features...</div>
        ) : features && features.length > 0 ? (
          <div className="space-y-3">
            {features.map((feature) => (
              <Card key={feature.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-brand-gold">
                            {`F-${feature.id.slice(0, 4)}`}
                          </span>
                          <span className="text-sm">{feature.name}</span>
                        </div>
                        {feature.status && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {feature.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No features linked to this epic</p>
            <p className="text-xs mt-1">Click "Link Feature" to connect existing features or create new ones</p>
          </div>
        )}
      </div>
    </div>
  );
}
