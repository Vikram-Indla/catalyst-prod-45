import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Ban, SkipForward, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function ExecutionDashboard() {
  const [dateRange, setDateRange] = useState('7');

  const { data: stats } = useQuery({
    queryKey: ['execution-stats', dateRange],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      const { data } = await supabase
        .from('test_cycle_executions')
        .select('status')
        .gte('executed_at', daysAgo.toISOString());

      const counts = {
        not_executed: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
      };

      data?.forEach((exec: any) => {
        if (exec.status in counts) {
          counts[exec.status as keyof typeof counts]++;
        }
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const executed = total - counts.not_executed;
      const passRate = executed > 0 ? Math.round((counts.passed / executed) * 100) : 0;

      return { counts, total, passRate };
    },
  });

  const statusCards = [
    {
      title: 'Passed',
      count: stats?.counts.passed || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Failed',
      count: stats?.counts.failed || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Blocked',
      count: stats?.counts.blocked || 0,
      icon: Ban,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Skipped',
      count: stats?.counts.skipped || 0,
      icon: SkipForward,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Not Executed',
      count: stats?.counts.not_executed || 0,
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Execution Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Test execution overview and metrics
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-5 gap-4">
        {statusCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className={`text-3xl font-bold ${card.color}`}>
                  {card.count}
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pass rate card */}
      <Card>
        <CardHeader>
          <CardTitle>Pass Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            {stats?.passRate || 0}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats?.counts.passed || 0} passed out of {(stats?.total || 0) - (stats?.counts.not_executed || 0)} executed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
