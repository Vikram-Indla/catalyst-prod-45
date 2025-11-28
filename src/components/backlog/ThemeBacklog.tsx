import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Filter, Columns3, Download, Upload, Plus } from 'lucide-react';

// Citation: (Doc: Backlog for themes - PDF provided)
// Citation: (Screenshot: c2770448-efec-46c5-a69d-09164f3860c1.png)

interface ThemeBacklogProps {
  portfolioId: string;
  piId?: string;
}

export function ThemeBacklog({ portfolioId, piId }: ThemeBacklogProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Fetch themes
  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes', portfolioId, piId],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });

      // TODO: Add portfolio filtering when portfolio_id field is added to themes table
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setColumnsOpen(!columnsOpen)}
            >
              <Columns3 className="h-4 w-4" />
              Columns Shown
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Theme
            </Button>
          </div>
        </div>
      </div>

      {/* Theme List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading themes...</div>
        ) : themes && themes.length > 0 ? (
          <div className="space-y-2">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{theme.name}</h3>
                    {theme.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {theme.description}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ID: {theme.id.slice(0, 8)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 border border-dashed rounded-lg p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No themes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {piId 
                ? `No themes assigned to the selected Program Increment` 
                : `Get started by creating your first strategic theme`}
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Theme
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
