import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const HUB_TABS = [
  { label: 'Home', path: '/for-you' },
  { label: 'StrategyHub', path: '/strategyhub' },
  { label: 'ProductHub', path: '/producthub' },
  { label: 'ProjectHub', path: '/projecthub' },
  { label: 'ReleaseHub', path: '/releases' },
  { label: 'TestHub', path: '/testhub' },
  { label: 'IncidentHub', path: '/incident' },
  { label: 'TaskHub', path: '/planner' },
  { label: 'PlanHub', path: '/planhub' },
];

/* Inline SVG icons */
const DiamondIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2L18 10L10 18L2 10L10 2Z" fill="hsl(217 91% 53%)" />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/producthub') return location.pathname.startsWith('/producthub');
    if (path === '/planhub') return location.pathname.startsWith('/planhub');
    if (path === '/strategyhub') return location.pathname.startsWith('/strategyhub') || location.pathname.startsWith('/strategy');
    return location.pathname.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border-default z-50 flex items-center px-4 gap-2">
      {/* Left: Logo */}
      <button
        onClick={() => navigate('/for-you')}
        className="flex items-center gap-2 mr-4 shrink-0"
      >
        <DiamondIcon />
        <span className="text-base font-bold tracking-tight text-foreground">
          Cata<span className="text-blue-600">lyst</span>
          <span className="text-[10px] font-normal text-muted-foreground align-top ml-0.5">™</span>
        </span>
      </button>

      {/* Center: Hub tabs */}
      <nav className="flex items-center gap-1 h-full flex-1 justify-center">
        {HUB_TABS.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'relative h-full flex items-center px-3 text-table-base font-medium transition-colors duration-100',
                active
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Create button */}
        <button className="flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 text-white text-table-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-100">
          <PlusIcon />
          Create
        </button>

        {/* Bell */}
        <button className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted transition-colors duration-100">
          <BellIcon />
        </button>

        {/* Gear */}
        <button className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted transition-colors duration-100">
          <GearIcon />
        </button>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search anything… ⌘K"
            className="w-[200px] h-8 pl-8 pr-3 text-table-sm bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-100"
            style={{ WebkitAppearance: 'none' } as React.CSSProperties}
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <SearchIcon />
          </div>
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[11px] font-semibold ml-1 cursor-pointer">
          AK
        </div>
      </div>
    </header>
  );
}

export default TopNav;
