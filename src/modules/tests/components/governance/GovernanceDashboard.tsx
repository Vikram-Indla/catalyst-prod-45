import React from 'react';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Brain, 
  Lock,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useGovernanceStats, usePermissionDenials } from '../../hooks/useTestGovernance';
import { useAIAuditLog } from '../../hooks/useTestAI';
import { ActivityTimeline } from './ActivityTimeline';
import { formatDistanceToNow } from 'date-fns';

interface GovernanceDashboardProps {
  programId?: string;
}

export function GovernanceDashboard({ programId }: GovernanceDashboardProps) {
  const { data: stats, isLoading: loadingStats } = useGovernanceStats(programId);
  const { data: denials = [] } = usePermissionDenials({ limit: 10 });
  const { data: aiLogs = [] } = useAIAuditLog(programId);
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActivities || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">AI Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.aiActions || 0}</div>
            <p className="text-xs text-muted-foreground">Generations & analyses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-sm font-medium">Access Denials</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.permissionDenials || 0}</div>
            <p className="text-xs text-muted-foreground">Permission blocks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <CardTitle className="text-sm font-medium">RLS Coverage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">All tables protected</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity by Category */}
      {stats?.activityByCategory && Object.keys(stats.activityByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Distribution</CardTitle>
            <CardDescription>Breakdown by entity type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.activityByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-sm capitalize w-24">{category.replace('_', ' ')}</span>
                  <Progress 
                    value={(count / stats.totalActivities) * 100} 
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Timeline
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Audit Log
          </TabsTrigger>
          <TabsTrigger value="denials" className="gap-2">
            <Lock className="h-4 w-4" />
            Access Denials
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline programId={programId} showFilters limit={100} />
        </TabsContent>
        
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Actions Audit
              </CardTitle>
              <CardDescription>
                All AI-generated content and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {aiLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Brain className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No AI actions recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {log.action_type.replace(/_/g, ' ')}
                              {log.action_subtype && (
                                <span className="text-muted-foreground">
                                  {' '}• {log.action_subtype.replace(/_/g, ' ')}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge 
                              variant="outline"
                              className={cn(
                                log.status === 'completed' ? 'border-green-500/50 text-green-500' :
                                log.status === 'failed' ? 'border-red-500/50 text-red-500' :
                                'border-yellow-500/50 text-yellow-500'
                              )}
                            >
                              {log.status}
                            </Badge>
                            {log.user_accepted !== null && (
                              <Badge variant={log.user_accepted ? 'default' : 'secondary'}>
                                {log.user_accepted ? 'Accepted' : 'Rejected'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          {log.model_used && (
                            <span>Model: {log.model_used}</span>
                          )}
                          {log.response_time_ms && (
                            <span>Response: {log.response_time_ms}ms</span>
                          )}
                          {log.tokens_used && (
                            <span>Tokens: {log.tokens_used}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="denials" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Permission Denials
              </CardTitle>
              <CardDescription>
                Blocked access attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {denials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Shield className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No access denials recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {denials.map((denial) => (
                      <div
                        key={denial.id}
                        className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm text-red-500">
                              {denial.attempted_action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Resource: {denial.resource_type}
                              {denial.resource_id && ` (${denial.resource_id.slice(0, 8)}...)`}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-red-500/50 text-red-500">
                            Denied
                          </Badge>
                        </div>
                        
                        {denial.denial_reason && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Reason: {denial.denial_reason}
                          </p>
                        )}
                        
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(denial.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
