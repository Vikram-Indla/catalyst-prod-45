import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics, useEFDFeatures, useEFDAtoms, useEFDDocuments } from '../../hooks/useEFDSession';
import { usePushToCatalyst } from '../../hooks/useEFDMutations';
import { 
  Download, Upload, FileText, Layers, Box, Atom, 
  CheckCircle, Rocket, FileSpreadsheet, Loader2, ExternalLink,
  AlertTriangle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const PublishStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: docs = [] } = useEFDDocuments(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);
  const pushToCatalyst = usePushToCatalyst();
  
  const [isExporting, setIsExporting] = useState(false);

  const stats = [
    { icon: FileText, label: 'Documents', value: docs.length, color: 'text-blue-500' },
    { icon: Atom, label: 'Requirements', value: atoms.length, color: 'text-purple-500' },
    { icon: Layers, label: 'Epics', value: epics.length, color: 'text-violet-500' },
    { icon: Box, label: 'Features', value: features.length, color: 'text-teal-500' },
  ];

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Generate CSV content
      const epicRows = epics.map((e: any) => 
        `Epic,${e.epic_key},"${e.name}","${e.description || ''}","${e.lbc_hypothesis || ''}",${e.size || ''}`
      );
      const featureRows = features.map((f: any) => {
        const epic = epics.find((e: any) => e.id === f.epic_id);
        return `Feature,${f.feature_key},"${f.name}","${f.description || ''}","${f.benefit_hypothesis || ''}",${epic?.epic_key || ''}`;
      });
      const atomRows = atoms.map((a: any) => {
        const feature = features.find((f: any) => f.id === a.mapped_to_feature_id);
        return `Requirement,${a.atom_key},"${a.text}",${a.type || 'FR'},${a.priority || ''},${feature?.feature_key || ''}`;
      });

      const csv = [
        'Type,Key,Name/Text,Description/Type,Hypothesis/Priority,Parent',
        ...epicRows,
        ...featureRows,
        ...atomRows,
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `efd-export-${session.id.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Export downloaded successfully');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePushToCatalyst = () => {
    pushToCatalyst.mutate(session.id);
  };

  const canPublish = session.is_approved;

  if (session.is_pushed_to_catalyst) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Published</h2>
          <p className="text-muted-foreground">This session has been published to Catalyst</p>
        </div>

        <div className="border border-green-200 rounded-xl p-8 bg-gradient-to-br from-green-50 to-emerald-50 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <Rocket className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">Successfully Published!</h3>
          <p className="text-green-600 mb-4">
            All epics and features have been pushed to Catalyst
          </p>
          {session.pushed_at && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Published on {format(new Date(session.pushed_at), 'PPp')}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="border rounded-lg p-4 text-center bg-card">
              <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export CSV
          </Button>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            View in Catalyst
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Publish</h2>
        <p className="text-muted-foreground">
          Export your work or push directly to Catalyst
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border rounded-lg p-4 text-center bg-card">
            <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {!canPublish && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-700">Approval Required</h4>
            <p className="text-sm text-amber-600">
              This session must be approved before it can be pushed to Catalyst
            </p>
          </div>
        </div>
      )}

      {/* Publish Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Option */}
        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Export Data</h3>
              <p className="text-sm text-muted-foreground">Download as CSV/Excel</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Export all epics, features, and requirements as a spreadsheet for offline use or import into other tools.
          </p>
          <Button variant="outline" className="w-full" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download CSV
          </Button>
        </div>

        {/* Catalyst Option */}
        <div className={`border rounded-xl p-6 ${canPublish ? 'bg-gradient-to-br from-primary/5 to-primary/10' : 'bg-muted/30'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${canPublish ? 'bg-primary/10' : 'bg-muted'}`}>
              <Rocket className={`h-6 w-6 ${canPublish ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Push to Catalyst</h3>
              <p className="text-sm text-muted-foreground">Create items in Catalyst</p>
            </div>
            {canPublish && <Badge className="ml-auto">Recommended</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically create epics and features in Catalyst with full traceability to this session.
          </p>
          <Button 
            className="w-full" 
            onClick={handlePushToCatalyst}
            disabled={!canPublish || pushToCatalyst.isPending}
          >
            {pushToCatalyst.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {pushToCatalyst.isPending ? 'Pushing...' : 'Push to Catalyst'}
          </Button>
        </div>
      </div>

      {/* What gets published */}
      <div className="border rounded-xl p-6 bg-card">
        <h4 className="font-semibold mb-4">What will be created in Catalyst:</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">{epics.length} Epics</p>
              <p className="text-sm text-muted-foreground">
                With LBC, sizing, and MVP definitions
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">{features.length} Features</p>
              <p className="text-sm text-muted-foreground">
                Linked to parent epics with benefit hypotheses
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Trace Links</p>
              <p className="text-sm text-muted-foreground">
                Full traceability from requirements to features
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Audit Trail</p>
              <p className="text-sm text-muted-foreground">
                Complete history linked to this session
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
