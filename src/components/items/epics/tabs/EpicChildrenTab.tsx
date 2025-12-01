import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';

interface EpicChildrenTabProps {
  epic: any;
}

export function EpicChildrenTab({ epic }: EpicChildrenTabProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const { data: features, isLoading } = useQuery({
    queryKey: ['epic-children', epic?.id],
    queryFn: async () => {
      if (!epic?.id) return [];
      
      const { data, error } = await supabase
        .from('features')
        .select('*, teams(name), programs(name)')
        .eq('epic_id', epic.id)
        .order('global_rank');

      if (error) throw error;
      return data || [];
    },
    enabled: !!epic?.id,
  });

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature);
    setSelectedFeatureId(feature.id);
  };

  if (!epic) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Epic data not available
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!features || features.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No features found for this epic
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Features ({features.length})</h3>
        </div>

        <div className="space-y-2">
          {features.map((feature) => (
            <Card 
              key={feature.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleFeatureClick(feature)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {feature.display_id || 'F-???'}
                      </span>
                      {feature.status && (
                        <Badge variant="outline" className="text-xs">
                          {feature.status}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-2 line-clamp-2">
                      {feature.name}
                    </h4>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feature.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {feature.teams?.name && (
                      <Badge variant="secondary" className="text-xs">
                        {feature.teams.name}
                      </Badge>
                    )}
                    {feature.estimate_points !== null && (
                      <span className="text-sm text-muted-foreground">
                        {feature.estimate_points} pts
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <FeatureDetailsPanel
        feature={selectedFeature}
        open={!!selectedFeatureId}
        onClose={() => {
          setSelectedFeatureId(null);
          setSelectedFeature(null);
        }}
      />
    </>
  );
}
