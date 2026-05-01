/**
 * AssignModal — Modal for managing Feature owner and contributors
 * 
 * Two tabs:
 * - Owner Tab: Single selection (radio-style)
 * - Contributors Tab: Multiple selection (checkboxes)
 * 
 * Design System: Uses Catalyst approved colors only
 */

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Users, Search, X, Check, Circle, Plus, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamMembers, TeamMember, Contributor } from '@/hooks/useFeatureAssignments';
import { updateFeatureOwner, updateFeatureContributors } from '@/services/featureService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  featureKey: string;
  featureTitle: string;
  currentOwner: TeamMember | null;
  currentContributors: Contributor[];
  projectId?: string;
}

export function AssignModal({
  isOpen,
  onClose,
  featureId,
  featureKey,
  featureTitle,
  currentOwner,
  currentContributors,
  projectId,
}: AssignModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'owner' | 'contributors'>('owner');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for tracking changes
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(currentOwner?.id || null);
  const [selectedContributorIds, setSelectedContributorIds] = useState<string[]>(
    currentContributors.map(c => c.user?.id || c.user_id).filter(Boolean)
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOwnerId(currentOwner?.id || null);
      setSelectedContributorIds(currentContributors.map(c => c.user?.id || c.user_id).filter(Boolean));
      setSearchQuery('');
      setActiveTab('owner');
    }
  }, [isOpen, currentOwner, currentContributors]);

  // Fetch team members
  const { data: teamMembers = [], isLoading: loadingMembers } = useTeamMembers(projectId);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return teamMembers;
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(m => 
      m.full_name?.toLowerCase().includes(query) || 
      m.email?.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);

  // Available contributors (not already selected)
  const availableContributors = useMemo(() => {
    return filteredMembers.filter(m => !selectedContributorIds.includes(m.id));
  }, [filteredMembers, selectedContributorIds]);

  // Check for changes
  const ownerChanged = selectedOwnerId !== (currentOwner?.id || null);
  const contributorsChanged = JSON.stringify(selectedContributorIds.sort()) !== 
    JSON.stringify(currentContributors.map(c => c.user?.id || c.user_id).filter(Boolean).sort());
  const hasChanges = ownerChanged || contributorsChanged;
  const changesCount = (ownerChanged ? 1 : 0) + (contributorsChanged ? 1 : 0);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (ownerChanged) {
        await updateFeatureOwner(featureId, selectedOwnerId);
      }
      if (contributorsChanged) {
        await updateFeatureContributors(featureId, selectedContributorIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-assignments', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Assignments updated');
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to update assignments', { description: error.message });
    },
  });

  const handleSelectOwner = (memberId: string) => {
    setSelectedOwnerId(memberId === selectedOwnerId ? null : memberId);
  };

  const handleRemoveOwner = () => {
    setSelectedOwnerId(null);
  };

  const handleToggleContributor = (memberId: string) => {
    setSelectedContributorIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleRemoveContributor = (memberId: string) => {
    setSelectedContributorIds(prev => prev.filter(id => id !== memberId));
  };

  const getContributorData = (memberId: string): TeamMember | undefined => {
    return teamMembers.find(m => m.id === memberId);
  };

  const selectedOwnerData = selectedOwnerId ? teamMembers.find(m => m.id === selectedOwnerId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Manage Assignments</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono text-brand-primary font-medium">{featureKey}</span>
            {' — '}
            <span className="truncate">{featureTitle}</span>
          </p>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'owner' | 'contributors')} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 mx-6 mt-4 mb-2" style={{ width: 'calc(100% - 48px)' }}>
            <TabsTrigger value="owner" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Owner
            </TabsTrigger>
            <TabsTrigger value="contributors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contributors
              {selectedContributorIds.length > 0 && (
                <span className="ml-1">
                  <Lozenge appearance="inprogress">
                    {selectedContributorIds.length}
                  </Lozenge>
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Owner Tab */}
          <TabsContent value="owner" className="px-6 pb-2 mt-0">
            {/* Current Owner */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Current Owner
              </p>
              {selectedOwnerData ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-[rgba(37,99,235,0.12)] border-[var(--ds-text-brand, #2563eb)]">
                  <div className="flex items-center gap-3">
                    <Avatar src={selectedOwnerData.avatar_url || undefined} name={selectedOwnerData.full_name} size="small" />
                    <div>
                      <div className="font-medium text-sm">{selectedOwnerData.full_name}</div>
                      {selectedOwnerData.role && (
                        <div className="text-xs text-muted-foreground">{selectedOwnerData.role}</div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveOwner}
                    className="text-[var(--ds-text-danger, #ef4444)] hover:text-[var(--ds-text-danger, #dc2626)] hover:bg-[rgba(239,68,68,0.1)]"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed text-center text-muted-foreground text-sm">
                  Unassigned
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search to change owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Team Members List */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Team Members
              </p>
              <ScrollArea className="h-[200px] -mx-2">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No team members found
                  </div>
                ) : (
                  <div className="space-y-1 px-2">
                    {filteredMembers.map((member) => {
                      const isSelected = member.id === selectedOwnerId;
                      return (
                        <button
                          key={member.id}
                          onClick={() => handleSelectOwner(member.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left",
                            isSelected 
                              ? "bg-[rgba(37,99,235,0.12)] border-2 border-[var(--ds-text-brand, #2563eb)]" 
                              : "hover:bg-muted/50 border-2 border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar src={member.avatar_url || undefined} name={member.full_name} size="small" />
                            <div>
                              <div className="font-medium text-sm">{member.full_name}</div>
                              {member.role && (
                                <div className="text-xs text-muted-foreground">{member.role}</div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-[var(--ds-text-brand, #2563eb)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Contributors Tab */}
          <TabsContent value="contributors" className="px-6 pb-2 mt-0">
            {/* Current Contributors */}
            {selectedContributorIds.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Current Contributors ({selectedContributorIds.length})
                </p>
                <div className="space-y-1.5">
                  {selectedContributorIds.map((memberId, index) => {
                    const member = getContributorData(memberId);
                    if (!member) return null;
                    return (
                      <div 
                        key={memberId}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={member.avatar_url || undefined} name={member.full_name} size="xsmall" />
                          <div>
                            <div className="font-medium text-sm">{member.full_name}</div>
                            {member.role && (
                              <div className="text-xs text-muted-foreground">{member.role}</div>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-[var(--ds-text-danger, #ef4444)]"
                          onClick={() => handleRemoveContributor(memberId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Contributors */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Add Contributors
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[180px] -mx-2">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableContributors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? 'No matching members' : 'All members added'}
                  </div>
                ) : (
                  <div className="space-y-1 px-2">
                    {availableContributors.map((member, index) => (
                      <button
                        key={member.id}
                        onClick={() => handleToggleContributor(member.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="h-5 w-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                          {selectedContributorIds.includes(member.id) && (
                            <Check className="h-3 w-3 text-[var(--ds-text-brand, #2563eb)]" />
                          )}
                        </div>
                        <Avatar src={member.avatar_url || undefined} name={member.full_name} size="xsmall" />
                        <div>
                          <div className="font-medium text-sm">{member.full_name}</div>
                          {member.role && (
                            <div className="text-xs text-muted-foreground">{member.role}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {hasChanges 
              ? `${changesCount} change${changesCount > 1 ? 's' : ''} pending`
              : 'No changes'
            }
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className="bg-[var(--ds-text-brand, #2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered, #1d4ed8)] text-white"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
