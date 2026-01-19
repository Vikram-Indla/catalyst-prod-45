// ============================================================
// CATALYST - Slack OAuth Callback Page
// ============================================================

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SlackOAuthCallback() {
  const [searchParams] = useSearchParams();
  const { handleCallback } = useSlackConnection();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Slack...');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(error === 'access_denied' 
          ? 'You cancelled the Slack connection' 
          : `Slack error: ${error}`);
        closeAfterDelay();
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization code');
        closeAfterDelay();
        return;
      }

      const success = await handleCallback(code, state);

      if (success) {
        setStatus('success');
        setMessage('Successfully connected to Slack!');
      } else {
        setStatus('error');
        setMessage('Failed to complete Slack connection');
      }

      closeAfterDelay();
    };

    const closeAfterDelay = () => {
      setTimeout(() => {
        // If in popup, close it
        if (window.opener) {
          window.close();
        }
      }, 2000);
    };

    processCallback();
  }, [searchParams, handleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we complete the connection...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-teal-500 mb-4" />
              <p className="text-lg font-medium text-teal-700 dark:text-teal-400">
                {message}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This window will close automatically...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-lg font-medium text-destructive">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please close this window and try again.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
