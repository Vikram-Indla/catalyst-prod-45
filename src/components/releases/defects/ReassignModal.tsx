import { useState, useMemo, useEffect } from 'react';
import { Search, User, UserPlus, Clock, AlertCircle, CheckCircle, X, Lightbulb, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useApprovedProfiles, type ApprovedProfile } from '@/hooks/useApprovedProfiles';
import { useAuth } from '@/lib/auth';

interface Assignee {
  name: string;
  initials: string;
  color: string;
}

interface EnrichedProfile extends ApprovedProfile {
  activeDefects?: number;
  isCurrentUser?: boolean;
}

interface ReassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignee: Assignee | null;
  onReassign: (assigneeId: string) => void;
  defectId?: string;
  defectTitle?: string;
}

// Avatar color mapping
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// Workload indicator color based on active defect count
const getWorkloadColor = (count: number) => {
  if (count <= 2) return 'text-green-600 bg-green-50';
  if (count <= 5) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
};

export function ReassignModal({ 
  open, 
  onOpenChange, 
  currentAssignee, 
  onReassign,
  defectId,
  defectTitle 
}: ReassignModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<EnrichedProfile | null>(null);
  
  const { user } = useAuth();
  const { data: profiles = [], isLoading } = useApprovedProfiles();

  // Enrich profiles with simulated workload data and current user flag
  const enrichedMembers = useMemo<EnrichedProfile[]>(() => {
    return profiles.map((profile) => ({
      ...profile,
      // Simulate active defects (in production, this would come from a query)
      activeDefects: Math.floor(Math.random() * 8) + 1,
      isCurrentUser: profile.id === user?.id,
    }));
  }, [profiles, user?.id]);

  // Get current user from profiles
  const currentUser = useMemo(() => {
    return enrichedMembers.find(m => m.isCurrentUser);
  }, [enrichedMembers]);

  // Find currently assigned member
  const currentlyAssigned = useMemo(() => {
    if (!currentAssignee) return null;
    return enrichedMembers.find(m => 
      m.initials === currentAssignee.initials || m.name === currentAssignee.name
    ) || null;
  }, [enrichedMembers, currentAssignee]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedMember(currentlyAssigned);
    }
  }, [open, currentlyAssigned]);

  // Smart suggestions: low workload + not currently assigned
  const suggestedMembers = useMemo(() => {
    return enrichedMembers
      .filter(m => (m.activeDefects || 0) <= 3)
      .filter(m => m.id !== currentlyAssigned?.id)
      .slice(0, 3);
  }, [enrichedMembers, currentlyAssigned]);

  // Recently assigned (simulated - show random subset for demo)
  const recentlyAssigned = useMemo(() => {
    // In production, this would query recent defect assignments
    return enrichedMembers
      .filter(m => m.id !== currentlyAssigned?.id)
      .slice(0, 2);
  }, [enrichedMembers, currentlyAssigned]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return enrichedMembers.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    );
  }, [searchQuery, enrichedMembers]);

  // Handle reassignment
  const handleReassign = () => {
    // Return the member initials or empty string for unassigned
    onReassign(selectedMember?.initials || '');
    onOpenChange(false);
  };

  // Member row component
  const MemberRow = ({ member, showWorkload = true }: { member: EnrichedProfile; showWorkload?: boolean }) => (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border",
        selectedMember?.id === member.id 
          ? "border-primary bg-primary/5" 
          : "border-transparent hover:bg-muted/50"
      )}
      onClick={() => setSelectedMember(member)}
    >
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
        getAvatarColor(member.name)
      )}>
        {member.initials}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{member.name}</span>
          {member.isCurrentUser && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {member.email}
        </div>
      </div>
      
      {/* Workload */}
      {showWorkload && member.activeDefects !== undefined && (
        <div className={cn(
          "text-xs px-2 py-1 rounded-full flex-shrink-0",
          getWorkloadColor(member.activeDefects)
        )}>
          {member.activeDefects} active
        </div>
      )}
      
      {/* Workload */}
      {showWorkload && member.activeDefects !== undefined && (
        <div className={cn(
          "text-xs px-2 py-1 rounded-full flex-shrink-0",
          getWorkloadColor(member.activeDefects)
        )}>
          {member.activeDefects} active
        </div>
      )}
      
      {/* Selected indicator */}
      {selectedMember?.id === member.id && (
        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-card overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="w-5 h-5 text-primary" />
              Reassign Defect
            </DialogTitle>
            {defectId && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                <span className="font-mono font-medium text-foreground">{defectId}</span>
                {defectTitle && ` — ${defectTitle.slice(0, 50)}${defectTitle.length > 50 ? '...' : ''}`}
              </p>
            )}
          </div>
          
          {/* Current Assignee */}
          {currentAssignee && currentAssignee.name !== 'Unassigned' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
              <span>Currently assigned to:</span>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                getAvatarColor(currentAssignee.name)
              )}>
                {currentAssignee.initials}
              </div>
              <span className="font-medium text-foreground">{currentAssignee.name}</span>
            </div>
          )}
        </DialogHeader>
        
        {/* Search */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, role, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-background"
              autoFocus
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          <div className="px-6 py-4 space-y-6">
            
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-3" />
                Loading team members...
              </div>
            )}
            
            {!isLoading && (
              <>
                {/* Quick Actions */}
                {!searchQuery && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Quick Actions
                    </h4>
                    <div className="flex gap-2">
                      {currentUser && currentUser.id !== currentlyAssigned?.id && (
                        <Button
                          variant={selectedMember?.id === currentUser.id ? "default" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={() => setSelectedMember(currentUser)}
                        >
                          <User className="w-4 h-4" />
                          Assign to me
                        </Button>
                      )}
                      <Button
                        variant={selectedMember === null ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedMember(null)}
                      >
                        <X className="w-4 h-4" />
                        Unassign
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Search Results */}
                {searchQuery && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Search Results ({searchResults.length})
                    </h4>
                    {searchResults.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.map(member => (
                          <MemberRow key={member.id} member={member} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No team members found for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Suggested (Low Workload) */}
                {!searchQuery && suggestedMembers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Suggested (Low Workload)
                    </h4>
                    <div className="space-y-1">
                      {suggestedMembers.map(member => (
                        <MemberRow key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recently Assigned Similar */}
                {!searchQuery && recentlyAssigned.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Recently Worked on Similar Issues
                    </h4>
                    <div className="space-y-1">
                      {recentlyAssigned.map(member => (
                        <MemberRow key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Team Members (when not searching and no suggestions) */}
                {!searchQuery && suggestedMembers.length === 0 && recentlyAssigned.length === 0 && enrichedMembers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      All Team Members
                    </h4>
                    <div className="space-y-1">
                      {enrichedMembers.map(member => (
                        <MemberRow key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {selectedMember ? (
              <span>
                Will assign to <span className="font-medium text-foreground">{selectedMember.name}</span>
              </span>
            ) : (
              <span>Will remove assignment</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassign}>
              Reassign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
