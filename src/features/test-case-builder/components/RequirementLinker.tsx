// =====================================================
// REQUIREMENT LINKER COMPONENT
// Link test cases to requirements/stories
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Link2, 
  Plus, 
  Trash2, 
  ExternalLink,
  BookOpen,
  Layers,
  Target,
  FileText,
  Globe
} from 'lucide-react';
import { 
  useCaseRequirements, 
  useLinkRequirement, 
  useUnlinkRequirement,
  useUpdateCoverageStatus,
  RequirementLink,
  RequirementType,
  LinkType,
  CoverageStatus,
  REQUIREMENT_TYPE_LABELS,
  LINK_TYPE_LABELS,
  COVERAGE_STATUS_LABELS
} from '@/hooks/test-cases/useRequirementLinks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RequirementLinkerProps {
  caseId: string;
  projectId: string;
}

const TYPE_ICONS: Record<RequirementType, React.ElementType> = {
  story: BookOpen,
  epic: Layers,
  feature: Target,
  business_request: FileText,
  external: Globe,
};

export function RequirementLinker({ caseId, projectId }: RequirementLinkerProps) {
  const { data: links = [], isLoading } = useCaseRequirements(caseId);
  const linkRequirement = useLinkRequirement();
  const unlinkRequirement = useUnlinkRequirement();
  const updateCoverage = useUpdateCoverageStatus();
  
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RequirementLink | null>(null);
  const [linkTab, setLinkTab] = useState<'internal' | 'external'>('internal');
  
  // Form state
  const [selectedType, setSelectedType] = useState<RequirementType>('story');
  const [selectedId, setSelectedId] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('verifies');
  const [externalKey, setExternalKey] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');

  const handleLink = async () => {
    try {
      if (linkTab === 'internal') {
        if (!selectedId) {
          toast.error('Please select a requirement');
          return;
        }
        await linkRequirement.mutateAsync({
          caseId,
          requirementType: selectedType,
          requirementId: selectedId,
          linkType,
        });
      } else {
        if (!externalKey && !externalUrl) {
          toast.error('Please enter external key or URL');
          return;
        }
        await linkRequirement.mutateAsync({
          caseId,
          requirementType: 'external',
          externalKey: externalKey || undefined,
          externalUrl: externalUrl || undefined,
          externalTitle: externalTitle || undefined,
          linkType,
        });
      }
      
      toast.success('Requirement linked');
      setIsLinkOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to link requirement');
      console.error(error);
    }
  };

  const handleUnlink = async () => {
    if (!deleteTarget) return;
    try {
      await unlinkRequirement.mutateAsync({ linkId: deleteTarget.id, caseId });
      toast.success('Requirement unlinked');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to unlink requirement');
      console.error(error);
    }
  };

  const handleCoverageChange = async (linkId: string, status: CoverageStatus) => {
    try {
      await updateCoverage.mutateAsync({ linkId, status, caseId });
    } catch (error) {
      toast.error('Failed to update coverage status');
    }
  };

  const resetForm = () => {
    setSelectedType('story');
    setSelectedId('');
    setLinkType('verifies');
    setExternalKey('');
    setExternalUrl('');
    setExternalTitle('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Requirements
            {links.length > 0 && (
              <Badge variant="secondary">{links.length}</Badge>
            )}
          </CardTitle>
          <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Link Requirement</DialogTitle>
              </DialogHeader>
              
              <Tabs value={linkTab} onValueChange={(v) => setLinkTab(v as 'internal' | 'external')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="internal">Internal</TabsTrigger>
                  <TabsTrigger value="external">External</TabsTrigger>
                </TabsList>
                
                <TabsContent value="internal" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Requirement Type</label>
                    <Select value={selectedType} onValueChange={(v: RequirementType) => setSelectedType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['story', 'epic', 'feature', 'business_request'] as RequirementType[]).map(type => (
                          <SelectItem key={type} value={type}>
                            {REQUIREMENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Requirement ID</label>
                    <Input
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      placeholder="Enter requirement UUID..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the ID of the story, epic, feature, or business request
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="external" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">External Key</label>
                    <Input
                      value={externalKey}
                      onChange={(e) => setExternalKey(e.target.value)}
                      placeholder="e.g., JIRA-123, REQ-456"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL (optional)</label>
                    <Input
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title (optional)</label>
                    <Input
                      value={externalTitle}
                      onChange={(e) => setExternalTitle(e.target.value)}
                      placeholder="Requirement description"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">Link Type</label>
                <Select value={linkType} onValueChange={(v: LinkType) => setLinkType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsLinkOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLink} disabled={linkRequirement.isPending}>
                  Link Requirement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">
            No requirements linked yet
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {links.map((link) => {
                const IconComponent = TYPE_ICONS[link.requirement_type];
                const coverageInfo = COVERAGE_STATUS_LABELS[link.coverage_status];
                
                return (
                  <div
                    key={link.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {REQUIREMENT_TYPE_LABELS[link.requirement_type]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {LINK_TYPE_LABELS[link.link_type]}
                          </Badge>
                        </div>
                        
                        <p className="font-medium truncate">
                          {link.requirement_title || link.external_title || link.external_key || 'Unknown'}
                        </p>
                        
                        {link.requirement_status && (
                          <p className="text-xs text-muted-foreground">
                            Status: {link.requirement_status}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={link.coverage_status}
                          onValueChange={(v: CoverageStatus) => handleCoverageChange(link.id, v)}
                        >
                          <SelectTrigger className={cn("h-7 text-xs w-24", coverageInfo.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COVERAGE_STATUS_LABELS).map(([value, info]) => (
                              <SelectItem key={value} value={value}>
                                {info.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {link.external_url && (
                          <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                            <a href={link.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(link)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the link to "{deleteTarget?.requirement_title || deleteTarget?.external_key}"? 
              This won't delete the requirement itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnlink}
              className="bg-destructive hover:bg-destructive/90"
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
