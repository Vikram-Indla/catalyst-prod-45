import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  tenantId: string;
}

type ImportStep = 'upload' | 'mapping' | 'analyze' | 'import' | 'complete';

export function ImportWizard({ open, onOpenChange, projectId, tenantId }: ImportWizardProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [diffReport, setDiffReport] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setManifest(data);

      // Create import job
      const { data: job, error } = await supabase
        .from('injira_import_jobs')
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          source_type: 'jira_cloud',
          status: 'pending',
          config: { manifest: data },
          total_items: data.issues?.length || 0,
        })
        .select()
        .single();

      if (error) throw error;
      setImportJobId(job.id);
      setStep('mapping');
      toast.success(`Loaded ${data.issues?.length || 0} issues from manifest`);
    } catch (err: any) {
      toast.error('Failed to parse import file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!importJobId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('injira-import-analyzer', {
        body: { import_job_id: importJobId, manifest },
      });
      if (error) throw error;
      setDiffReport(data);
      setStep('analyze');
    } catch (err: any) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runImport = async (dryRun = false) => {
    if (!importJobId) return;
    setLoading(true);
    setProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke('injira-import', {
        body: { import_job_id: importJobId, dry_run: dryRun },
      });
      if (error) throw error;
      setProgress(100);
      if (!dryRun) {
        setStep('complete');
        toast.success(`Imported ${data.stats.imported} issues`);
      } else {
        toast.info(`Dry run: ${data.stats.imported} would be imported`);
      }
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Jira Cloud</DialogTitle>
        </DialogHeader>

        <Tabs value={step} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" disabled>Upload</TabsTrigger>
            <TabsTrigger value="mapping" disabled>Mapping</TabsTrigger>
            <TabsTrigger value="analyze" disabled>Analyze</TabsTrigger>
            <TabsTrigger value="import" disabled>Import</TabsTrigger>
            <TabsTrigger value="complete" disabled>Complete</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-medium">Upload Jira Export JSON</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Export your Jira project and upload the JSON file
                </p>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                Found {manifest?.issues?.length || 0} issues, {manifest?.users?.length || 0} users, {manifest?.statuses?.length || 0} statuses
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={runAnalysis} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Run Analysis
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4 py-4">
            {diffReport && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">{diffReport.summary?.total_source_issues || 0}</div>
                    <div className="text-sm text-muted-foreground">Source Issues</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{diffReport.summary?.matched_issues || 0}</div>
                    <div className="text-sm text-muted-foreground">Already Matched</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-600">{diffReport.summary?.missing_in_target || 0}</div>
                    <div className="text-sm text-muted-foreground">To Import</div>
                  </div>
                </div>
                {diffReport.ai_analysis && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="whitespace-pre-wrap">{diffReport.ai_analysis}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => runImport(true)} disabled={loading}>
                    Dry Run
                  </Button>
                  <Button onClick={() => { setStep('import'); runImport(false); }} disabled={loading}>
                    Start Import
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 py-4">
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="mt-4">Importing issues...</p>
              <Progress value={progress} className="mt-4" />
            </div>
          </TabsContent>

          <TabsContent value="complete" className="space-y-4 py-4">
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              <p className="mt-4 text-lg font-medium">Import Complete!</p>
              <Button className="mt-4" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
