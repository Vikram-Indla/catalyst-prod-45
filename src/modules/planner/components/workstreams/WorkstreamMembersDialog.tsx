// ============================================================
// WORKSTREAM MEMBERS DIALOG
// Shows member details: name, role, and current assignment
// ============================================================

import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { WorkstreamMember, Workstream } from '../../hooks/usePlannerWorkstreams';

interface MemberWithDetails extends WorkstreamMember {
  assignment_name?: string | null;
  role_name?: string | null;
}

interface WorkstreamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workstream: Workstream | null;
}

const COLORS = {
  accent: '#2563eb',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  borderLight: '#e2e8f0',
  surfaceHover: '#f8fafc',
};

// Generate avatar background color from user ID
const getAvatarColor = (userId: string): string => {
  const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#be185d'];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Get initials from name
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export function WorkstreamMembersDialog({
  open,
  onOpenChange,
  workstream,
}: WorkstreamMembersDialogProps) {
  const [membersWithDetails, setMembersWithDetails] = useState<MemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch member details when dialog opens
  useEffect(() => {
    if (!open || !workstream?.members?.length) {
      setMembersWithDetails([]);
      return;
    }

    const fetchMemberDetails = async () => {
      setIsLoading(true);
      try {
        const userIds = workstream.members!.map(m => m.user_id).filter(Boolean);
        
        if (userIds.length === 0) {
          setMembersWithDetails(workstream.members || []);
          return;
        }

        // Fetch resource inventory data for assignments and roles
        const { data: inventoryData } = await supabase
          .from('resource_inventory')
          .select(`
            id,
            profile_id,
            role_name,
            assignment_id
          `)
          .in('profile_id', userIds);

        // Get assignment names if we have assignment IDs
        const assignmentIds = ((inventoryData || []) as any[])
          .map(r => r.assignment_id)
          .filter((id): id is string => !!id);

        let assignmentNames: Record<string, string> = {};
        if (assignmentIds.length > 0) {
          const { data: assignments } = await supabase
            .from('resource_assignments')
            .select('id, name')
            .in('id', assignmentIds);

          (assignments || []).forEach(a => {
            assignmentNames[a.id] = a.name;
          });
        }

        // Map resource data by profile_id
        const resourceByProfileId = new Map<string, { role_name: string | null; assignment_name: string | null }>();
        ((inventoryData || []) as any[]).forEach(r => {
          if (r.profile_id) {
            resourceByProfileId.set(r.profile_id, {
              role_name: r.role_name,
              assignment_name: r.assignment_id ? assignmentNames[r.assignment_id] || null : null,
            });
          }
        });

        // Merge with member data
        const enhanced = workstream.members!.map(m => {
          const resourceData = resourceByProfileId.get(m.user_id);
          return {
            ...m,
            role_name: resourceData?.role_name || null,
            assignment_name: resourceData?.assignment_name || null,
          };
        });

        setMembersWithDetails(enhanced);
      } catch (error) {
        console.error('Error fetching member details:', error);
        setMembersWithDetails(workstream.members || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberDetails();
  }, [open, workstream]);

  const memberCount = workstream?.members?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4" />
            {workstream?.name} — {memberCount} Member{memberCount !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Loading members...
            </div>
          ) : membersWithDetails.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No members in this workstream
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {membersWithDetails.map((member) => {
                const name = member.profile?.full_name || member.profile?.email || 'Unknown';
                const initials = getInitials(name);
                const avatarColor = getAvatarColor(member.user_id);
                const roleBadge = member.role === 'lead' ? 'Lead' : 'Member';
                
                return (
                  <div
                    key={member.id}
                    className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: avatarColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                            {name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              member.role === 'lead'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {roleBadge}
                          </span>
                        </div>
                        
                        {/* Role */}
                        {member.role_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {member.role_name}
                          </p>
                        )}
                        
                        {/* Assignment */}
                        {member.assignment_name && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            Assigned to: {member.assignment_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {membersWithDetails.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Click on the workstream name to manage members
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
