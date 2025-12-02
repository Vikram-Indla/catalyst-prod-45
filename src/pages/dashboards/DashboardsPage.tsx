import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardBuilder } from '@/components/dashboards/DashboardBuilder';
import { DashboardGrid } from '@/components/dashboards/DashboardGrid';
import { GadgetPosition, GadgetType } from '@/types/dashboard.types';
import { Plus, LayoutDashboard, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Default dashboard with sample gadgets
const DEFAULT_GADGETS: GadgetPosition[] = [
  { id: '1', gadgetType: 'project_overview', config: {}, x: 0, y: 0, width: 1, height: 1 },
  { id: '2', gadgetType: 'execution_distribution', config: {}, x: 1, y: 0, width: 1, height: 1 },
  { id: '3', gadgetType: 'execution_burndown', config: {}, x: 2, y: 0, width: 1, height: 1 },
  { id: '4', gadgetType: 'top_contributors', config: {}, x: 0, y: 1, width: 1, height: 1 },
  { id: '5', gadgetType: 'defect_summary', config: {}, x: 1, y: 1, width: 1, height: 1 }
];

interface SavedDashboard {
  id: string;
  name: string;
  gadgets: GadgetPosition[];
  isDefault?: boolean;
}

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([
    { id: 'default', name: 'My Dashboard', gadgets: DEFAULT_GADGETS, isDefault: true }
  ]);
  const [activeDashboard, setActiveDashboard] = useState<string>('default');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const currentDashboard = dashboards.find(d => d.id === activeDashboard);

  const handleSaveDashboard = (gadgets: GadgetPosition[]) => {
    if (isCreating) {
      const newDashboard: SavedDashboard = {
        id: crypto.randomUUID(),
        name: `Dashboard ${dashboards.length + 1}`,
        gadgets
      };
      setDashboards([...dashboards, newDashboard]);
      setActiveDashboard(newDashboard.id);
      setIsCreating(false);
      toast.success('Dashboard created');
    } else {
      setDashboards(dashboards.map(d => 
        d.id === activeDashboard ? { ...d, gadgets } : d
      ));
      setIsEditing(false);
      toast.success('Dashboard saved');
    }
  };

  const handleDeleteDashboard = (id: string) => {
    if (dashboards.length <= 1) {
      toast.error('Cannot delete the last dashboard');
      return;
    }
    setDashboards(dashboards.filter(d => d.id !== id));
    if (activeDashboard === id) {
      setActiveDashboard(dashboards[0].id);
    }
    toast.success('Dashboard deleted');
  };

  if (isEditing || isCreating) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">
          {isCreating ? 'Create Dashboard' : 'Edit Dashboard'}
        </h1>
        <DashboardBuilder
          initialGadgets={isCreating ? [] : currentDashboard?.gadgets}
          onSave={handleSaveDashboard}
          onCancel={() => {
            setIsEditing(false);
            setIsCreating(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-brand-gold" />
            Dashboards
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your test management dashboards
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Dashboard
        </Button>
      </div>

      {/* Dashboard Selector */}
      <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
        {dashboards.map(dashboard => (
          <Card
            key={dashboard.id}
            className={`cursor-pointer transition-colors min-w-[200px] ${
              activeDashboard === dashboard.id 
                ? 'border-brand-gold bg-brand-gold/5' 
                : 'hover:border-brand-gold/50'
            }`}
            onClick={() => setActiveDashboard(dashboard.id)}
          >
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{dashboard.name}</CardTitle>
                {activeDashboard === dashboard.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {!dashboard.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDashboard(dashboard.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">
                {dashboard.gadgets.length} gadgets
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Active Dashboard */}
      {currentDashboard && (
        <DashboardGrid gadgets={currentDashboard.gadgets} />
      )}
    </div>
  );
}
