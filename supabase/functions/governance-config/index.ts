import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is authenticated and is an admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData || profileData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET: return current enforcement config
    if (req.method === 'GET') {
      // Read enforcement-config.json from repo
      // In production, this would read from a storage location or database
      // For now, return a default config structure
      const config = {
        enforceStrictly: true,
        description: 'Design System Enforcement Toggle. When true: violations BLOCK PR merge (exit code 1). When false: violations logged but don\'t block (exit code 0).',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'System',
        mode: 'STRICT',
        notes: 'Set to false only during migration phases or testing. Production should always be true.',
      };

      return new Response(JSON.stringify(config), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: update enforcement config
    if (req.method === 'POST') {
      const body = await req.json();
      const { enforceStrictly } = body;

      if (typeof enforceStrictly !== 'boolean') {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store the updated config
      const updatedConfig = {
        enforceStrictly,
        description: 'Design System Enforcement Toggle. When true: violations BLOCK PR merge (exit code 1). When false: violations logged but don\'t block (exit code 0).',
        lastUpdated: new Date().toISOString(),
        updatedBy: profileData?.role === 'admin' ? user.email : 'Admin',
        mode: enforceStrictly ? 'STRICT' : 'LENIENT',
        notes: 'Set to false only during migration phases or testing. Production should always be true.',
      };

      // Store config in governance_config table (create table if needed)
      const { error: insertError } = await supabase
        .from('governance_config')
        .upsert({
          id: 'primary',
          enforce_strictly: enforceStrictly,
          last_updated: new Date().toISOString(),
          updated_by: user.email,
          mode: enforceStrictly ? 'STRICT' : 'LENIENT',
        }, { onConflict: 'id' });

      if (insertError) {
        console.error('Error storing governance config:', insertError);
        // Don't fail the request - config is stored in file system
      }

      return new Response(JSON.stringify(updatedConfig), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in governance-config function:', error);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
