/**
 * Evidence Statistics Component
 * Displays evidence metrics for an execution
 */

import React, { useState, useEffect } from 'react';
import { 
  Paperclip, 
  Image, 
  Video, 
  FileText, 
  Pencil, 
  AlertTriangle 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EvidenceStatsProps {
  executionId: string;
}

interface Stats {
  total: number;
  screenshots: number;
  videos: number;
  documents: number;
  withAnnotations: number;
  aiIssues: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: 'default' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color = 'default' }) => (
  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
    <Icon 
      className={cn(
        "w-5 h-5 mb-1",
        color === 'red' ? 'text-destructive' : 'text-muted-foreground'
      )} 
    />
    <span className={cn(
      "text-2xl font-bold",
      color === 'red' ? 'text-destructive' : 'text-foreground'
    )}>
      {value}
    </span>
    <span className="text-xs text-muted-foreground text-center">{label}</span>
  </div>
);

export const EvidenceStats: React.FC<EvidenceStatsProps> = ({ executionId }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('step_result_attachments')
          .select('mime_type, annotations, ai_has_issues')
          .eq('execution_result_id', executionId)
          .is('deleted_at', null);

        const calculatedStats: Stats = {
          total: data?.length || 0,
          screenshots: data?.filter((d) => d.mime_type?.startsWith('image/')).length || 0,
          videos: data?.filter((d) => d.mime_type?.startsWith('video/')).length || 0,
          documents: data?.filter((d) => d.mime_type === 'application/pdf').length || 0,
          withAnnotations: data?.filter((d) => {
            const annotations = d.annotations as any[] | null;
            return annotations && annotations.length > 0;
          }).length || 0,
          aiIssues: data?.filter((d) => d.ai_has_issues).length || 0,
        };
        setStats(calculatedStats);
      } catch (error) {
        console.error('Failed to load evidence stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [executionId]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-6 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Evidence" value={stats.total} icon={Paperclip} />
          <StatCard label="Screenshots" value={stats.screenshots} icon={Image} />
          <StatCard label="Videos" value={stats.videos} icon={Video} />
          <StatCard label="Documents" value={stats.documents} icon={FileText} />
          <StatCard label="Annotated" value={stats.withAnnotations} icon={Pencil} />
          <StatCard label="AI Issues" value={stats.aiIssues} icon={AlertTriangle} color="red" />
        </div>
      </CardContent>
    </Card>
  );
};
