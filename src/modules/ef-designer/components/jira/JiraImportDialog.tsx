import React, { useState } from 'react';
import { useJiraConnections, useJiraProjects, useJiraEpics, useImportJiraEpics } from '../../hooks/useEFDJira';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Link2, FolderOpen, Layers } from 'lucide-react';

interface JiraImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onImportComplete?: () => void;
}

export const JiraImportDialog: React.FC<JiraImportDialogProps> = ({
  open,
  onOpenChange,
  sessionId,
  onImportComplete,
}) => {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedEpicIds, setSelectedEpicIds] = useState<Set<string>>(new Set());

  const { data: connections = [], isLoading: connectionsLoading } = useJiraConnections();
  const { data: projects = [], isLoading: projectsLoading } = useJiraProjects(selectedConnection);
  const { data: epics = [], isLoading: epicsLoading } = useJiraEpics(selectedProject);
  const importEpics = useImportJiraEpics();

  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setSelectedProject(null);
    setSelectedEpicIds(new Set());
  };

  const handleProjectChange = (projectKey: string) => {
    setSelectedProject(projectKey);
    setSelectedEpicIds(new Set());
  };

  const toggleEpic = (epicId: string) => {
    const next = new Set(selectedEpicIds);
    if (next.has(epicId)) {
      next.delete(epicId);
    } else {
      next.add(epicId);
    }
    setSelectedEpicIds(next);
  };

  const toggleAll = () => {
    if (selectedEpicIds.size === epics.length) {
      setSelectedEpicIds(new Set());
    } else {
      setSelectedEpicIds(new Set(epics.map((e) => e.id)));
    }
  };

  const handleImport = async () => {
    const selectedJiraEpics = epics.filter((e) => selectedEpicIds.has(e.id));
    await importEpics.mutateAsync({
      sessionId,
      jiraEpics: selectedJiraEpics,
    });
    onOpenChange(false);
    onImportComplete?.();
  };

  const hasNoConnections = !connectionsLoading && connections.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Import from Jira
          </DialogTitle>
          <DialogDescription>
            Select a Jira project and choose epics to import
          </DialogDescription>
        </DialogHeader>

        {hasNoConnections ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No Jira Connections</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need to configure a Jira connection first.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to Admin → Connectors → Jira Integration to set up a connection.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Selector */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Jira Connection</label>
              <Select
                value={selectedConnection || ''}
                onValueChange={handleConnectionChange}
                disabled={connectionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={connectionsLoading ? 'Loading...' : 'Select connection'} />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        {conn.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selector */}
            {selectedConnection && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Jira Project</label>
                <Select
                  value={selectedProject || ''}
                  onValueChange={handleProjectChange}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={projectsLoading ? 'Loading...' : 'Select project'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.jira_project_key}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          {proj.jira_project_key} - {proj.jira_project_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Epics List */}
            {selectedProject && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Available Epics</label>
                  {epics.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedEpicIds.size === epics.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>

                {epicsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : epics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No epics found in this project
                  </div>
                ) : (
                  <ScrollArea className="h-[250px] border rounded-lg">
                    <div className="p-2 space-y-1">
                      {epics.map((epic) => (
                        <div
                          key={epic.id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedEpicIds.has(epic.id)
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleEpic(epic.id)}
                        >
                          <Checkbox
                            checked={selectedEpicIds.has(epic.id)}
                            onCheckedChange={() => toggleEpic(epic.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {epic.jira_key}
                              </Badge>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {epic.status}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm">{epic.summary}</p>
                            {epic.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {epic.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedEpicIds.size === 0 || importEpics.isPending || hasNoConnections}
          >
            {importEpics.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Import {selectedEpicIds.size > 0 ? `${selectedEpicIds.size} Epic(s)` : 'Epics'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
