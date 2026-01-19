// ============================================================
// CATALYST SLACK ADMIN - Edge Function
// Handles all admin operations for Slack integration
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================
// HELPERS
// ============================================================

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function verifyAdmin(authHeader: string): Promise<{ userId: string; email: string } | null> {
  if (!authHeader) return null;
  
  const supabase = getSupabaseAdmin();
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile) return null;
  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    return null;
  }
  
  return { userId: user.id, email: user.email || '' };
}

// Simple encryption (use proper encryption in production)
function encrypt(text: string): string {
  return btoa(text);
}

function decrypt(encrypted: string): string {
  return atob(encrypted);
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').filter(Boolean).pop();
  const authHeader = req.headers.get('Authorization');

  try {
    // Verify admin access
    const admin = await verifyAdmin(authHeader || '');
    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();

    // ========================================
    // GET /slack-admin/config
    // Get current configuration (safe version)
    // ========================================
    if (req.method === 'GET' && path === 'config') {
      const { data, error } = await supabase
        .rpc('get_slack_config_safe');

      if (error) throw error;

      return new Response(
        JSON.stringify({ config: data?.[0] || null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // POST /slack-admin/config
    // Create or update configuration
    // ========================================
    if (req.method === 'POST' && path === 'config') {
      const body = await req.json();
      const {
        app_id,
        client_id,
        client_secret,
        signing_secret,
        redirect_uri,
        bot_scopes,
        send_dm_by_default,
        send_to_channel,
        include_deep_links,
        rich_formatting,
      } = body;

      if (!client_id || !client_secret || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: client_id, client_secret, redirect_uri' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if config exists
      const { data: existing } = await supabase
        .from('slack_app_config')
        .select('id')
        .limit(1)
        .single();

      const configData = {
        app_id,
        client_id,
        client_secret_encrypted: encrypt(client_secret),
        signing_secret_encrypted: signing_secret ? encrypt(signing_secret) : null,
        redirect_uri,
        bot_scopes: bot_scopes || ['chat:write', 'im:write', 'users:read', 'users:read.email', 'channels:read'],
        send_dm_by_default: send_dm_by_default ?? true,
        send_to_channel: send_to_channel ?? false,
        include_deep_links: include_deep_links ?? true,
        rich_formatting: rich_formatting ?? true,
        is_configured: true,
        configured_by: admin.userId,
        configured_at: new Date().toISOString(),
      };

      let result;
      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('slack_app_config')
          .update(configData)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;

        // Audit log
        await supabase.rpc('log_slack_audit', {
          p_action: 'config_updated',
          p_actor_id: admin.userId,
          p_details: { fields_updated: Object.keys(body) },
        });
      } else {
        // Insert
        const { data, error } = await supabase
          .from('slack_app_config')
          .insert(configData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;

        // Audit log
        await supabase.rpc('log_slack_audit', {
          p_action: 'config_created',
          p_actor_id: admin.userId,
          p_details: { app_id, client_id },
        });
      }

      return new Response(
        JSON.stringify({ success: true, config_id: result.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // POST /slack-admin/test
    // Test the Slack connection
    // ========================================
    if (req.method === 'POST' && path === 'test') {
      const { target_user_id, test_message } = await req.json();

      // Get config
      const { data: config } = await supabase
        .from('slack_app_config')
        .select('*')
        .limit(1)
        .single();

      if (!config || !config.bot_access_token_encrypted) {
        return new Response(
          JSON.stringify({ error: 'Slack not configured or not installed to workspace' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const botToken = decrypt(config.bot_access_token_encrypted);

      // If target user specified, send to them; otherwise send to admin
      let slackUserId: string | null = null;
      
      if (target_user_id) {
        const { data: integration } = await supabase
          .from('user_integrations')
          .select('slack_user_id')
          .eq('user_id', target_user_id)
          .eq('integration_type', 'slack')
          .eq('is_active', true)
          .single();
        
        slackUserId = integration?.slack_user_id;
      }

      if (!slackUserId) {
        // Try to find admin's Slack user
        const { data: adminIntegration } = await supabase
          .from('user_integrations')
          .select('slack_user_id')
          .eq('user_id', admin.userId)
          .eq('integration_type', 'slack')
          .eq('is_active', true)
          .single();
        
        slackUserId = adminIntegration?.slack_user_id;
      }

      if (!slackUserId) {
        return new Response(
          JSON.stringify({ error: 'No connected Slack user found to send test message' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Open DM and send test message
      const openRes = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: slackUserId }),
      });

      const openData = await openRes.json();
      if (!openData.ok) {
        await supabase
          .from('slack_app_config')
          .update({ 
            last_tested_at: new Date().toISOString(),
            last_test_status: 'failed',
            last_test_error: openData.error,
          })
          .eq('id', config.id);

        return new Response(
          JSON.stringify({ error: 'Failed to open DM', details: openData.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sendRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: openData.channel.id,
          text: test_message || '🧪 *Test notification from Catalyst*\n\nIf you see this, Slack integration is working correctly!',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🧪 Test Notification', emoji: true },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: test_message || 'If you see this message, your Catalyst Slack integration is working correctly!',
              },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `Sent by: *${admin.email}*` },
                { type: 'mrkdwn', text: `Time: ${new Date().toISOString()}` },
              ],
            },
          ],
        }),
      });

      const sendData = await sendRes.json();

      // Update test status
      await supabase
        .from('slack_app_config')
        .update({ 
          last_tested_at: new Date().toISOString(),
          last_test_status: sendData.ok ? 'success' : 'failed',
          last_test_error: sendData.ok ? null : sendData.error,
        })
        .eq('id', config.id);

      // Audit log
      await supabase.rpc('log_slack_audit', {
        p_action: 'test_sent',
        p_actor_id: admin.userId,
        p_details: { success: sendData.ok, target_slack_user: slackUserId },
        p_status: sendData.ok ? 'success' : 'failed',
        p_error: sendData.ok ? null : sendData.error,
      });

      if (!sendData.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to send message', details: sendData.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message_ts: sendData.ts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // GET /slack-admin/stats
    // Get integration statistics
    // ========================================
    if (req.method === 'GET' && path === 'stats') {
      const { data, error } = await supabase.rpc('get_slack_integration_stats');
      if (error) throw error;

      return new Response(
        JSON.stringify({ stats: data?.[0] || {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // GET /slack-admin/users
    // Get connected users list
    // ========================================
    if (req.method === 'GET' && path === 'users') {
      const { data, error } = await supabase
        .from('slack_connected_users')
        .select('*')
        .order('connected_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ users: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // DELETE /slack-admin/users
    // Disconnect a user
    // ========================================
    if (req.method === 'DELETE' && path === 'users') {
      const { user_id } = await req.json();

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('user_integrations')
        .update({ is_active: false, disconnected_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('integration_type', 'slack');

      if (error) throw error;

      // Audit log
      await supabase.rpc('log_slack_audit', {
        p_action: 'user_disconnected',
        p_actor_id: admin.userId,
        p_details: { reason: 'admin_action' },
        p_target_user_id: user_id,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // GET /slack-admin/audit
    // Get audit logs
    // ========================================
    if (req.method === 'GET' && path === 'audit') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, error, count } = await supabase
        .from('slack_integration_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return new Response(
        JSON.stringify({ logs: data || [], total: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // POST /slack-admin/routing
    // Update notification routing rules
    // ========================================
    if (req.method === 'POST' && path === 'routing') {
      const { routing_rules, default_channel_id, default_channel_name } = await req.json();

      const { error } = await supabase
        .from('slack_app_config')
        .update({
          routing_rules: routing_rules || [],
          default_channel_id,
          default_channel_name,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      // Audit log
      await supabase.rpc('log_slack_audit', {
        p_action: 'routing_updated',
        p_actor_id: admin.userId,
        p_details: { routing_rules, default_channel_id },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // POST /slack-admin/install
    // Generate OAuth install URL
    // ========================================
    if (req.method === 'POST' && path === 'install') {
      const { data: config } = await supabase
        .from('slack_app_config')
        .select('client_id, redirect_uri, bot_scopes')
        .limit(1)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'Slack not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = crypto.randomUUID();
      const scopes = (config.bot_scopes || []).join(',');

      const authUrl = new URL('https://slack.com/oauth/v2/authorize');
      authUrl.searchParams.set('client_id', config.client_id);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('state', state);

      return new Response(
        JSON.stringify({ url: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // POST /slack-admin/install-callback
    // Handle OAuth callback for workspace install
    // ========================================
    if (req.method === 'POST' && path === 'install-callback') {
      const { code } = await req.json();

      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Missing code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get config with secrets
      const { data: config } = await supabase
        .from('slack_app_config')
        .select('*')
        .limit(1)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'Slack not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientSecret = decrypt(config.client_secret_encrypted);

      // Exchange code for token
      const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.client_id,
          client_secret: clientSecret,
          code,
          redirect_uri: config.redirect_uri,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.ok) {
        return new Response(
          JSON.stringify({ error: 'OAuth failed', details: tokenData.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update config with workspace info
      const { error: updateError } = await supabase
        .from('slack_app_config')
        .update({
          workspace_id: tokenData.team.id,
          workspace_name: tokenData.team.name,
          bot_user_id: tokenData.bot_user_id,
          bot_access_token_encrypted: encrypt(tokenData.access_token),
          is_active: true,
        })
        .eq('id', config.id);

      if (updateError) throw updateError;

      // Audit log
      await supabase.rpc('log_slack_audit', {
        p_action: 'workspace_installed',
        p_actor_id: admin.userId,
        p_details: { workspace_id: tokenData.team.id, workspace_name: tokenData.team.name },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          workspace_name: tokenData.team.name,
          workspace_id: tokenData.team.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // GET /slack-admin/channels
    // List available Slack channels
    // ========================================
    if (req.method === 'GET' && path === 'channels') {
      const { data: config } = await supabase
        .from('slack_app_config')
        .select('bot_access_token_encrypted')
        .limit(1)
        .single();

      if (!config?.bot_access_token_encrypted) {
        return new Response(
          JSON.stringify({ error: 'Slack not installed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const botToken = decrypt(config.bot_access_token_encrypted);

      const channelsRes = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
        headers: { 'Authorization': `Bearer ${botToken}` },
      });

      const channelsData = await channelsRes.json();

      if (!channelsData.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch channels', details: channelsData.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const channels = channelsData.channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private,
        num_members: ch.num_members,
      }));

      return new Response(
        JSON.stringify({ channels }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Slack admin error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
