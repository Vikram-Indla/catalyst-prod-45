import { useState } from 'react';
import { Plus, FileText, FolderKanban, ListChecks, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function QuickCreateDropdown() {
  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const [createSetOpen, setCreateSetOpen] = useState(false);
  const [createCycleOpen, setCreateCycleOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-dark">
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setCreateCaseOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Create Case
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧C</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCreateSetOpen(true)}>
            <FolderKanban className="h-4 w-4 mr-2" />
            Create Set
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCreateCycleOpen(true)}>
            <ListChecks className="h-4 w-4 mr-2" />
            Create Cycle
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧Y</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <BarChart3 className="h-4 w-4 mr-2" />
            Create Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals would be rendered here */}
      {/* TODO: Add actual creation modals */}
    </>
  );
}
