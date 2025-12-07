import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Download } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

/**
 * Changes Log Page - Track all system configuration changes
 * Source: Administration guide PDF, Page 36
 */
export default function ChangesLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Mock changes data
  const changes = [
    {
      id: '1',
      timestamp: new Date('2024-01-15T14:30:00'),
      user: 'John Admin',
      type: 'configuration',
      entity: 'Team Settings',
      action: 'Updated capacity allocation',
      details: 'Changed team capacity from 80 to 90 story points',
    },
    {
      id: '2',
      timestamp: new Date('2024-01-15T13:15:00'),
      user: 'Sarah Manager',
      type: 'work_item',
      entity: 'Epic #1234',
      action: 'Status changed',
      details: 'Moved from In Progress to Done',
    },
    {
      id: '3',
      timestamp: new Date('2024-01-15T11:45:00'),
      user: 'Mike Lead',
      type: 'user_management',
      entity: 'User Roles',
      action: 'Role assigned',
      details: 'Assigned Program Manager role to user jane.doe@company.com',
    },
    {
      id: '4',
      timestamp: new Date('2024-01-15T10:20:00'),
      user: 'John Admin',
      type: 'configuration',
      entity: 'Work Codes',
      action: 'Created new work code',
      details: 'Added work code CAPEX-2024 for capital projects',
    },
    {
      id: '5',
      timestamp: new Date('2024-01-15T09:00:00'),
      user: 'Sarah Manager',
      type: 'data',
      entity: 'Program Increment',
      action: 'PI created',
      details: 'Created PI-6 with dates 2024-02-01 to 2024-04-30',
    },
    {
      id: '6',
      timestamp: new Date('2024-01-14T16:30:00'),
      user: 'John Admin',
      type: 'configuration',
      entity: 'Terminology',
      action: 'Updated terminology',
      details: 'Changed "Sprint" to "Iteration" across platform',
    },
    {
      id: '7',
      timestamp: new Date('2024-01-14T15:10:00'),
      user: 'Mike Lead',
      type: 'work_item',
      entity: 'Feature #567',
      action: 'Assignment changed',
      details: 'Reassigned from Team Alpha to Team Beta',
    },
    {
      id: '8',
      timestamp: new Date('2024-01-14T14:00:00'),
      user: 'John Admin',
      type: 'integration',
      entity: 'Jira Integration',
      action: 'Configuration updated',
      details: 'Updated sync frequency to every 15 minutes',
    },
  ];

  const filteredChanges = changes.filter(change => {
    const matchesSearch = 
      change.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      change.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      change.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      change.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || change.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'configuration': return 'bg-blue-100 text-blue-700';
      case 'work_item': return 'bg-green-100 text-green-700';
      case 'user_management': return 'bg-purple-100 text-purple-700';
      case 'integration': return 'bg-orange-100 text-orange-700';
      case 'data': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const stats = {
    total: changes.length,
    today: changes.filter(c => 
      format(c.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length,
    configuration: changes.filter(c => c.type === 'configuration').length,
    workItems: changes.filter(c => c.type === 'work_item').length,
  };

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="h-[72px] flex items-center justify-between border-b bg-card px-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">Changes Log</h1>
            <p className="text-sm text-muted-foreground truncate">
              Track all system configuration and data changes
            </p>
          </div>
          <Button variant="outline" className="flex-shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-gold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Configuration Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.configuration}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Work Item Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workItems}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change History</CardTitle>
            <CardDescription>
              Complete audit trail of all system changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search changes..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Changes</SelectItem>
                  <SelectItem value="configuration">Configuration</SelectItem>
                  <SelectItem value="work_item">Work Items</SelectItem>
                  <SelectItem value="user_management">User Management</SelectItem>
                  <SelectItem value="integration">Integrations</SelectItem>
                  <SelectItem value="data">Data Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredChanges.map((change) => (
                <div
                  key={change.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{change.entity}</span>
                        <Badge variant="outline" className={`text-xs ${getTypeColor(change.type)}`}>
                          {change.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{change.action}</p>
                      <p className="text-sm">{change.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <span>Changed by: <span className="font-medium">{change.user}</span></span>
                    <span>{format(change.timestamp, 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>

            {filteredChanges.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">No changes found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
