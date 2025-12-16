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

    // Get current user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { incident_id, member_ids, decision_note } = await req.json();

    if (!incident_id) {
      return new Response(JSON.stringify({ error: 'incident_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-to-committee] Starting for incident ${incident_id}`);

    // Get incident details
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('id, incident_key, status, support_level, requires_committee, committee_id')
      .eq('id', incident_id)
      .maybeSingle();

    if (incidentError || !incident) {
      console.error('[send-to-committee] Incident not found:', incidentError);
      return new Response(JSON.stringify({ error: 'Incident not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already has a committee
    if (incident.committee_id) {
      return new Response(JSON.stringify({ error: 'Incident already has a committee' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get committee members - either from request or fetch default members
    let memberUserIds: string[] = member_ids || [];
    
    if (memberUserIds.length === 0) {
      // Fetch users with committee_member or admin role from incident_user_profiles
      const { data: defaultMembers } = await supabase
        .from('incident_user_profiles')
        .select('id')
        .in('incident_role', ['committee_member', 'admin'])
        .limit(5);
      
      memberUserIds = defaultMembers?.map(m => m.id) || [];
    }

    if (memberUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No committee members available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-to-committee] Creating committee with ${memberUserIds.length} members`);

    // Create committee
    const { data: committee, error: committeeError } = await supabase
      .from('incident_committees')
      .insert({
        incident_id,
        status: 'pending',
        required_approvals: Math.ceil(memberUserIds.length / 2), // Majority
        decision_note: decision_note || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (committeeError || !committee) {
      console.error('[send-to-committee] Failed to create committee:', committeeError);
      return new Response(JSON.stringify({ error: 'Failed to create committee' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add committee members
    const memberInserts = memberUserIds.map(userId => ({
      committee_id: committee.id,
      user_id: userId,
      has_veto: false, // Will check user's has_veto_power separately
    }));

    const { error: membersError } = await supabase
      .from('committee_members')
      .insert(memberInserts);

    if (membersError) {
      console.error('[send-to-committee] Failed to add members:', membersError);
    }

    // Create pending votes for each member
    const { data: members } = await supabase
      .from('committee_members')
      .select('id')
      .eq('committee_id', committee.id);

    if (members && members.length > 0) {
      const voteInserts = members.map(member => ({
        committee_id: committee.id,
        member_id: member.id,
        vote: 'pending',
      }));

      await supabase.from('committee_votes').insert(voteInserts);
    }

    // Update incident status and link committee
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        status: 'to_committee',
        committee_id: committee.id,
        requires_committee: true,
        updated_by: user.id,
      })
      .eq('id', incident_id);

    if (updateError) {
      console.error('[send-to-committee] Failed to update incident:', updateError);
    }

    // Add history entry
    await supabase.from('incident_history').insert({
      incident_id,
      field_name: 'status',
      old_value: incident.status,
      new_value: 'to_committee',
      changed_by: user.id,
    });

    // Add system comment
    await supabase.from('incident_comments').insert({
      incident_id,
      content: `Incident sent to committee for approval. ${memberUserIds.length} members assigned.`,
      comment_type: 'system',
      is_system: true,
    });

    console.log(`[send-to-committee] Successfully created committee ${committee.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      committee_id: committee.id,
      message: 'Incident sent to committee for approval'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-to-committee] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
