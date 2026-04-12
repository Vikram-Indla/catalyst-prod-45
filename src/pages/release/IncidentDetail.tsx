import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IncidentHeader } from '@/components/incidents/IncidentHeader';
import { IncidentDescription } from '@/components/incidents/IncidentDescription';
import { IncidentAttachments } from '@/components/incidents/IncidentAttachments';
import { IncidentDetailsPanel } from '@/components/incidents/IncidentDetailsPanel';
import type { Incident, Attachment } from '@/types/release';

export default function IncidentDetail() {
  const { id } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Incident>>({});

  // Fetch incident from database
  const { data: incidentData, isLoading, refetch } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          assignee:incident_user_profiles!incidents_assignee_id_fkey(*),
          reporter:incident_user_profiles!incidents_reporter_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Transform database incident to component format
  const incident: Incident | null = incidentData ? {
    id: incidentData.id,
    summary: incidentData.title,
    description: incidentData.description || '',
    severity: incidentData.severity as 'SEV1' | 'SEV2' | 'SEV3',
    impact: incidentData.impact as 'high' | 'medium' | 'low',
    urgency: incidentData.urgency as 'high' | 'medium' | 'low',
    priority: incidentData.priority as 'critical' | 'high' | 'medium' | 'low',
    status: (incidentData.status === 'in_progress' ? 'in-progress' : incidentData.status) as Incident['status'],
    assignee: incidentData.assignee ? {
      id: incidentData.assignee.id,
      name: incidentData.assignee.full_name,
      initials: incidentData.assignee.avatar_initials || incidentData.assignee.full_name?.substring(0, 2).toUpperCase() || 'U',
    } : { id: '', name: 'Unassigned', initials: 'U' },
    reporter: incidentData.reporter ? {
      id: incidentData.reporter.id,
      name: incidentData.reporter.full_name,
      initials: incidentData.reporter.avatar_initials || incidentData.reporter.full_name?.substring(0, 2).toUpperCase() || 'U',
    } : { id: '', name: 'Unknown', initials: 'U' },
    component: incidentData.service_component || '',
    targetDate: incidentData.target_date || '',
    createdAt: incidentData.created_at,
    updatedAt: incidentData.updated_at,
    linkedItems: [],
    watchers: [],
    comments: [],
    labels: [],
    isMajorIncident: incidentData.is_major_incident,
    attachments: [],
    timeline: [],
    watcherDetails: [],
  } : null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading incident...</div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Incident not found</h2>
          <Link to="/release/incidents" className="text-primary hover:underline">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleEditMode = () => {
    if (!isEditMode) {
      setEditedData({
        summary: incident.summary,
        description: incident.description,
        status: incident.status,
        impact: incident.impact,
        urgency: incident.urgency,
        assignee: incident.assignee,
        labels: incident.labels,
        isMajorIncident: incident.isMajorIncident,
        incidentCommander: incident.incidentCommander,
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleSave = async () => {
    try {
      // Map status back to database format
      const dbStatus = editedData.status === 'in-progress' ? 'in_progress' : editedData.status;
      const { error } = await supabase
        .from('incidents')
        .update({
          title: editedData.summary,
          description: editedData.description,
          status: dbStatus as any,
          impact: editedData.impact,
          urgency: editedData.urgency,
          is_major_incident: editedData.isMajorIncident,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      await refetch();
      setIsEditMode(false);
      setEditedData({});
      toast.success('Incident updated successfully');
    } catch (error) {
      toast.error('Failed to update incident');
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedData({});
  };

  const handleFieldChange = (field: keyof Incident, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusChange = async (status: string) => {
    if (isEditMode) {
      setEditedData(prev => ({ ...prev, status: status as Incident['status'] }));
    } else {
      try {
        // Map status to database format
        const dbStatus = status === 'in-progress' ? 'in_progress' : status;
        const { error } = await supabase
          .from('incidents')
          .update({ status: dbStatus as any, updated_at: new Date().toISOString() })
          .eq('id', incident.id);

        if (error) throw error;

        await refetch();
        toast.success(`Status changed to ${status.replace('-', ' ')}`);
      } catch (error) {
        toast.error('Failed to update status');
      }
    }
  };

  const handleAddComment = (text: string) => {
    toast.success('Comment added');
  };

  const handleRemoveLinkedItem = (itemId: string) => {
    toast.info('Link removed');
  };

  const handleRemoveWatcher = (watcherId: string) => {
    toast.info('Watcher removed');
  };

  const currentSummary = editedData.summary ?? incident.summary;
  const currentDescription = editedData.description ?? incident.description;

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <IncidentHeader
        incident={incident}
        isEditMode={isEditMode}
        editedSummary={currentSummary}
        onToggleEditMode={handleToggleEditMode}
        onSave={handleSave}
        onCancel={handleCancel}
        onSummaryChange={(value) => handleFieldChange('summary', value)}
      />

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        <div className="p-6 overflow-y-auto space-y-6 border-r border-border bg-card">
          <IncidentDescription
            description={incident.description}
            isEditMode={isEditMode}
            editedDescription={currentDescription}
            onDescriptionChange={(value) => handleFieldChange('description', value)}
          />

          <div>
            <IncidentAttachments
              attachments={incident.attachments || []}
              isEditMode={isEditMode}
              onUpload={(files) => {
                toast.success(`${files.length} file(s) uploaded`);
              }}
              onDelete={(attId) => {
                toast.success('Attachment removed');
              }}
              onDownload={(att) => toast.info(`Downloading ${att.name}...`)}
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 bg-muted/20">
          <IncidentDetailsPanel
            incident={incident}
            isEditMode={isEditMode}
            editedData={editedData}
            onFieldChange={handleFieldChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    </div>
  );
}
