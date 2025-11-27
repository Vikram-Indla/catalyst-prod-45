import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, Search, Bell, CheckSquare, HelpCircle, Settings, 
  User, ChevronDown, LayoutGrid
} from 'lucide-react';
import { PortfolioDropdown } from './dropdowns/PortfolioDropdown';
import { StarredDropdown } from './dropdowns/StarredDropdown';
import { ItemsDropdown } from './dropdowns/ItemsDropdown';
import { CreateDropdown } from './dropdowns/CreateDropdown';
import { NotificationsPanel } from './dropdowns/NotificationsPanel';
import { PortfolioRoomSidebar } from './PortfolioRoomSidebar';
import { LeftContextPanel } from './LeftContextPanel';
import { GlobalSearch } from './GlobalSearch';
import { JiraAlignContextProvider, useJiraAlignContext } from '@/contexts/JiraAlignContext';

function JiraAlignShellContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tier, setTier } = useJiraAlignContext();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPI, setSelectedPI] = useState<string | null>('pi-5');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Automatically set tier based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/enterprise')) {
      if (tier !== 'enterprise') setTier('enterprise');
    } else if (path.startsWith('/portfolio')) {
      if (tier !== 'portfolio') setTier('portfolio');
    } else if (path.startsWith('/program')) {
      if (tier !== 'program') setTier('program');
    } else if (path.startsWith('/team')) {
      if (tier !== 'team') setTier('team');
    }
  }, [location.pathname, tier, setTier]);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const closeDropdown = () => setActiveDropdown(null);

  const isActive = (path: string) => location.pathname === path;

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  return (
    <div className="min-h-screen flex flex-col bg-background" ref={dropdownRef}>
      {/* Global Header */}
      <header className="h-14 border-b bg-card flex items-center px-2 gap-4 sticky top-0 z-50">
        {/* Left: Logo + Primary Menus */}
        <div className="flex items-center gap-6 flex-1 pl-2">
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
            <Button 
              variant={isActive('/enterprise/strategy-room') ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => { 
                setTier('enterprise'); 
                navigate('/enterprise/strategy-room'); 
                closeDropdown(); 
              }}
            >
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
        <div className="flex items-center gap-2 pr-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSearchOpen(true)}
          >
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

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Main Content with Context Panel - Conditional Sidebar Based on Tier */}
        <div className="flex flex-1 overflow-hidden">
          {tier === 'enterprise' ? (
            <LeftContextPanel />
          ) : (
            <PortfolioRoomSidebar
              portfolioId="default-portfolio"
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(!sidebarExpanded)}
              selectedPI={selectedPI}
              onPIChange={setSelectedPI}
            />
          )}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
  );
}

export function JiraAlignShell() {
  return (
    <JiraAlignContextProvider>
      <JiraAlignShellContent />
    </JiraAlignContextProvider>
  );
}
