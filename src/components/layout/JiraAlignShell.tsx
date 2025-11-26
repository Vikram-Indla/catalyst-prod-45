import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, Search, Bell, CheckSquare, HelpCircle, Settings, 
  User, ChevronDown, LayoutGrid, Star
} from 'lucide-react';
import { PortfolioDropdown } from './dropdowns/PortfolioDropdown';
import { StarredDropdown } from './dropdowns/StarredDropdown';
import { ItemsDropdown } from './dropdowns/ItemsDropdown';
import { CreateDropdown } from './dropdowns/CreateDropdown';
import { NotificationsPanel } from './dropdowns/NotificationsPanel';

export function JiraAlignShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(2);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const closeDropdown = () => setActiveDropdown(null);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Global Header */}
      <header className="h-14 border-b bg-card flex items-center px-4 gap-4 sticky top-0 z-50">
        {/* Left: Logo + Primary Menus */}
        <div className="flex items-center gap-6 flex-1">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/home')}
          >
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Catalyst</span>
          </div>

          <nav className="flex items-center gap-1">
            <Button
              variant={isActive('/home') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => { navigate('/home'); closeDropdown(); }}
            >
              Home
            </Button>
            <Button variant="ghost" size="sm">
              Enterprise
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDropdown('portfolio')}
                className={activeDropdown === 'portfolio' ? 'bg-accent' : ''}
              >
                Portfolio <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
              {activeDropdown === 'portfolio' && (
                <PortfolioDropdown onClose={closeDropdown} />
              )}
            </div>
            <Button variant="ghost" size="sm">
              Solution <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              Program <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              Team <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              Product <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              Custom Rooms <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </nav>
        </div>

        {/* Center: Starred, Items, Create */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleDropdown('starred')}
              className={activeDropdown === 'starred' ? 'bg-accent' : ''}
            >
              Starred <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {activeDropdown === 'starred' && (
              <StarredDropdown onClose={closeDropdown} />
            )}
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleDropdown('items')}
              className={activeDropdown === 'items' ? 'bg-accent' : ''}
            >
              Items <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {activeDropdown === 'items' && (
              <ItemsDropdown onClose={closeDropdown} />
            )}
          </div>

          <div className="relative">
            <Button
              variant="default"
              size="sm"
              onClick={() => toggleDropdown('create')}
            >
              Create
            </Button>
            {activeDropdown === 'create' && (
              <CreateDropdown onClose={closeDropdown} />
            )}
          </div>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleDropdown('notifications')}
              className={activeDropdown === 'notifications' ? 'bg-accent' : ''}
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>
            {activeDropdown === 'notifications' && (
              <NotificationsPanel 
                onClose={closeDropdown} 
                onClearAll={() => setNotificationCount(0)}
              />
            )}
          </div>
          <Button variant="ghost" size="icon">
            <CheckSquare className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
