import { PageChrome } from '@/components/layout/PageChrome';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserCheck, AlertTriangle, TrendingUp, Download, Plus, Bot } from 'lucide-react';
import { useCapacityData } from '@/modules/capacity-planner';
import { exportCapacityToPdf } from '@/modules/capacity-planner';
import { cn } from '@/lib/utils';

export default function CapacityPlannerPage() {
  const { metrics, projects, isLoading } = useCapacityData();

  const handleExport = () => {
    exportCapacityToPdf({
      resources: metrics.resources,
      summary: metrics.summary,
      period: 'Q1 2025',
      generatedAt: new Date(),
    });
  };

  if (isLoading) {
    return (
      <PageChrome>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading capacity data...</div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Capacity Planner</h1>
            <p className="text-sm text-muted-foreground">Resource allocation and capacity management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 p-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total Resources</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <UserCheck className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.summary.available + metrics.summary.healthy}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.summary.atCapacity}</p>
                  <p className="text-xs text-muted-foreground">At Capacity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.summary.overAllocated}</p>
                  <p className="text-xs text-muted-foreground">Over-allocated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.summary.avgUtilization}%</p>
                  <p className="text-xs text-muted-foreground">Avg Utilization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resource Cards Grid */}
        <div className="flex-1 overflow-auto p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {metrics.resources.map((resource) => (
              <Card key={resource.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resource.avatar_url} />
                        <AvatarFallback>{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm font-medium">{resource.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{resource.role}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        resource.status === 'available' && 'border-teal-500 text-teal-500',
                        resource.status === 'healthy' && 'border-green-500 text-green-500',
                        resource.status === 'at_capacity' && 'border-amber-500 text-amber-500',
                        resource.status === 'over_allocated' && 'border-red-500 text-red-500'
                      )}
                    >
                      {resource.allocation}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          resource.allocation <= 80 && 'bg-teal-500',
                          resource.allocation > 80 && resource.allocation <= 100 && 'bg-amber-500',
                          resource.allocation > 100 && 'bg-red-500'
                        )}
                        style={{ width: `${Math.min(resource.allocation, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {resource.assignments.length} active assignment{resource.assignments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Assistant FAB */}
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    </PageChrome>
  );
}
