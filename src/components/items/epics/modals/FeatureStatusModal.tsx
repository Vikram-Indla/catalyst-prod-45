import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';

interface FeatureStatusModalProps {
  epicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureStatusModal({ epicId, open, onOpenChange }: FeatureStatusModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const { data: features } = useQuery({
    queryKey: ['epic-features', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select(`
          *,
          stories:stories(id, name, status, estimate_points)
        `)
        .eq('epic_id', epicId);
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const filteredFeatures = features?.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const handleFeatureClick = (feature: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFeature(feature);
    setSelectedFeatureId(feature.id);
  };

  const getFeatureProgress = (feature: any) => {
    const stories = feature.stories || [];
    const completed = stories.filter((s: any) => s.status === 'done').length;
    const total = stories.length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getStoryPoints = (feature: any) => {
    const stories = feature.stories || [];
    const accepted = stories.filter((s: any) => s.status === 'done')
      .reduce((sum: number, s: any) => sum + (s.estimate_points || 0), 0);
    const total = stories.reduce((sum: number, s: any) => sum + (s.estimate_points || 0), 0);
    return { accepted, total };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Feature Status</DialogTitle>
          <DialogDescription>
            View features and stories for this epic
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredFeatures?.map((feature) => {
              const progress = getFeatureProgress(feature);
              const { accepted, total } = getStoryPoints(feature);
              const isExpanded = expandedFeatures.has(feature.id);

              return (
                <Collapsible key={feature.id} open={isExpanded} onOpenChange={() => toggleFeature(feature.id)}>
                  <div className="border rounded-lg p-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <div 
                            className="text-left cursor-pointer hover:text-primary transition-colors"
                            onClick={(e) => handleFeatureClick(feature, e)}
                          >
                            <div className="font-medium">{feature.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {feature.display_id || feature.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                            {progress === 100 ? 'On Track' : 'In Progress'}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {accepted}/{total} pts
                          </div>
                        </div>
                      </div>
                      <Progress value={progress} className="mt-2" />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4 pl-7">
                      <div className="space-y-2">
                        {feature.stories?.map((story: any) => (
                          <div key={story.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="text-sm">{story.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant={story.status === 'done' ? 'default' : 'outline'} className="text-xs">
                                {story.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{story.estimate_points} pts</span>
                            </div>
                          </div>
                        ))}
                        {(!feature.stories || feature.stories.length === 0) && (
                          <div className="text-sm text-muted-foreground text-center py-2">
                            No stories yet
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
            {(!filteredFeatures || filteredFeatures.length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                No features found
              </div>
            )}
          </div>
        </ScrollArea>

        <FeatureDetailsPanel
          feature={selectedFeature}
          open={!!selectedFeatureId}
          onClose={() => {
            setSelectedFeatureId(null);
            setSelectedFeature(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
