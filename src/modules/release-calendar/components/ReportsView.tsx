import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChangeCard } from '../types';
import { STATUS_LABELS } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface ReportsViewProps {
  changeCards: ChangeCard[];
  isLoading?: boolean;
}

const COLORS = ['#a3a3a3', '#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e', '#6b7280'];

export function ReportsView({ changeCards, isLoading }: ReportsViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  const statusData = Object.entries(STATUS_LABELS).map(([status, label]) => ({
    name: label,
    value: changeCards.filter(c => c.status === status).length,
  })).filter(d => d.value > 0);

  const approvalData = [
    { name: 'Approved', value: changeCards.filter(c => c.approved).length },
    { name: 'Pending', value: changeCards.filter(c => !c.approved).length },
  ];

  const complianceData = [
    { name: 'Compliant', value: changeCards.filter(c => c.compliance_state === 'compliant').length },
    { name: 'Exceptions', value: changeCards.filter(c => c.compliance_state === 'exception_recorded').length },
  ];

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="p-6 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {statusData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Approval Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={approvalData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Compliance Overview</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={complianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              <Cell fill="#22c55e" />
              <Cell fill="#f59e0b" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-semibold text-foreground">{changeCards.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Changes</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-semibold text-status-success">{changeCards.filter(c => c.approved).length}</div>
            <div className="text-xs text-muted-foreground mt-1">Approved</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-semibold text-status-warning">{changeCards.filter(c => c.compliance_state === 'exception_recorded').length}</div>
            <div className="text-xs text-muted-foreground mt-1">Exceptions</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-semibold text-foreground">{changeCards.filter(c => c.status === 'in_production').length}</div>
            <div className="text-xs text-muted-foreground mt-1">In Production</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
