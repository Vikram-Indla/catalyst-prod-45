import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowLeft } from 'lucide-react';
import { FeatureWSJFDialog } from '@/components/items/features/FeatureWSJFDialog';
import { useNavigate } from 'react-router-dom';
import type { Feature } from '@/types/feature.types';

export default function FeaturePrioritizationView() {
  const navigate = useNavigate();
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [wsjfDialogOpen, setWSJFDialogOpen] = useState(false);

  const { data: features } = useQuery({
    queryKey: ['features-prioritization'],
    queryFn: async () => {
      const { data } = await supabase
        .from('features')
        .select('*, epics(name), programs(name)')
        .order('wsjf_score', { ascending: false, nullsFirst: false });
      return data as Feature[];
    },
  });

  const selectedFeature = features?.find(f => f.id === selectedFeatureId);

  const handleOpenWSJF = (featureId: string) => {
    setSelectedFeatureId(featureId);
    setWSJFDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/features')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Feature Prioritization (WSJF)</h1>
              <p className="text-sm text-muted-foreground">
                Weighted Shortest Job First scoring for features
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {features && features.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Epic</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="text-right">Business Value</TableHead>
                <TableHead className="text-right">Time Value</TableHead>
                <TableHead className="text-right">RR/OE Value</TableHead>
                <TableHead className="text-right">Job Size</TableHead>
                <TableHead className="text-right">WSJF Score</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell className="font-mono text-sm">
                    {feature.display_id || feature.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">{feature.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(feature as any).epics?.name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(feature as any).programs?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right">{feature.business_value || 0}</TableCell>
                  <TableCell className="text-right">{feature.time_criticality || 0}</TableCell>
                  <TableCell className="text-right">{feature.risk_reduction || 0}</TableCell>
                  <TableCell className="text-right">{feature.job_size || 0}</TableCell>
                  <TableCell className="text-right font-bold">
                    {feature.wsjf_score?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenWSJF(feature.id)}
                    >
                      <Calculator className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground mb-4">No features available for prioritization</div>
          </div>
        )}
      </div>

      {/* WSJF Dialog */}
      {selectedFeature && (
        <FeatureWSJFDialog
          features={[selectedFeature]}
          open={wsjfDialogOpen}
          onClose={() => {
            setWSJFDialogOpen(false);
            setSelectedFeatureId(null);
          }}
        />
      )}
    </div>
  );
}
