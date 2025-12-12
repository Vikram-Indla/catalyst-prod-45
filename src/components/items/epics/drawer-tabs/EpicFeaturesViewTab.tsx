/**
 * EpicFeaturesViewTab - New tab for Epic drawer
 * 
 * Contains the "Implementation Links" UI that was moved from Links tab.
 * Shows linked Features under this Epic.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, GitBranch } from 'lucide-react';

interface EpicFeaturesViewTabProps {
  epicId: string;
}

export function EpicFeaturesViewTab({ epicId }: EpicFeaturesViewTabProps) {
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

  return (
    <div className="p-4 md:p-5 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked Features ({features?.length || 0})</h3>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Link Feature
        </Button>
      </div>

      {/* Features List */}
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
  );
}
