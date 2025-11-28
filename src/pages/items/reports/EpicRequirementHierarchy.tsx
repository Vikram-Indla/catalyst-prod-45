import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function EpicRequirementHierarchy() {
  const { epicId } = useParams();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data: epic } = useQuery({
    queryKey: ['epic-hierarchy', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          capabilities:capabilities(
            id,
            name,
            capability_key,
            features:features(
              id,
              name,
              display_id,
              stories:stories(
                id,
                name,
                estimate_points,
                subtasks:subtasks(
                  id,
                  name,
                  status
                )
              )
            )
          ),
          features:features(
            id,
            name,
            display_id,
            capability_id,
            stories:stories(
              id,
              name,
              estimate_points,
              subtasks:subtasks(
                id,
                name,
                status
              )
            )
          )
        `)
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!epic) return <div className="p-8">Loading...</div>;

  const directFeatures = epic.features?.filter((f: any) => !f.capability_id) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Requirement Hierarchy</h1>
              <p className="text-muted-foreground">{epic.name}</p>
            </div>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Card className="p-6">
          <div className="space-y-2">
            {/* Epic Level */}
            <div className="font-bold text-lg flex items-center gap-2">
              <span className="text-primary">Epic:</span>
              {epic.epic_key || epic.id.slice(0, 8)} - {epic.name}
            </div>

            {/* Capabilities */}
            {epic.capabilities && epic.capabilities.length > 0 && (
              <div className="ml-8 space-y-2 mt-4">
                {epic.capabilities.map((capability: any) => (
                  <div key={capability.id} className="border-l-4 border-blue-500 pl-4">
                    <button
                      onClick={() => toggleExpand(`cap-${capability.id}`)}
                      className="flex items-center gap-2 font-semibold hover:underline"
                    >
                      {expandedItems.has(`cap-${capability.id}`) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-blue-600">Capability:</span>
                      {capability.capability_key || capability.id.slice(0, 8)} - {capability.name}
                    </button>

                    {/* Features under Capability */}
                    {expandedItems.has(`cap-${capability.id}`) && capability.features && (
                      <div className="ml-8 mt-2 space-y-2">
                        {capability.features.map((feature: any) => (
                          <div key={feature.id} className="border-l-4 border-green-500 pl-4">
                            <button
                              onClick={() => toggleExpand(`feat-${feature.id}`)}
                              className="flex items-center gap-2 font-medium hover:underline"
                            >
                              {expandedItems.has(`feat-${feature.id}`) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="text-green-600">Feature:</span>
                              {feature.display_id || feature.id.slice(0, 8)} - {feature.name}
                            </button>

                            {/* Stories */}
                            {expandedItems.has(`feat-${feature.id}`) && feature.stories && (
                              <div className="ml-8 mt-2 space-y-1">
                                {feature.stories.map((story: any) => (
                                  <div key={story.id} className="text-sm">
                                    <button
                                      onClick={() => toggleExpand(`story-${story.id}`)}
                                      className="flex items-center gap-2 hover:underline"
                                    >
                                      {expandedItems.has(`story-${story.id}`) ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      <span className="text-orange-600">Story:</span>
                                      {story.name} ({story.estimate_points || 0} pts)
                                    </button>

                                    {/* Subtasks */}
                                    {expandedItems.has(`story-${story.id}`) && story.subtasks && (
                                      <div className="ml-8 mt-1 space-y-1">
                                        {story.subtasks.map((subtask: any) => (
                                          <div key={subtask.id} className="text-xs text-muted-foreground">
                                            • {subtask.name} ({subtask.status})
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Direct Features (no capability) */}
            {directFeatures.length > 0 && (
              <div className="ml-8 space-y-2 mt-4">
                {directFeatures.map((feature: any) => (
                  <div key={feature.id} className="border-l-4 border-green-500 pl-4">
                    <button
                      onClick={() => toggleExpand(`feat-${feature.id}`)}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      {expandedItems.has(`feat-${feature.id}`) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-green-600">Feature:</span>
                      {feature.display_id || feature.id.slice(0, 8)} - {feature.name}
                    </button>

                    {/* Stories */}
                    {expandedItems.has(`feat-${feature.id}`) && feature.stories && (
                      <div className="ml-8 mt-2 space-y-1">
                        {feature.stories.map((story: any) => (
                          <div key={story.id} className="text-sm">
                            <button
                              onClick={() => toggleExpand(`story-${story.id}`)}
                              className="flex items-center gap-2 hover:underline"
                            >
                              {expandedItems.has(`story-${story.id}`) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span className="text-orange-600">Story:</span>
                              {story.name} ({story.estimate_points || 0} pts)
                            </button>

                            {/* Subtasks */}
                            {expandedItems.has(`story-${story.id}`) && story.subtasks && (
                              <div className="ml-8 mt-1 space-y-1">
                                {story.subtasks.map((subtask: any) => (
                                  <div key={subtask.id} className="text-xs text-muted-foreground">
                                    • {subtask.name} ({subtask.status})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
