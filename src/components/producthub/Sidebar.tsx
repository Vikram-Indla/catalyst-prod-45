import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* Inline SVG icons (16px) */
const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);

const KanbanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="14" rx="1" />
    <rect x="10" y="3" width="5" height="10" rx="1" />
    <rect x="17" y="3" width="5" height="18" rx="1" />
  </svg>
);

const TimelineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h13M3 12h18M3 18h10" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const GearSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  hasChevron?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Product Backlog', path: '/producthub/backlog', icon: <TableIcon /> },
  { label: 'Product Kanban', path: '/producthub/kanban', icon: <KanbanIcon /> },
  { label: 'Product Roadmap', path: '/producthub/roadmap', icon: <TimelineIcon /> },
  
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/producthub/backlog') {
      return location.pathname === '/producthub/backlog' || location.pathname === '/producthub';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-60 bg-background border-r border-border-default z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <span className="text-sm font-semibold text-foreground">Product Hub</span>
        <button className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-100">
          <CollapseIcon />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-table-base transition-colors duration-100',
                active
                  ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/30 dark:text-blue-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className={cn('shrink-0', active ? 'text-blue-600 dark:text-blue-400' : '')}>
                {item.icon}
              </span>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.hasChevron && (
                <span className="shrink-0 text-muted-foreground">
                  <ChevronRightIcon />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom settings */}
      <div className="px-4 pb-4 pt-2">
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-100">
          <GearSmallIcon />
          Product Settings
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
