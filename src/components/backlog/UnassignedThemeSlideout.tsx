import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, GripVertical } from 'lucide-react';
import { ThemeContextMenu } from './ThemeContextMenu';

interface UnassignedThemeSlideoutProps {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string | null;
}

export function UnassignedThemeSlideout({ open, onClose, portfolioId }: UnassignedThemeSlideoutProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: themes } = useQuery({
    queryKey: ['unassigned-themes', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .is('portfolio_id', null) // Unassigned themes
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filteredThemes = themes?.filter(theme =>
    theme.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMoveToPI = (themeId: string) => {
    console.log('Move to PI:', themeId);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Unassigned Backlog</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Themes List */}
          <div className="space-y-2">
            {filteredThemes?.map((theme, index) => (
              <ThemeContextMenu
                key={theme.id}
                onOpen={() => console.log('Open', theme.id)}
                onDuplicate={() => console.log('Duplicate', theme.id)}
                onMoveToTop={() => console.log('Move to top', theme.id)}
                onMoveToBottom={() => console.log('Move to bottom', theme.id)}
                onMoveToPosition={() => console.log('Move to position', theme.id)}
                onMoveToPI={() => handleMoveToPI(theme.id)}
                onMoveToUnassigned={() => console.log('Already unassigned')}
                onDelete={() => console.log('Delete', theme.id)}
              >
                <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer group">
                  <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{theme.name}</p>
                    {theme.description && (
                      <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                </div>
              </ThemeContextMenu>
            ))}
            
            {filteredThemes?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No unassigned themes found</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
