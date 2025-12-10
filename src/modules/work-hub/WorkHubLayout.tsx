import React from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Globe, List, Layers, Package, Plus, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export function WorkHubLayout() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs: Tab[] = [
    { id: 'summary', label: 'Summary', icon: <Globe className="h-4 w-4" />, path: 'summary' },
    { id: 'list', label: 'List', icon: <List className="h-4 w-4" />, path: 'list' },
    { id: 'all-work', label: 'All work', icon: <Layers className="h-4 w-4" />, path: 'all-work' },
    { id: 'releases', label: 'Releases', icon: <Package className="h-4 w-4" />, path: 'releases' },
  ];

  const getActiveTab = () => {
    const path = location.pathname.split('/').pop() || 'summary';
    // Handle release details route
    if (location.pathname.includes('/releases/')) return 'releases';
    return path;
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path: string) => {
    navigate(`/projects/${projectKey}/${path}`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-2">
          <span className="hover:text-foreground cursor-pointer">Spaces</span>
        </div>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-foreground">
              {projectKey || 'Project'}
            </h1>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Users className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Share, Actions icons would go here */}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-background">
        <div className="flex items-center px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id || (tab.id === 'summary' && activeTab === projectKey)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button
            className="flex items-center justify-center w-8 h-8 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            title="Add tab"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

export default WorkHubLayout;
