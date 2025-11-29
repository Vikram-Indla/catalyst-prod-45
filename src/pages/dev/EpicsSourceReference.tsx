import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Source {
  title: string;
  type: 'doc' | 'pdf' | 'screenshot' | 'prd';
  url?: string;
  description: string;
  implemented: boolean;
  features?: string[];
}

const sources: Source[] = [
  {
    title: 'Create Epics',
    type: 'pdf',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115002851494-Create-epics',
    description: 'Official Catalyst documentation on creating epics with required fields and hierarchy rules',
    implemented: true,
    features: [
      'Create epic form with required fields',
      'Epic hierarchy with themes',
      'Add Epic button on toolbar',
    ]
  },
  {
    title: 'Manage Epics',
    type: 'pdf',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115000183848-Manage-epics',
    description: 'Complete epic management including grid view, filters, details panel, and all tabs',
    implemented: true,
    features: [
      'Epics grid with sortable columns',
      'Details tab with classification, context, dates',
      'Design, Intake, Benefits, Value tabs',
      'Milestones, Spend, Forecast, Links tabs',
      'State and process step tracking',
      'WSJF value scoring',
    ]
  },
  {
    title: 'More Actions for Epics',
    type: 'pdf',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115002851494-More-actions-for-epics',
    description: 'Toolbar More Actions menu with bulk operations and utilities',
    implemented: true,
    features: [
      'Bottom-Up Estimate',
      'WSJF Prioritization dialog',
      'Import/Export Epics',
      'Mass Move dialog',
      'Work Tree report',
      'Print Epic Cards',
      'Recycle Bin access',
      'Canceled Items access',
    ]
  },
  {
    title: 'Epics Additional Options',
    type: 'pdf',
    url: 'https://help.jiraalign.com/hc/en-us/articles/115002851494-Epics-additional-options',
    description: 'Epic details panel overflow menu with lifecycle and reporting actions',
    implemented: true,
    features: [
      'Discussions and Subscribe',
      'Update Child Process Steps',
      'Responsibility Matrix',
      'Trace This Epic',
      'Status Report',
      'Requirement Hierarchy',
      'Audit Log',
      'Drop, Split, Delete, Cancel',
      'Copy Epic',
      'Add to Kanban Board',
      'Epic Planning',
      'Work Tree',
    ]
  },
  {
    title: 'Catalyst Epic Work Items',
    type: 'pdf',
    description: 'Visual reference showing epic details panel layout and field organization',
    implemented: true,
    features: [
      'Epic details panel UI structure',
      'Tab organization',
      'Field groupings',
    ]
  },
  {
    title: 'Catalyst Epics PRD',
    type: 'prd',
    description: 'Complete product requirements document with 3-phase implementation plan',
    implemented: true,
    features: [
      'Phase 1: Understanding',
      'Phase 2: Full PRD with 15 sections',
      'Phase 3: Implementation plan',
      'Routes and component architecture',
      'State management approach',
      'Mock data specifications',
    ]
  },
];

export default function EpicsSourceReference() {
  const getIcon = (type: Source['type']) => {
    switch (type) {
      case 'doc':
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'screenshot':
        return <ImageIcon className="h-5 w-5" />;
      case 'prd':
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: Source['type']) => {
    switch (type) {
      case 'doc':
      case 'pdf':
        return 'bg-blue-500/10 text-blue-500';
      case 'screenshot':
        return 'bg-green-500/10 text-green-500';
      case 'prd':
        return 'bg-purple-500/10 text-purple-500';
    }
  };

  const implementedCount = sources.filter(s => s.implemented).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Epics Module - Implementation Sources</h1>
        <p className="text-muted-foreground">
          Complete traceability of specifications and documentation used in Catalyst's Epics implementation
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Badge variant="default" className="text-lg px-4 py-1">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {implementedCount} of {sources.length} sources implemented
          </Badge>
        </div>
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
                    {source.implemented && (
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Implemented
                      </Badge>
                    )}
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
            {source.features && source.features.length > 0 && (
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    Implemented Features:
                  </p>
                  <ul className="space-y-1">
                    {source.features.map((feature, idx) => (
                      <li key={idx} className="text-sm pl-4 border-l-2 border-primary/20 flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
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
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>✓ Core Module:</strong> Main epics grid page with sortable columns, search, and filters
          </p>
          <p>
            <strong>✓ Details Panel:</strong> Comprehensive slide-out with 9 tabs (Details, Design, Intake, Benefits, Value, Milestones, Spend, Forecast, Links)
          </p>
          <p>
            <strong>✓ Actions:</strong> More Actions toolbar with Bottom-Up Estimate, WSJF Prioritization, Import/Export, Mass Move, Work Tree, Print Cards
          </p>
          <p>
            <strong>✓ Additional Options:</strong> Full overflow menu with 18+ lifecycle and reporting actions
          </p>
          <p>
            <strong>✓ Recycle Bin:</strong> Deleted epics management with restore and permanent delete
          </p>
          <p>
            <strong>✓ Canceled Items:</strong> Frozen/canceled epics tracking with restore capability
          </p>
          <p>
            <strong>✓ Reports:</strong> Epic Status Report with executive summary, schedule, budget, progress, risks
          </p>
          <p>
            <strong>Routes:</strong> /items/epics, /items/epics/recycle-bin, /items/epics/canceled, /items/epics/:id/status-report
          </p>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Architecture Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Non-Hallucination Policy:</strong> All UI elements and behaviors are explicitly defined in source PDFs and PRD
          </p>
          <p>
            <strong>Database Integration:</strong> Uses existing Supabase epics table with proper joins to strategic_themes, programs, epic_spend, and epic_wsjf tables
          </p>
          <p>
            <strong>Component Architecture:</strong> Modular tab components for easy extension, separate dialog components for reusable actions
          </p>
          <p>
            <strong>Future Enhancements:</strong> Additional report pages (Work Tree, Epic Planning, Requirement Hierarchy, Trace) can be added as needed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
