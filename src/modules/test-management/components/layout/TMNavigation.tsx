/**
 * TMNavigation - Top navigation tabs for Test Management module
 */

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  RefreshCw, 
  Play,
  Bug, 
  BarChart3, 
  Settings,
  Plus,
  ChevronDown,
  TestTube2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TMNavigationProps {
  projectKey?: string;
  onCreateClick?: (type: 'case' | 'cycle' | 'defect') => void;
}

const navItems = [
  { id: 'my-work', label: 'My Work', icon: LayoutDashboard, href: '/tests/my-work' },
  { id: 'cases', label: 'Cases', icon: FileText, href: '/tests/cases' },
  { id: 'cycles', label: 'Cycles', icon: RefreshCw, href: '/tests/cycles' },
  { id: 'defects', label: 'Defects', icon: Bug, href: '/tests/defects' },
  { id: 'reports', label: 'Reports', icon: BarChart3, href: '/tests/reports' },
];

const createOptions = [
  { type: 'case' as const, label: 'Test Case', icon: FileText },
  { type: 'cycle' as const, label: 'Test Cycle', icon: RefreshCw },
  { type: 'defect' as const, label: 'Defect', icon: Bug },
];

export function TMNavigation({ projectKey, onCreateClick }: TMNavigationProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <nav className="border-b border-border bg-card">
      <div className="flex items-center justify-between h-12 px-4">
        {/* Logo & Project */}
        <div className="flex items-center gap-3">
          <Link to="/tests/my-work" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
              <TestTube2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Test Management</span>
          </Link>
          {projectKey && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {projectKey}
              </span>
            </>
          )}
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const isActive = currentPath.startsWith(item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {createOptions.map(option => (
                <DropdownMenuItem
                  key={option.type}
                  onClick={() => onCreateClick?.(option.type)}
                  className="gap-2 cursor-pointer"
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link to="/tests/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
