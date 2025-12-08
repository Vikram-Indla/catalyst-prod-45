import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Building2, Plus, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CreateEntityDialog } from '@/components/dialogs/CreateEntityDialog';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
}

export function ProgramSelectorDropdown({ onClose }: ProgramSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (programs || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (programId: string, programName: string) => {
    navigate(`/program/${programId}/room`);
    onClose();
  };

  const handleCreateClick = () => {
    setShowCreateDialog(true);
  };

  const handleManageClick = () => {
    navigate('/admin/portfolios');
    onClose();
  };

  const handleCreateSuccess = (entity: { id: string; name: string }) => {
    navigate(`/program/${entity.id}/room`);
    onClose();
  };

  return (
    <>
      <div className="w-80 bg-popover border rounded-md shadow-lg">
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground mb-2">PROGRAMS</p>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8 h-9"
            />
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {search ? 'No programs found' : 'No programs available'}
              </div>
            ) : (
              filtered.map((program) => (
                <button
                  key={program.id}
                  onClick={() => handleSelect(program.id, program.name)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {program.name}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Bottom Actions */}
        <div className="border-t">
          <div className="p-2 space-y-1">
            <button
              onClick={handleCreateClick}
              className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2 text-brand-gold font-medium"
            >
              <Plus className="h-4 w-4" />
              Create Program
            </button>
            <Separator className="my-1" />
            <button
              onClick={handleManageClick}
              className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2 text-muted-foreground"
            >
              <Settings className="h-4 w-4" />
              Manage Programs
            </button>
          </div>
        </div>
      </div>

      <CreateEntityDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        entityType="program"
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
