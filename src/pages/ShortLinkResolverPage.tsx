import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';

/** sessionStorage key the invite/reset pages read when token/email are NOT in the URL. */
export const INVITE_CTX_KEY = 'catalyst_invite_ctx';

/**
 * Resolves an opaque short link (/s/:code) into the underlying setup token,
 * which is handed to the accept page via sessionStorage — never via the URL.
 */
export default function ShortLinkResolverPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) { setFailed(true); return; }
      const { data, error } = await supabase.functions.invoke('invite-resolve', { body: { code } });
      if (cancelled) return;
      const res = data as { ok?: boolean; token?: string; email?: string; purpose?: string; full_name?: string | null } | null;
      if (error || !res?.ok || !res.token || !res.email) { setFailed(true); return; }
      sessionStorage.setItem(INVITE_CTX_KEY, JSON.stringify({ token: res.token, email: res.email, full_name: res.full_name ?? null }));
      const dest = res.purpose === 'invite' ? '/invite/accept' : '/reset-password';
      navigate(dest, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [code, navigate]);

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Link expired or invalid</CardTitle>
            <CardDescription>
              This setup link is no longer valid. Ask your administrator to generate a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">Go to Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening your setup link…
      </div>
    </div>
  );
}
