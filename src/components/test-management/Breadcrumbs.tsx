import { useLocation, Link, useParams } from 'react-router-dom';
import { ChevronRight, Home, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: LucideIcon;
}

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();
  
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/home', icon: Home }
    ];
    
    // Add program context
    if (params.programId) {
      items.push({
        label: 'Program',
        path: `/programs/${params.programId}`,
      });
    }
    
    // Add Tests
    if (path.includes('/tests')) {
      items.push({
        label: 'Tests',
        path: `/programs/${params.programId}/tests`,
      });
      
      // Add specific section
      if (path.includes('/cases')) {
        items.push({ label: 'Cases', path: `${items[items.length - 1].path}/cases` });
      } else if (path.includes('/sets')) {
        items.push({ label: 'Sets', path: `${items[items.length - 1].path}/sets` });
      } else if (path.includes('/cycles')) {
        items.push({ label: 'Cycles', path: `${items[items.length - 1].path}/cycles` });
      } else if (path.includes('/executions')) {
        items.push({ label: 'Executions', path: `${items[items.length - 1].path}/executions` });
      } else if (path.includes('/reports')) {
        items.push({ label: 'Reports', path: `${items[items.length - 1].path}/reports` });
      }
      
      // Add item ID if present
      if (params.id) {
        const itemType = path.includes('/cases') ? 'Case' : 
                        path.includes('/sets') ? 'Set' : 
                        path.includes('/cycles') ? 'Cycle' : 
                        path.includes('/executions') ? 'Execution' : 'Item';
        items.push({ label: `${itemType} Details`, path: location.pathname });
      }
    }
    
    return items;
  }, [location.pathname, params]);

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = item.icon;
        
        return (
          <div key={item.path} className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            {isLast ? (
              <span className="font-semibold text-foreground">{item.label}</span>
            ) : (
              <>
                <Link
                  to={item.path}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
