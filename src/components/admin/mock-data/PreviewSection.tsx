/**
 * Preview Section - View generated data before loading
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Upload, Download, Loader2, Target, Truck, AlertTriangle, Calendar, Building2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PreviewSectionProps {
  runId: string;
  onLoad: () => Promise<void>;
  isLoading: boolean;
}

interface PreviewData {
  strategy: { themes: any[]; objectives: any[]; keyResults: any[] };
  delivery: { epics: any[]; features: any[]; stories: any[]; tasks: any[] };
  release: { releases: any[]; releaseWindows: any[] };
  quality: { incidents: any[]; defects: any[] };
  structure: { programs: any[]; projects: any[] };
}

interface LinkHealth {
  total: number;
  linked: number;
  orphaned: number;
  healthy: boolean;
}

export function PreviewSection({ runId, onLoad, isLoading }: PreviewSectionProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [linkHealth, setLinkHealth] = useState<LinkHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs/${runId}/preview`,
          {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setPreview(data.preview_json);
          setLinkHealth(data.link_health_json);
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [runId]);

  const exportPreview = () => {
    if (!preview) return;
    const blob = new Blob([JSON.stringify(preview, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock-data-preview-${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = (items: any[], columns: { key: string; label: string }[]) => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No items configured
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.key === 'status' ? (
                    <Badge variant="outline">{item[col.key]}</Badge>
                  ) : col.key === 'severity' ? (
                    <Badge variant={item[col.key] === 'High' ? 'destructive' : 'secondary'}>
                      {item[col.key]}
                    </Badge>
                  ) : (
                    item[col.key]
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading preview...</p>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No preview data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Preview Data
              </CardTitle>
              <CardDescription>
                Review generated data before loading to Catalyst
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportPreview}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button onClick={onLoad} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Load to Catalyst
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="structure">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="structure" className="gap-1">
                <Building2 className="h-3 w-3" />
                Structure
              </TabsTrigger>
              <TabsTrigger value="strategy" className="gap-1">
                <Target className="h-3 w-3" />
                Strategy
              </TabsTrigger>
              <TabsTrigger value="delivery" className="gap-1">
                <Truck className="h-3 w-3" />
                Delivery
              </TabsTrigger>
              <TabsTrigger value="quality" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Quality
              </TabsTrigger>
              <TabsTrigger value="releases" className="gap-1">
                <Calendar className="h-3 w-3" />
                Releases
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-1">
                <Link2 className="h-3 w-3" />
                Link Health
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structure" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Programs</h4>
                {renderTable(preview.structure.programs, [
                  { key: 'key', label: 'Key' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' },
                ])}
                <h4 className="font-medium">Projects</h4>
                {renderTable(preview.structure.projects, [
                  { key: 'key', label: 'Key' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' },
                ])}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Themes</h4>
                {renderTable(preview.strategy.themes, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'status', label: 'Status' },
                ])}
                <h4 className="font-medium">Objectives</h4>
                {renderTable(preview.strategy.objectives, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'status', label: 'Status' },
                ])}
              </div>
            </TabsContent>

            <TabsContent value="delivery" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Epics</h4>
                {renderTable(preview.delivery.epics, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'status', label: 'Status' },
                ])}
                <h4 className="font-medium">Features</h4>
                {renderTable(preview.delivery.features, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'status', label: 'Status' },
                ])}
                <h4 className="font-medium">Stories</h4>
                {renderTable(preview.delivery.stories, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'status', label: 'Status' },
                ])}
              </div>
            </TabsContent>

            <TabsContent value="quality" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Incidents</h4>
                {renderTable(preview.quality.incidents, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'status', label: 'Status' },
                ])}
                <h4 className="font-medium">Defects</h4>
                {renderTable(preview.quality.defects, [
                  { key: 'key', label: 'Key' },
                  { key: 'title', label: 'Title' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'status', label: 'Status' },
                ])}
              </div>
            </TabsContent>

            <TabsContent value="releases" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Releases</h4>
                {renderTable(preview.release.releases, [
                  { key: 'key', label: 'Key' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' },
                ])}
              </div>
            </TabsContent>

            <TabsContent value="health" className="mt-4">
              {linkHealth && (
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{linkHealth.total}</div>
                      <p className="text-xs text-muted-foreground">Total Entities</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{linkHealth.linked}</div>
                      <p className="text-xs text-muted-foreground">Linked</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-amber-600">{linkHealth.orphaned}</div>
                      <p className="text-xs text-muted-foreground">Orphaned</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <Badge variant={linkHealth.healthy ? 'secondary' : 'destructive'}>
                        {linkHealth.healthy ? 'Healthy' : 'Issues Found'}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
