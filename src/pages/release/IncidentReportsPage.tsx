import { FileText, BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  { id: 'sla', title: 'SLA Compliance Report', description: 'Track response and resolution SLA performance', icon: TrendingUp },
  { id: 'volume', title: 'Incident Volume Analysis', description: 'Analyze incident trends by severity and workgroup', icon: BarChart3 },
  { id: 'category', title: 'Incident Category Breakdown', description: 'Distribution by business process and platform', icon: PieChart },
  { id: 'aging', title: 'Aging Analysis', description: 'Track incident aging and resolution times', icon: Calendar },
];

export default function IncidentReportsPage() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center">
        <FileText className="h-4 w-4 text-muted-foreground mr-2" />
        <h1 className="text-base font-semibold text-foreground">Incident Reports</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground mb-6">
            Select a report to view detailed incident analytics and insights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Report functionality coming soon. These reports will provide detailed analytics on incident management performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
