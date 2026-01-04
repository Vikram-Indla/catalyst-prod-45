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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[1] || '';

    // POST /tm-auth/login
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = await req.json();
      
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile and roles
      const { data: profile } = await supabase
        .from('tm_users')
        .select('*, tm_user_roles(role_id, tm_roles(*))')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          user: data.user, 
          session: data.session,
          profile,
          message: 'Login successful' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-auth/register
    if (req.method === 'POST' && action === 'register') {
      const { email, password, display_name } = await req.json();
      
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { display_name }
        }
      });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create tm_users record
      if (data.user) {
        await supabase.from('tm_users').insert({
          auth_user_id: data.user.id,
          email: data.user.email,
          display_name: display_name || email.split('@')[0],
          status: 'active'
        });
      }

      return new Response(
        JSON.stringify({ 
          user: data.user, 
          session: data.session,
          message: 'Registration successful' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-auth/logout
    if (req.method === 'POST' && action === 'logout') {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Logout successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /tm-auth/me
    if (req.method === 'GET' && action === 'me') {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get full profile with roles and permissions
      const { data: profile } = await supabase
        .from('tm_users')
        .select(`
          *,
          tm_user_roles(
            role_id,
            project_id,
            tm_roles(
              id,
              name,
              permissions
            )
          )
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // Get user's projects
      const { data: projects } = await supabase
        .from('tm_user_roles')
        .select('project_id, tm_projects(*)')
        .eq('user_id', profile?.id);

      return new Response(
        JSON.stringify({ 
          user,
          profile,
          projects: projects?.map(p => p.tm_projects).filter(Boolean) || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-auth/refresh
    if (req.method === 'POST' && action === 'refresh') {
      const { refresh_token } = await req.json();
      
      const { data, error } = await supabase.auth.refreshSession({ refresh_token });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ session: data.session }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-auth/forgot-password
    if (req.method === 'POST' && action === 'forgot-password') {
      const { email } = await req.json();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${url.origin}/reset-password`
      });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Password reset email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-auth/reset-password
    if (req.method === 'POST' && action === 'reset-password') {
      const { password } = await req.json();
      
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Password updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /tm-auth/profile
    if (req.method === 'PATCH' && action === 'profile') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updates = await req.json();
      const allowedFields = ['display_name', 'avatar_url', 'preferences'];
      const filteredUpdates: Record<string, unknown> = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      const { data, error } = await supabase
        .from('tm_users')
        .update(filteredUpdates)
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
