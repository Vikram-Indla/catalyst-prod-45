import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Box, ListTree, Map, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const menuItems = [
  { title: 'Product Room', path: '/industry', icon: Box },
  { title: 'Backlog', path: '/industry/backlog', icon: ListTree },
  { title: 'Roadmaps', path: '/industry/roadmaps', icon: Map },
  { title: 'Reports', path: '/industry/reports', icon: TrendingUp },
];

const digitalTransformationOptions = [
  { value: 'digital-maturity', label: 'Digital Maturity' },
  { value: 'enhancements', label: 'Enhancements' },
  { value: 'entities', label: 'Entities' },
  { value: 'projects', label: 'Projects' },
];

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedTransformation, setSelectedTransformation] = useState('digital-maturity');

  const isActive = (path: string) => location.pathname === path;

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full border-r bg-card flex flex-col transition-all duration-300',
          expanded ? 'w-64' : 'w-16',
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                PR
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Product</span>
                <span className="text-xs text-muted-foreground">Digital Transformation</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm mx-auto">
              PR
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('h-8 w-8', !expanded && 'mx-auto mt-2')}
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Digital Transformation Selector */}
        {expanded && (
          <div className="p-4 border-b">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Digital Transformation
            </span>
            <Select value={selectedTransformation} onValueChange={setSelectedTransformation}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {digitalTransformationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            if (!expanded) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full h-10 flex items-center justify-center',
                        active && 'bg-brand-gold/10 text-brand-gold'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full justify-start gap-3 h-10',
                  active && 'bg-brand-gold/10 text-brand-gold'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Button>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
