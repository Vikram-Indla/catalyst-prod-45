import { useOutletContext } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  CheckCircle2, 
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types/project';

export default function ProjectSummary() {
  const { project } = useOutletContext<{ project: Project }>();

  const projectTypeLabels = {
    scrum: 'Scrum',
    kanban: 'Kanban', 
    basic: 'Basic',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge variant="secondary">{projectTypeLabels[project.project_type]}</Badge>
        </div>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Issues"
          value="--"
          subtitle="All time"
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="In Progress"
          value="--"
          subtitle="Active work"
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Completed"
          value="--"
          subtitle="Done this week"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Team Members"
          value="--"
          subtitle="Active contributors"
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team</CardTitle>
            <CardDescription>Project contributors</CardDescription>
          </CardHeader>
          <CardContent>
            {project.lead ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={project.lead.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {project.lead.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {project.lead.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lead
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Lead</Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No team lead assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity - Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest updates on this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Activity feed will appear here</p>
              <p className="text-sm">Start creating issues to see activity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
