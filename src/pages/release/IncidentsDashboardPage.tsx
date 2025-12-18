import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { Incident } from '@/types/incident';

export default function IncidentsDashboardPage() {
  const navigate = useNavigate();
  
  // Fetch all open incidents for metrics
  const { data: allIncidents = [], isLoading } = useIncidents({
    status: ['open', 'triage', 'to_committee', 'in_progress', 'resolved', 'converted', 'closed'],
  });

  // Calculate metrics from real data
  const openIncidents = allIncidents.filter((inc: Incident) => 
    ['open', 'triage', 'to_committee', 'in_progress'].includes(inc.status)
  );
  
  const l1Count = openIncidents.filter((inc: Incident) => inc.support_level === 'L1').length;
  const l2Count = openIncidents.filter((inc: Incident) => inc.support_level === 'L2').length;
  const l3Count = openIncidents.filter((inc: Incident) => inc.support_level === 'L3').length;
  
  const majorIncidents = openIncidents.filter((inc: Incident) => inc.is_major_incident);
  
  const slaBreachResponse = allIncidents.filter((inc: Incident) => inc.sla?.response_breached).length;
  const slaBreachResolution = allIncidents.filter((inc: Incident) => inc.sla?.resolution_breached).length;
  
  const conversions = allIncidents.filter((inc: Incident) => inc.converted_to_type);
  const storyConversions = conversions.filter((inc: Incident) => inc.converted_to_type === 'story').length;
  const featureConversions = conversions.filter((inc: Incident) => inc.converted_to_type === 'feature').length;
  const epicConversions = conversions.filter((inc: Incident) => inc.converted_to_type === 'epic').length;

  const handleWidgetClick = (filterParams: string) => {
    navigate(`/release/incidents/list?${filterParams}`);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center">
        <h1 className="text-base font-semibold text-foreground">Incident Dashboard</h1>
        <span className="ml-3 text-xs text-muted-foreground">Command Center</span>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Open Incidents Widget */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-border"
            onClick={() => handleWidgetClick('status=open,triage,to_committee,in_progress')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-md bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{openIncidents.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Open Incidents</div>
              
              {/* L1/L2/L3 Split */}
              <div className="flex gap-3 pt-3 border-t border-border">
                <button 
                  className="flex-1 text-center p-2 rounded hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleWidgetClick('status=open,triage,to_committee,in_progress&support_level=L1'); }}
                >
                  <div className="text-lg font-semibold text-green-700">{l1Count}</div>
                  <div className="text-[10px] text-muted-foreground">L1</div>
                </button>
                <button 
                  className="flex-1 text-center p-2 rounded hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleWidgetClick('status=open,triage,to_committee,in_progress&support_level=L2'); }}
                >
                  <div className="text-lg font-semibold text-blue-700">{l2Count}</div>
                  <div className="text-[10px] text-muted-foreground">L2</div>
                </button>
                <button 
                  className="flex-1 text-center p-2 rounded hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleWidgetClick('status=open,triage,to_committee,in_progress&support_level=L3'); }}
                >
                  <div className="text-lg font-semibold text-purple-700">{l3Count}</div>
                  <div className="text-[10px] text-muted-foreground">L3</div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Major Incidents Widget */}
          <Card 
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow border-border",
              majorIncidents.length > 0 && "border-red-200 bg-red-50/30"
            )}
            onClick={() => handleWidgetClick('major=true')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-md", majorIncidents.length > 0 ? "bg-red-100" : "bg-gray-50")}>
                  <AlertTriangle className={cn("h-4 w-4", majorIncidents.length > 0 ? "text-red-600" : "text-gray-400")} />
                </div>
                {majorIncidents.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    ACTIVE
                  </div>
                )}
              </div>
              <div className={cn("text-2xl font-bold mb-1", majorIncidents.length > 0 ? "text-red-700" : "text-foreground")}>
                {majorIncidents.length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Major Incidents</div>
              
              {majorIncidents.length > 0 && (
                <div className="pt-3 border-t border-red-200">
                  {majorIncidents.slice(0, 2).map((inc: Incident) => (
                    <div key={inc.id} className="text-xs text-red-800 truncate py-0.5">
                      {inc.incident_key}: {inc.title}
                    </div>
                  ))}
                  {majorIncidents.length > 2 && (
                    <div className="text-[10px] text-red-600 mt-1">+{majorIncidents.length - 2} more</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Breaches Widget */}
          <Card 
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow border-border",
              (slaBreachResponse > 0 || slaBreachResolution > 0) && "border-orange-200 bg-orange-50/30"
            )}
            onClick={() => handleWidgetClick('sla_breach=true')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-md", (slaBreachResponse > 0 || slaBreachResolution > 0) ? "bg-orange-100" : "bg-gray-50")}>
                  <Clock className={cn("h-4 w-4", (slaBreachResponse > 0 || slaBreachResolution > 0) ? "text-orange-600" : "text-gray-400")} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={cn("text-2xl font-bold mb-1", (slaBreachResponse > 0 || slaBreachResolution > 0) ? "text-orange-700" : "text-foreground")}>
                {slaBreachResponse + slaBreachResolution}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">SLA Breaches</div>
              
              {/* Response / Resolution Split */}
              <div className="flex gap-3 pt-3 border-t border-border">
                <div className="flex-1 text-center">
                  <div className={cn("text-lg font-semibold", slaBreachResponse > 0 ? "text-orange-700" : "text-foreground")}>
                    {slaBreachResponse}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Response</div>
                </div>
                <div className="flex-1 text-center">
                  <div className={cn("text-lg font-semibold", slaBreachResolution > 0 ? "text-orange-700" : "text-foreground")}>
                    {slaBreachResolution}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Resolution</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversions Widget */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-border"
            onClick={() => handleWidgetClick('status=converted')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-md bg-teal-50">
                  <ArrowRight className="h-4 w-4 text-teal-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{conversions.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Conversions</div>
              
              {/* Story / Feature / Epic Split */}
              <div className="flex gap-3 pt-3 border-t border-border">
                <div className="flex-1 text-center">
                  <div className="text-lg font-semibold text-blue-700">{storyConversions}</div>
                  <div className="text-[10px] text-muted-foreground">Story</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-lg font-semibold text-purple-700">{featureConversions}</div>
                  <div className="text-[10px] text-muted-foreground">Feature</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-lg font-semibold text-orange-700">{epicConversions}</div>
                  <div className="text-[10px] text-muted-foreground">Epic</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access - Recent Major Incidents */}
        {majorIncidents.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Active Major Incidents</h2>
            <div className="bg-card border border-red-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-red-800">Key</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-800">Summary</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-800">Severity</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-800">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {majorIncidents.map((inc: Incident) => (
                    <tr 
                      key={inc.id} 
                      className="hover:bg-red-50/50 cursor-pointer border-t border-red-100"
                      onClick={() => navigate(`/release/incidents/${inc.id}`)}
                    >
                      <td className="px-3 py-2 font-mono font-medium text-red-700">{inc.incident_key}</td>
                      <td className="px-3 py-2 text-foreground">{inc.title}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-medium">
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground capitalize">{inc.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
