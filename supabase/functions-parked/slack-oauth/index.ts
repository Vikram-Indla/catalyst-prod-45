// ============================================================
// CATALYST NOTIFICATION SYSTEM - Slack OAuth Edge Function
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID') || '';
const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET') || '';
const SLACK_REDIRECT_URI = Deno.env.get('SLACK_REDIRECT_URI') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sendSlackDM(
  accessToken: string,
  slackUserId: string,
  message: string,
  blocks?: any[]
): Promise<boolean> {
  try {
    const openResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: slackUserId }),
    });

    const openData = await openResponse.json();
    if (!openData.ok) {
      console.error('Failed to open DM channel:', openData.error);
      return false;
    }

    const channelId = openData.channel.id;

    const messagePayload: any = {
      channel: channelId,
      text: message,
    };

    if (blocks) {
      messagePayload.blocks = blocks;
    }

    const sendResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const sendData = await sendResponse.json();
    if (!sendData.ok) {
      console.error('Failed to send message:', sendData.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Slack DM error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // ROUTE: /slack-oauth/authorize
    if (path === 'authorize') {
      if (!SLACK_CLIENT_ID) {
        return new Response(
          JSON.stringify({ error: 'Slack integration not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = crypto.randomUUID();
      
      const scopes = [
        'chat:write',
        'users:read',
        'users:read.email',
        'channels:read',
        'im:write',
      ].join(',');

      const authUrl = new URL('https://slack.com/oauth/v2/authorize');
      authUrl.searchParams.set('client_id', SLACK_CLIENT_ID);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('redirect_uri', SLACK_REDIRECT_URI);
      authUrl.searchParams.set('state', state);

      return new Response(
        JSON.stringify({ url: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ROUTE: /slack-oauth/callback
    if (path === 'callback') {
      const { code, state, user_id } = await req.json();

      if (!code || !user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing code or user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: SLACK_CLIENT_ID,
          client_secret: SLACK_CLIENT_SECRET,
          code,
          redirect_uri: SLACK_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.ok) {
        console.error('Slack OAuth error:', tokenData);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange code', details: tokenData.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { access_token, authed_user, team, bot_user_id } = tokenData;

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error: upsertError } = await supabase
        .from('user_integrations')
        .upsert({
          user_id,
          integration_type: 'slack',
          access_token,
          slack_user_id: authed_user.id,
          slack_team_id: team.id,
          slack_team_name: team.name,
          bot_user_id,
          is_active: true,
          connected_at: new Date().toISOString(),
        }, { onConflict: 'user_id,integration_type' });

      if (upsertError) {
        console.error('Database error:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store integration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('user_notification_preferences')
        .update({ slack_enabled: true, slack_dm: true })
        .eq('user_id', user_id);

      await sendSlackDM(
        access_token,
        authed_user.id,
        '🎉 *Catalyst notifications connected!*\n\nYou\'ll now receive important updates here.'
      );

      return new Response(
        JSON.stringify({ success: true, team_name: team.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ROUTE: /slack-oauth/disconnect
    if (path === 'disconnect') {
      const { user_id } = await req.json();

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error } = await supabase
        .from('user_integrations')
        .update({ is_active: false, disconnected_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('integration_type', 'slack');

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('user_notification_preferences')
        .update({ slack_enabled: false })
        .eq('user_id', user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ROUTE: /slack-oauth/status
    if (path === 'status') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: integration } = await supabase
        .from('user_integrations')
        .select('slack_team_name, is_active, connected_at')
        .eq('user_id', user.id)
        .eq('integration_type', 'slack')
        .single();

      return new Response(
        JSON.stringify({
          connected: integration?.is_active ?? false,
          team_name: integration?.slack_team_name ?? null,
          connected_at: integration?.connected_at ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
