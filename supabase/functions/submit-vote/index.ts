import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { committee_id, vote, comment, is_veto } = await req.json();

    if (!committee_id || !vote) {
      return new Response(JSON.stringify({ error: 'committee_id and vote are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['approved', 'rejected'].includes(vote)) {
      return new Response(JSON.stringify({ error: 'Vote must be "approved" or "rejected"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[submit-vote] User ${user.id} voting ${vote} on committee ${committee_id}`);

    // Get committee and check it's pending
    const { data: committee, error: committeeError } = await supabase
      .from('incident_committees')
      .select('id, incident_id, status, required_approvals')
      .eq('id', committee_id)
      .maybeSingle();

    if (committeeError || !committee) {
      return new Response(JSON.stringify({ error: 'Committee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (committee.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Committee voting is closed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find user's membership
    const { data: membership, error: memberError } = await supabase
      .from('committee_members')
      .select('id, has_veto')
      .eq('committee_id', committee_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'You are not a member of this committee' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user's veto power from profile
    const { data: userProfile } = await supabase
      .from('incident_user_profiles')
      .select('has_veto_power')
      .eq('id', user.id)
      .maybeSingle();

    const hasVetoPower = userProfile?.has_veto_power || membership.has_veto;
    const isVetoVote = is_veto && hasVetoPower && vote === 'rejected';

    // Determine vote status
    const voteStatus = isVetoVote ? 'vetoed' : vote;

    // Update or create vote
    const { error: voteError } = await supabase
      .from('committee_votes')
      .upsert({
        committee_id,
        member_id: membership.id,
        vote: voteStatus,
        comment: comment || null,
        voted_at: new Date().toISOString(),
      }, {
        onConflict: 'committee_id,member_id',
      });

    if (voteError) {
      console.error('[submit-vote] Failed to record vote:', voteError);
      return new Response(JSON.stringify({ error: 'Failed to record vote' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[submit-vote] Vote recorded: ${voteStatus}`);

    // Check if veto was cast - immediately reject
    if (isVetoVote) {
      await supabase
        .from('incident_committees')
        .update({
          status: 'rejected',
          decision_note: `Vetoed: ${comment || 'No reason provided'}`,
          decided_at: new Date().toISOString(),
        })
        .eq('id', committee_id);

      // Update incident status
      await supabase
        .from('incidents')
        .update({ status: 'in_progress', updated_by: user.id })
        .eq('id', committee.incident_id);

      // Add system comment
      await supabase.from('incident_comments').insert({
        incident_id: committee.incident_id,
        content: `Committee approval VETOED. Incident returned to in-progress.`,
        comment_type: 'system',
        is_system: true,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        committee_status: 'rejected',
        message: 'Veto cast - committee rejected'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count votes to check for majority
    const { data: allVotes } = await supabase
      .from('committee_votes')
      .select('vote')
      .eq('committee_id', committee_id);

    const approvedCount = allVotes?.filter(v => v.vote === 'approved').length || 0;
    const rejectedCount = allVotes?.filter(v => v.vote === 'rejected').length || 0;
    const totalMembers = allVotes?.length || 0;

    console.log(`[submit-vote] Vote counts - Approved: ${approvedCount}, Rejected: ${rejectedCount}, Required: ${committee.required_approvals}`);

    let newCommitteeStatus = 'pending';
    let message = 'Vote recorded';

    // Check if majority approved
    if (approvedCount >= committee.required_approvals) {
      newCommitteeStatus = 'approved';
      message = 'Committee approved - incident can now be converted';

      await supabase
        .from('incident_committees')
        .update({
          status: 'approved',
          decided_at: new Date().toISOString(),
        })
        .eq('id', committee_id);

      await supabase.from('incident_comments').insert({
        incident_id: committee.incident_id,
        content: `Committee APPROVED with ${approvedCount} of ${totalMembers} votes. Incident can now be converted.`,
        comment_type: 'system',
        is_system: true,
      });
    }
    // Check if majority rejected (without veto)
    else if (rejectedCount > totalMembers - committee.required_approvals) {
      newCommitteeStatus = 'rejected';
      message = 'Committee rejected - majority voted against';

      await supabase
        .from('incident_committees')
        .update({
          status: 'rejected',
          decided_at: new Date().toISOString(),
        })
        .eq('id', committee_id);

      await supabase
        .from('incidents')
        .update({ status: 'in_progress', updated_by: user.id })
        .eq('id', committee.incident_id);

      await supabase.from('incident_comments').insert({
        incident_id: committee.incident_id,
        content: `Committee REJECTED with ${rejectedCount} votes against. Incident returned to in-progress.`,
        comment_type: 'system',
        is_system: true,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      committee_status: newCommitteeStatus,
      votes: { approved: approvedCount, rejected: rejectedCount, required: committee.required_approvals },
      message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[submit-vote] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
