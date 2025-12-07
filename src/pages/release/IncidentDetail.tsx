import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { IncidentHeader } from '@/components/incidents/IncidentHeader';
import { IncidentDescription } from '@/components/incidents/IncidentDescription';
import { IncidentTimeline } from '@/components/incidents/IncidentTimeline';
import { IncidentAttachments } from '@/components/incidents/IncidentAttachments';
import { IncidentDetailsPanel } from '@/components/incidents/IncidentDetailsPanel';
import { MajorIncidentPanel } from '@/components/incidents/MajorIncidentPanel';
import { SlackIntegrationPanel } from '@/components/incidents/SlackIntegrationPanel';
import { LinkedItemsPanel } from '@/components/incidents/LinkedItemsPanel';
import { WatchersPanel } from '@/components/incidents/WatchersPanel';
import incidentsData from '@/data/incidents.json';
import type { Incident, TimelineEvent, Attachment, Assignee } from '@/types/release';

// Cast and enhance data
const rawIncidents = incidentsData.incidents as any[];
const incidents: Incident[] = rawIncidents.map(inc => ({
  ...inc,
  severity: inc.severity || 'SEV2',
  labels: inc.labels || ['production'],
  isMajorIncident: inc.isMajorIncident || false,
  slackChannel: inc.slackChannel || null,
  attachments: inc.attachments || [
    { id: 'att-1', name: 'error_logs.txt', size: '2.3 MB', uploadedBy: inc.assignee?.name || 'User', uploadedAt: '2:25 PM' },
  ],
  timeline: inc.timeline || [
    { id: 't1', type: 'created', user: 'System', time: '2:20 PM', event: 'Incident created', dotColor: 'gray' },
    { id: 't2', type: 'assignment', user: 'System', time: '2:22 PM', event: `Assigned to ${inc.assignee?.name}`, dotColor: 'gray' },
  ],
  watcherDetails: (inc.watchers || []).map((id: string, i: number) => ({
    id,
    name: `Watcher ${i + 1}`,
    initials: `W${i + 1}`,
  })),
}));

export default function IncidentDetail() {
  const { id } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [incident, setIncident] = useState<Incident | null>(() => 
    incidents.find(inc => inc.id === id) || null
  );
  
  // Edit state
  const [editedData, setEditedData] = useState<Partial<Incident>>({});

  if (!incident) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Incident not found</h2>
          <Link to="/release/incidents" className="text-[#C69C6D] hover:underline">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleEditMode = () => {
    if (!isEditMode) {
      // Entering edit mode - initialize edited data
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

  const handleSave = () => {
    // Apply changes
    setIncident(prev => prev ? { ...prev, ...editedData, updatedAt: new Date().toISOString() } : null);
    setIsEditMode(false);
    setEditedData({});
    toast.success('Incident updated successfully');
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedData({});
  };

  const handleFieldChange = (field: keyof Incident, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusChange = (status: string) => {
    if (isEditMode) {
      setEditedData(prev => ({ ...prev, status: status as any }));
    } else {
      // Direct status change via buttons
      setIncident(prev => prev ? { ...prev, status: status as any, updatedAt: new Date().toISOString() } : null);
      toast.success(`Status changed to ${status.replace('-', ' ')}`);
    }
  };

  const handleAddComment = (text: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      author: { id: 'current-user', name: 'Current User', initials: 'CU' },
      text,
      createdAt: new Date().toISOString(),
    };
    setIncident(prev => prev ? { 
      ...prev, 
      comments: [newComment, ...prev.comments],
      updatedAt: new Date().toISOString()
    } : null);
    toast.success('Comment added');
  };

  const handleRemoveLinkedItem = (itemId: string) => {
    setIncident(prev => prev ? {
      ...prev,
      linkedItems: prev.linkedItems.filter(item => item.id !== itemId),
    } : null);
  };

  const handleRemoveWatcher = (watcherId: string) => {
    setIncident(prev => prev ? {
      ...prev,
      watcherDetails: prev.watcherDetails?.filter(w => w.id !== watcherId),
      watchers: prev.watchers.filter(id => id !== watcherId),
    } : null);
  };

  // Get current values (edited or original)
  const currentSummary = editedData.summary ?? incident.summary;
  const currentDescription = editedData.description ?? incident.description;

  return (
    <div className="h-full flex flex-col bg-[#F5F5F5]">
      {/* Header */}
      <IncidentHeader
        incident={incident}
        isEditMode={isEditMode}
        editedSummary={currentSummary}
        onToggleEditMode={handleToggleEditMode}
        onSave={handleSave}
        onCancel={handleCancel}
        onSummaryChange={(value) => handleFieldChange('summary', value)}
      />

      {/* Main Content - 70/30 Split */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Left Column (70%) */}
        <div className="p-6 overflow-y-auto space-y-6 border-r border-border bg-card">
          {/* Description */}
          <IncidentDescription
            description={incident.description}
            isEditMode={isEditMode}
            editedDescription={currentDescription}
            onDescriptionChange={(value) => handleFieldChange('description', value)}
          />

          {/* Activity & Timeline - Jira style */}
          <IncidentTimeline
            timeline={incident.timeline || []}
            comments={incident.comments}
            onAddComment={handleAddComment}
          />

          {/* Attachments */}
          <div>
            <IncidentAttachments
              attachments={incident.attachments || []}
              isEditMode={isEditMode}
              onUpload={(files) => {
                const newAttachments: Attachment[] = Array.from(files).map((file, i) => ({
                  id: `att-${Date.now()}-${i}`,
                  name: file.name,
                  size: `${(file.size / 1024).toFixed(1)} KB`,
                  uploadedBy: 'Current User',
                  uploadedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                }));
                setIncident(prev => prev ? {
                  ...prev,
                  attachments: [...(prev.attachments || []), ...newAttachments],
                } : null);
                toast.success(`${files.length} file(s) uploaded`);
              }}
              onDelete={(attId) => {
                setIncident(prev => prev ? {
                  ...prev,
                  attachments: prev.attachments?.filter(a => a.id !== attId),
                } : null);
                toast.success('Attachment removed');
              }}
              onDownload={(att) => toast.info(`Downloading ${att.name}...`)}
            />
          </div>
        </div>

        {/* Right Column (30%) */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#FAFBFC]">
          {/* Details Panel */}
          <IncidentDetailsPanel
            incident={incident}
            isEditMode={isEditMode}
            editedData={editedData}
            onFieldChange={handleFieldChange}
            onStatusChange={handleStatusChange}
          />

          {/* Major Incident Panel */}
          <MajorIncidentPanel
            incident={incident}
            isEditMode={isEditMode}
            editedData={editedData}
            onFieldChange={handleFieldChange}
          />

          {/* Slack Integration */}
          <SlackIntegrationPanel incident={incident} />

          {/* Linked Items */}
          <LinkedItemsPanel
            linkedItems={incident.linkedItems}
            isEditMode={isEditMode}
            onRemoveItem={handleRemoveLinkedItem}
            onAddItem={() => toast.info('Link work item dialog would open')}
          />

          {/* Watchers */}
          <WatchersPanel
            watchers={incident.watcherDetails || []}
            isEditMode={isEditMode}
            onRemoveWatcher={handleRemoveWatcher}
            onAddWatcher={() => toast.info('Add watcher dialog would open')}
          />
        </div>
      </div>
    </div>
  );
}
