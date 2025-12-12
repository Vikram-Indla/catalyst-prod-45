import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Clock, Shield } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';

interface UsersStatsCardsProps {
  users: UserProfile[];
}

export function UsersStatsCards({ users }: UsersStatsCardsProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.approval_status === 'APPROVED').length;
  const pendingUsers = users.filter(u => u.approval_status === 'PENDING_APPROVAL').length;
  const adminUsers = users.filter(u => 
    u.roles.some(r => r.role_code === 'super_admin' || r.role_code === 'product_admin')
  ).length;

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-brand-gold',
      bgColor: 'bg-brand-gold/10'
    },
    {
      label: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Pending Invites',
      value: pendingUsers,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Admin Users',
      value: adminUsers,
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
