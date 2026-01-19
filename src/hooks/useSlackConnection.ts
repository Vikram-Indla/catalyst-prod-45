// ============================================================
// CATALYST - Slack Connection Hook
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface SlackStatus {
  connected: boolean;
  team_name: string | null;
  connected_at: string | null;
}

export function useSlackConnection() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check current Slack connection status
  const { data: status, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['slack-connection-status', user?.id],
    queryFn: async (): Promise<SlackStatus> => {
      if (!session?.access_token) {
        return { connected: false, team_name: null, connected_at: null };
      }

      const { data, error } = await supabase.functions.invoke('slack-oauth/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Failed to get Slack status:', error);
        return { connected: false, team_name: null, connected_at: null };
      }

      return data as SlackStatus;
    },
    enabled: !!user?.id && !!session?.access_token,
    staleTime: 30000, // Cache for 30s
  });

  // Start OAuth flow
  const startConnection = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to connect Slack');
      return;
    }

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('slack-oauth/authorize');

      if (error) {
        throw new Error(error.message || 'Failed to start Slack authorization');
      }

      if (!data?.url) {
        throw new Error('No authorization URL returned');
      }

      // Store state for validation after callback
      sessionStorage.setItem('slack_oauth_state', data.state);
      sessionStorage.setItem('slack_oauth_user_id', user.id);

      // Open Slack OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'slack-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popup) {
        // Fallback to redirect if popup blocked
        window.location.href = data.url;
        return;
      }

      // Poll for popup close and check for callback
      const pollInterval = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollInterval);
            setIsConnecting(false);
            
            // Refresh status after popup closes
            queryClient.invalidateQueries({ queryKey: ['slack-connection-status'] });
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
          }
        } catch {
          // Cross-origin error expected, ignore
        }
      }, 500);

    } catch (error) {
      console.error('Slack connection error:', error);
      toast.error('Failed to start Slack connection');
      setIsConnecting(false);
    }
  };

  // Handle OAuth callback (call from callback page)
  const handleCallback = async (code: string, state: string) => {
    const storedState = sessionStorage.getItem('slack_oauth_state');
    const userId = sessionStorage.getItem('slack_oauth_user_id');

    if (state !== storedState) {
      toast.error('Invalid OAuth state - please try again');
      return false;
    }

    if (!userId) {
      toast.error('User session expired - please try again');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('slack-oauth/callback', {
        body: { code, state, user_id: userId },
      });

      if (error) {
        throw error;
      }

      // Clean up
      sessionStorage.removeItem('slack_oauth_state');
      sessionStorage.removeItem('slack_oauth_user_id');

      toast.success(`Connected to ${data.team_name || 'Slack'}!`);
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['slack-connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });

      return true;
    } catch (error) {
      console.error('Slack callback error:', error);
      toast.error('Failed to complete Slack connection');
      return false;
    }
  };

  // Disconnect Slack
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not logged in');

      const { error } = await supabase.functions.invoke('slack-oauth/disconnect', {
        body: { user_id: user.id },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Disconnected from Slack');
      queryClient.invalidateQueries({ queryKey: ['slack-connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (error) => {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect from Slack');
    },
  });

  return {
    status,
    isLoadingStatus,
    isConnecting,
    isConnected: status?.connected ?? false,
    teamName: status?.team_name,
    startConnection,
    handleCallback,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
