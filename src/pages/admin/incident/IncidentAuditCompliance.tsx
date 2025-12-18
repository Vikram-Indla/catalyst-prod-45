import { useState } from 'react';
import { Download, FileText, Clock, RefreshCw, Vote, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ApprovalLog {
  id: string;
  committee_id: string;
  member_id: string;
  vote: string;
  comment: string | null;
  voted_at: string | null;
  created_at: string;
}

interface SLABreach {
  id: string;
  incident_id: string;
  response_breached: boolean;
  resolution_breached: boolean;
  response_due_at: string;
  resolution_due_at: string;
  created_at: string;
  incident?: { incident_key: string; title: string };
}

interface ConversionLog {
  id: string;
  incident_key: string;
  title: string;
  converted_to_type: string;
  converted_to_id: string;
  converted_at: string;
  conversion_reason: string | null;
}

interface HistoryLog {
  id: string;
  incident_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  incident?: { incident_key: string };
}

export default function IncidentAuditCompliance() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [search, setSearch] = useState('');

  // Approval Audit Log
  const { data: approvalLogs = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ['approval-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_votes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ApprovalLog[];
    },
  });

  // SLA Breach History
  const { data: slaBreaches = [], isLoading: slaLoading } = useQuery({
    queryKey: ['sla-breach-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_records')
        .select(`
          *,
          incident:incidents(incident_key, title)
        `)
        .or('response_breached.eq.true,resolution_breached.eq.true')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SLABreach[];
    },
  });

  // Conversion History
  const { data: conversionLogs = [], isLoading: conversionLoading } = useQuery({
    queryKey: ['conversion-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, incident_key, title, converted_to_type, converted_to_id, converted_at, conversion_reason')
        .not('converted_at', 'is', null)
        .order('converted_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ConversionLog[];
    },
  });

  // Incident History (Lifecycle Timeline)
  const { data: historyLogs = [], isLoading: historyLoading } = useQuery({
    queryKey: ['incident-history-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_history')
        .select(`
          *,
          incident:incidents(incident_key)
        `)
        .order('changed_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as HistoryLog[];
    },
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).filter(k => k !== 'incident');
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Export completed');
  };

  const getVoteBadge = (vote: string) => {
    switch (vote) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{vote}</Badge>;
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit & Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only audit logs for incident management compliance
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              SLA Breaches
            </TabsTrigger>
            <TabsTrigger value="conversions" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Conversions
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Approval Audit Log</CardTitle>
                    <CardDescription>Committee voting history and decisions</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(approvalLogs, 'approval_audit')}
                    disabled={approvalLogs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Committee ID</TableHead>
                        <TableHead>Vote</TableHead>
                        <TableHead>Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvalsLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : approvalLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No approval records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        approvalLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground">
                              {log.voted_at ? format(new Date(log.voted_at), 'MMM d, yyyy HH:mm') : '—'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {log.committee_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{getVoteBadge(log.vote)}</TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {log.comment || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SLA Breaches Tab */}
          <TabsContent value="sla" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SLA Breach History</CardTitle>
                    <CardDescription>Incidents that breached response or resolution SLAs</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(slaBreaches, 'sla_breaches')}
                    disabled={slaBreaches.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Incident</TableHead>
                        <TableHead>Response Breach</TableHead>
                        <TableHead>Resolution Breach</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slaLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : slaBreaches.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No SLA breaches recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        slaBreaches.map((breach) => (
                          <TableRow key={breach.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{breach.incident?.incident_key}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {breach.incident?.title}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {breach.response_breached ? (
                                <Badge className="bg-red-500">Breached</Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600">Met</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {breach.resolution_breached ? (
                                <Badge className="bg-red-500">Breached</Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600">Met</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(breach.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Conversion History</CardTitle>
                    <CardDescription>Incidents converted to other work items</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(conversionLogs, 'conversions')}
                    disabled={conversionLogs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Incident</TableHead>
                        <TableHead>Converted To</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversionLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : conversionLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No conversions recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        conversionLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{log.incident_key}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {log.title}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {log.converted_to_type?.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate">
                              {log.conversion_reason || '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.converted_at ? format(new Date(log.converted_at), 'MMM d, yyyy HH:mm') : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Timeline Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Incident Lifecycle Timeline</CardTitle>
                    <CardDescription>Field change history across all incidents</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(historyLogs, 'incident_history')}
                    disabled={historyLogs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Incident</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : historyLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No history records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        historyLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(log.changed_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.incident?.incident_key || log.incident_id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.field_name.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[150px] truncate">
                              {log.old_value || '—'}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {log.new_value || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
