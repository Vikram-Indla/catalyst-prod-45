import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Source {
  title: string;
  type: 'doc' | 'pdf' | 'screenshot';
  url?: string;
  description: string;
  sections?: string[];
}

const sources: Source[] = [
  {
    title: 'FRD for JIRA Align UI',
    type: 'doc',
    description: 'Functional Requirements Document covering navigation, global features, and context setting',
    sections: [
      'REQ-NAV-001: Top Navigation Panel',
      'REQ-NAV-002: Left-hand Context Setting Panel',
      'REQ-NAV-003: Global Features (Starred, Items, Create, Search, Notifications)'
    ]
  },
  {
    title: 'Forecast.pdf + Forecast.md',
    type: 'pdf',
    description: 'Screenshots and transcripts showing Forecast page, capacity planning, and program board interactions'
  },
  {
    title: 'Epic backlog.pdf + Epic backlog.md',
    type: 'pdf',
    description: 'Screenshots and transcripts showing epic backlog views, forecast tab, and detail panel behaviors'
  },
  {
    title: 'Manage the backlog',
    type: 'doc',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115000154693-Manage-the-backlog',
    description: 'Official Jira Align documentation on backlog management and filtering'
  },
  {
    title: 'Backlog for epics',
    type: 'doc',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115000183848-Backlog-for-epics',
    description: 'Official Jira Align documentation on epic backlog features, views, and ranking'
  },
  {
    title: 'Manage epics - Forecast',
    type: 'doc',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115000183848-Manage-epics',
    description: 'Controls for Forecast tab: autosave, Sum/Sum all, out-of-scope behavior, PI requirements'
  },
  {
    title: 'Run a forecast',
    type: 'doc',
    url: 'https://help.jiraalign.com/hc/en-us/articles/4402662381204-Run-a-forecast',
    description: 'Estimation systems (points vs weeks), Forecast page and tab relationship'
  },
  {
    title: 'ForecastTabPI.png',
    type: 'screenshot',
    description: 'Reference for PI selector and estimate input layout'
  },
  {
    title: 'ForecastTabRows.png',
    type: 'screenshot',
    description: 'Reference for program and team row layout with indentation'
  },
  {
    title: 'ForecastTabSumAll.png',
    type: 'screenshot',
    description: 'Reference for Sum all button position and mismatch resolution behavior'
  },
  {
    title: 'ForecastTabScope.png',
    type: 'screenshot',
    description: 'Reference for out-of-scope message layout and disabled state'
  }
];

export default function SourcesReference() {
  const getIcon = (type: Source['type']) => {
    switch (type) {
      case 'doc':
        return <ExternalLink className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'screenshot':
        return <Image className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: Source['type']) => {
    switch (type) {
      case 'doc':
        return 'bg-blue-500/10 text-blue-500';
      case 'pdf':
        return 'bg-purple-500/10 text-purple-500';
      case 'screenshot':
        return 'bg-green-500/10 text-green-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Jira Align Implementation Sources</h1>
        <p className="text-muted-foreground">
          Complete traceability of specifications, documentation, and visual references used in Catalyst's Jira Align implementation.
        </p>
      </div>

      <div className="grid gap-4">
        {sources.map((source, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-md ${getTypeColor(source.type)}`}>
                      {getIcon(source.type)}
                    </div>
                    <CardTitle className="text-lg">{source.title}</CardTitle>
                  </div>
                  <CardDescription>{source.description}</CardDescription>
                </div>
                {source.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(source.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                )}
              </div>
            </CardHeader>
            {source.sections && source.sections.length > 0 && (
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Key Sections:</p>
                  <ul className="space-y-1">
                    {source.sections.map((section, idx) => (
                      <li key={idx} className="text-sm pl-4 border-l-2 border-primary/20">
                        {section}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">Implementation Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Non-Hallucination Policy:</strong> All UI elements, behaviors, and data models must be explicitly supported by the sources listed above.</p>
          <p><strong>Pixel-Perfect Matching:</strong> Visual implementation must match screenshots exactly for layout, spacing, typography, and iconography.</p>
          <p><strong>Source Gaps:</strong> Any unclear specifications are marked with TODO comments referencing the missing source element.</p>
          <p><strong>Feature Flags:</strong> Unverified assumptions are gated behind feature_flags.unverified_assumption=true (default: false).</p>
        </CardContent>
      </Card>
    </div>
  );
}
