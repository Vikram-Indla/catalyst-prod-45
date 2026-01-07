import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EpicData {
  id: string;
  name: string;
  description: string;
  quarter: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, draft_id, run_id } = body;

    if (!draft_id) {
      return new Response(JSON.stringify({ error: 'Missing draft_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: search_br - search business requests by request_key
    if (action === 'search_br') {
      const { query } = body;
      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: results, error } = await supabase
        .from('business_requests')
        .select('id, request_key, title, process_step, department')
        .is('deleted_at', null)
        .or(`request_key.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        return new Response(JSON.stringify({ error: 'Search failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: link_br - link a business request to a draft
    if (action === 'link_br') {
      const { request_key } = body;
      if (!request_key) {
        return new Response(JSON.stringify({ error: 'Missing request_key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if link already exists
      const { data: existing } = await supabase
        .from('ai_assist_links')
        .select('id')
        .eq('draft_id', draft_id)
        .eq('request_key', request_key)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ success: true, link_id: existing.id, already_linked: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create link
      const { data: link, error: linkError } = await supabase
        .from('ai_assist_links')
        .insert({
          draft_id,
          request_key,
          linked_by: user.id,
        })
        .select()
        .single();

      if (linkError) {
        console.error('Link error:', linkError);
        return new Response(JSON.stringify({ error: 'Failed to link BR: ' + linkError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log audit event
      await supabase.from('ai_assist_audit_events').insert({
        draft_id,
        run_id,
        event_type: 'br_linked',
        actor_user_id: user.id,
        payload_json: { request_key, link_id: link.id },
      });

      return new Response(JSON.stringify({ success: true, link_id: link.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: unlink_br - unlink a business request from a draft
    if (action === 'unlink_br') {
      const { link_id } = body;
      if (!link_id) {
        return new Response(JSON.stringify({ error: 'Missing link_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabase
        .from('ai_assist_links')
        .delete()
        .eq('id', link_id)
        .eq('draft_id', draft_id);

      if (deleteError) {
        console.error('Unlink error:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to unlink BR' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: get_links - get all linked BRs for a draft
    if (action === 'get_links') {
      const { data: links, error } = await supabase
        .from('ai_assist_links')
        .select('id, request_key, linked_at')
        .eq('draft_id', draft_id)
        .order('linked_at', { ascending: false });

      if (error) {
        console.error('Get links error:', error);
        return new Response(JSON.stringify({ error: 'Failed to get links' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch BR details for each link
      const enrichedLinks = await Promise.all(
        (links || []).map(async (link) => {
          const { data: br } = await supabase
            .from('business_requests')
            .select('id, title, process_step, department')
            .eq('request_key', link.request_key)
            .maybeSingle();

          return { ...link, br };
        })
      );

      return new Response(JSON.stringify({ links: enrichedLinks }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: publish_epics - publish epics to program board
    if (action === 'publish_epics') {
      const { epics, quarter, linked_br_id } = body as { epics: EpicData[]; quarter: string; linked_br_id?: string };
      
      if (!run_id) {
        return new Response(JSON.stringify({ error: 'Missing run_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!epics || !Array.isArray(epics) || epics.length === 0) {
        return new Response(JSON.stringify({ error: 'No epics to publish' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!quarter) {
        return new Response(JSON.stringify({ error: 'Quarter selection is mandatory' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Publishing ${epics.length} epics for quarter ${quarter}`);

      const publishedEpicIds: string[] = [];
      const errors: string[] = [];

      for (const epic of epics) {
        try {
          // Create epic in epics table
          const { data: createdEpic, error: epicError } = await supabase
            .from('epics')
            .insert({
              name: epic.name,
              description: epic.description,
              quarters: [quarter],
              status: 'funnel',
              state: 'funnel',
              linked_business_request_id: linked_br_id || null,
            })
            .select('id, epic_key')
            .single();

          if (epicError) {
            console.error('Epic creation error:', epicError);
            errors.push(`Failed to create epic "${epic.name}": ${epicError.message}`);
            continue;
          }

          // Store in ai_assist_published_epics
          const { error: publishError } = await supabase
            .from('ai_assist_published_epics')
            .insert({
              draft_id,
              run_id,
              epic_id: createdEpic.id,
              published_data: {
                source_id: epic.id,
                name: epic.name,
                description: epic.description,
                quarter,
                epic_key: createdEpic.epic_key,
              },
              published_by: user.id,
            });

          if (publishError) {
            console.error('Publish record error:', publishError);
            // Don't fail the whole operation, epic was created
          }

          publishedEpicIds.push(createdEpic.id);
        } catch (err) {
          console.error('Epic publish error:', err);
          errors.push(`Unexpected error for epic "${epic.name}"`);
        }
      }

      // Log audit event
      await supabase.from('ai_assist_audit_events').insert({
        draft_id,
        run_id,
        event_type: 'epics_published',
        actor_user_id: user.id,
        payload_json: {
          count: publishedEpicIds.length,
          quarter,
          epic_ids: publishedEpicIds,
          errors: errors.length > 0 ? errors : undefined,
        },
      });

      // Update draft status
      await supabase
        .from('ai_assist_drafts')
        .update({ status: 'published' })
        .eq('id', draft_id);

      return new Response(JSON.stringify({
        success: true,
        published_count: publishedEpicIds.length,
        epic_ids: publishedEpicIds,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: get_published_epics - get published epics for a draft
    if (action === 'get_published_epics') {
      const { data: published, error } = await supabase
        .from('ai_assist_published_epics')
        .select('id, epic_id, published_data, published_at')
        .eq('draft_id', draft_id)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Get published error:', error);
        return new Response(JSON.stringify({ error: 'Failed to get published epics' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ published }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
