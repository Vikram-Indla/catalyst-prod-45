import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ConversionType = 'business_request' | 'epic' | 'feature' | 'story';

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

    const { incident_id, convert_to, reason } = await req.json();

    if (!incident_id || !convert_to) {
      return new Response(JSON.stringify({ error: 'incident_id and convert_to are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes: ConversionType[] = ['business_request', 'epic', 'feature', 'story'];
    if (!validTypes.includes(convert_to)) {
      return new Response(JSON.stringify({ error: `convert_to must be one of: ${validTypes.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[convert-incident] Converting incident ${incident_id} to ${convert_to}`);

    // Get incident with committee status
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select(`
        *,
        committee:incident_committees(id, status)
      `)
      .eq('id', incident_id)
      .maybeSingle();

    if (incidentError || !incident) {
      return new Response(JSON.stringify({ error: 'Incident not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already converted
    if (incident.status === 'converted') {
      return new Response(JSON.stringify({ error: 'Incident already converted' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check committee approval if required
    if (incident.requires_committee) {
      const committee = incident.committee;
      if (!committee || committee.status !== 'approved') {
        return new Response(JSON.stringify({ 
          error: 'Committee approval required before conversion',
          committee_status: committee?.status || 'none'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create the target work item
    let createdItemId: string | null = null;
    const now = new Date().toISOString();

    if (convert_to === 'business_request') {
      const { data: br, error: brError } = await supabase
        .from('business_requests')
        .insert({
          title: `[From ${incident.incident_key}] ${incident.title}`,
          description: incident.description || `Converted from incident ${incident.incident_key}`,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (brError) {
        console.error('[convert-incident] Failed to create business request:', brError);
        return new Response(JSON.stringify({ error: 'Failed to create business request' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      createdItemId = br.id;
    } 
    else if (convert_to === 'epic') {
      const { data: epic, error: epicError } = await supabase
        .from('epics')
        .insert({
          name: `[From ${incident.incident_key}] ${incident.title}`,
          description: incident.description || `Converted from incident ${incident.incident_key}`,
          status: 'backlog',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (epicError) {
        console.error('[convert-incident] Failed to create epic:', epicError);
        return new Response(JSON.stringify({ error: 'Failed to create epic' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      createdItemId = epic.id;
    }
    else if (convert_to === 'feature') {
      const { data: feature, error: featureError } = await supabase
        .from('features')
        .insert({
          name: `[From ${incident.incident_key}] ${incident.title}`,
          description: incident.description || `Converted from incident ${incident.incident_key}`,
          status: 'backlog',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (featureError) {
        console.error('[convert-incident] Failed to create feature:', featureError);
        return new Response(JSON.stringify({ error: 'Failed to create feature' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      createdItemId = feature.id;
    }
    else if (convert_to === 'story') {
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          name: `[From ${incident.incident_key}] ${incident.title}`,
          description: incident.description || `Converted from incident ${incident.incident_key}`,
          status: 'backlog',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (storyError) {
        console.error('[convert-incident] Failed to create story:', storyError);
        return new Response(JSON.stringify({ error: 'Failed to create story' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      createdItemId = story.id;
    }

    if (!createdItemId) {
      return new Response(JSON.stringify({ error: 'Failed to create work item' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[convert-incident] Created ${convert_to} with id ${createdItemId}`);

    // Update incident with conversion details
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        status: 'converted',
        converted_to_type: convert_to,
        converted_to_id: createdItemId,
        converted_at: now,
        conversion_reason: reason || null,
        updated_by: user.id,
      })
      .eq('id', incident_id);

    if (updateError) {
      console.error('[convert-incident] Failed to update incident:', updateError);
    }

    // Add history entry
    await supabase.from('incident_history').insert({
      incident_id,
      field_name: 'status',
      old_value: incident.status,
      new_value: 'converted',
      changed_by: user.id,
    });

    // Add system comment
    await supabase.from('incident_comments').insert({
      incident_id,
      content: `Incident converted to ${convert_to}. ${reason ? `Reason: ${reason}` : ''}`,
      comment_type: 'system',
      is_system: true,
    });

    console.log(`[convert-incident] Successfully converted incident ${incident_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      converted_to_type: convert_to,
      converted_to_id: createdItemId,
      message: `Incident successfully converted to ${convert_to}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[convert-incident] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
