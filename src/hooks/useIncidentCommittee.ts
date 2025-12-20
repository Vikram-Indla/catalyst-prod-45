import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IncidentCommitteeVote {
  vote: string;
  voted_at?: string | null;
  comment?: string | null;
}

export interface IncidentCommitteeMember {
  id: string;
  role?: string | null;
  has_veto: boolean;
  user?: {
    id: string;
    full_name: string;
    avatar_initials?: string | null;
    email?: string | null;
  } | null;
  vote?: IncidentCommitteeVote | null;
}

export interface IncidentCommittee {
  id: string;
  status: string;
  decision_note?: string | null;
  required_approvals?: number | null;
  due_date?: string | null;
  created_at?: string;
  members?: IncidentCommitteeMember[];
}

export function useIncidentCommittee(incidentId: string) {
  return useQuery({
    queryKey: ['incident-committee', incidentId],
    enabled: !!incidentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_committees')
        .select(
          `
          *,
          members:committee_members(
            *,
            user:incident_user_profiles(*),
            vote:committee_votes(*)
          )
        `
        )
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const committee = (data && data.length > 0 ? data[0] : null) as any;
      if (!committee) return null;

      return {
        ...committee,
        members: Array.isArray(committee.members)
          ? committee.members.map((m: any) => ({
              ...m,
              vote: Array.isArray(m.vote) ? m.vote[0] : m.vote,
            }))
          : [],
      } as IncidentCommittee;
    },
  });
}
