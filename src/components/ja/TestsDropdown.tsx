import { useNavigate, useParams } from 'react-router-dom';
import { FlaskConical, Calendar, FolderKanban, Layers, FileText, BookOpen, LayoutDashboard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface TestsDropdownProps {
  isActive?: boolean;
}

export function TestsDropdown({ isActive }: TestsDropdownProps) {
  const navigate = useNavigate();
  const { programId } = useParams<{ programId: string }>();

  const testPages = [
    { 
      label: 'Overview', 
      icon: LayoutDashboard,
      path: `/programs/${programId}/tests/overview`
    },
    { 
      label: 'Cases', 
      icon: FolderKanban,
      path: `/programs/${programId}/tests/cases`
    },
    { 
      label: 'Sets', 
      icon: Layers,
      path: `/programs/${programId}/tests/sets`
    },
    { 
      label: 'Cycles', 
      icon: Calendar,
      path: `/programs/${programId}/tests/cycles`
    },
    { 
      label: 'Step Library', 
      icon: BookOpen,
      path: `/programs/${programId}/tests/library`
    },
    { 
      label: 'Reports', 
      icon: FileText,
      path: `/programs/${programId}/tests/reports`
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 px-3 text-sm font-medium hover:bg-accent/50 ${
            isActive ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <FlaskConical className="h-4 w-4 mr-2" />
          Tests
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-popover">
        {testPages.map((page) => {
          const Icon = page.icon;
          return (
            <DropdownMenuItem
              key={page.path}
              onClick={() => navigate(page.path)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-2" />
              {page.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
