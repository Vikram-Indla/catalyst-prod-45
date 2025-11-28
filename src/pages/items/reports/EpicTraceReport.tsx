import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EpicTraceReport() {
  const { epicId } = useParams();
  const navigate = useNavigate();

  const { data: epic } = useQuery({
    queryKey: ['epic', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs(name),
          features:features(
            id,
            name,
            display_id,
            stories:stories(
              id,
              name,
              status
            )
          )
        `)
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const handleExport = () => {
    // Export logic here
    alert('Export functionality to be implemented');
  };

  if (!epic) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Epic Trace Report</h1>
              <p className="text-muted-foreground">{epic.name}</p>
            </div>
          </div>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Epic Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Epic Key:</span>
              <div className="font-medium">{epic.epic_key || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">State:</span>
              <div className="font-medium">{epic.state}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Theme:</span>
              <div className="font-medium">{epic.strategic_themes?.name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Program:</span>
              <div className="font-medium">{epic.programs?.name || 'N/A'}</div>
            </div>
          </div>
          {epic.description && (
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">Description:</span>
              <p className="mt-1">{epic.description}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Feature & Story Hierarchy</h2>
          {epic.features && epic.features.length > 0 ? (
            <div className="space-y-4">
              {epic.features.map((feature: any) => (
                <div key={feature.id} className="border-l-4 border-primary pl-4">
                  <div className="font-medium">
                    {feature.display_id || feature.id.slice(0, 8)} - {feature.name}
                  </div>
                  {feature.stories && feature.stories.length > 0 && (
                    <div className="mt-2 ml-4 space-y-1">
                      {feature.stories.map((story: any) => (
                        <div key={story.id} className="text-sm text-muted-foreground">
                          • {story.name} ({story.status})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No features linked to this epic</p>
          )}
        </Card>
      </div>
    </div>
  );
}
