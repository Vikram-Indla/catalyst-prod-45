import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Minimize2, X, HelpCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PanelHeaderProps {
  onRefresh: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onSettingsClick: () => void;
  isRefreshing?: boolean;
}

export function PanelHeader({
  onRefresh,
  onCollapse,
  onClose,
  onSettingsClick,
  isRefreshing = false,
}: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] text-[#feffff] border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚗️</span>
        <h2 className="text-sm font-semibold">Catalyst Tests</h2>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#feffff] hover:text-[#c69c6d] hover:bg-transparent"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#feffff] hover:text-[#c69c6d] hover:bg-transparent"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Panel Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              Configure Panel
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Documentation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#feffff] hover:text-[#c69c6d] hover:bg-transparent"
          onClick={onCollapse}
        >
          <Minimize2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#feffff] hover:text-[#c69c6d] hover:bg-transparent"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
