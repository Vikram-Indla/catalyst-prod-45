import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;

    const safeFinalize = (nextSession: Session | null, nextUser: User | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);
      hasInitialized = true;
    };

    const initTimeout = window.setTimeout(() => {
      if (hasInitialized || !isMounted) return;
      console.warn('[auth] Initialization timeout, falling back to signed-out state');
      safeFinalize(null, null);
    }, 8000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !nextSession)) {
        safeFinalize(null, null);
      } else {
        safeFinalize(nextSession, nextSession?.user ?? null);
      }
    });

    // THEN check for existing session, but never block the UI indefinitely
    const checkSession = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('getSession timeout')), 6000)
          ),
        ]);

        const { data: { session }, error } = sessionResult;

        if (error || !session) {
          safeFinalize(null, null);
          return;
        }

        const userResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('getUser timeout')), 6000)
          ),
        ]);

        const { data: { user }, error: userError } = userResult;
        if (userError || !user) {
          console.warn('[auth] Stale or unreachable session, clearing...');
          await supabase.auth.signOut();
          safeFinalize(null, null);
          return;
        }

        safeFinalize(session, user);
      } catch (err) {
        console.error('Session check error:', err);
        safeFinalize(null, null);
      } finally {
        window.clearTimeout(initTimeout);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Use the secure login edge function with rate limiting and audit logging
      const { data, error: invokeError } = await supabase.functions.invoke('login-with-audit', {
        body: { email: email.toLowerCase().trim(), password },
      });

      if (invokeError) {
        console.error('Login invoke error:', invokeError);
        toast({
          title: "Sign-in failed",
          description: "The email or password you entered is incorrect.",
          variant: "destructive",
        });
        return { error: invokeError };
      }

      if (!data?.success) {
        const code = data?.code;
        
        if (code === 'PENDING_APPROVAL') {
          return { 
            error: { message: data.error },
            isPending: true 
          };
        }
        
        if (code === 'BLOCKED') {
          return { 
            error: { message: data.error },
            isBlocked: true 
          };
        }

        // Generic error for invalid credentials
        toast({
          title: "Sign-in failed",
          description: data?.error || "The email or password you entered is incorrect.",
          variant: "destructive",
        });
        return { error: { message: data?.error || "Invalid credentials" } };
      }

      // Successfully logged in - set the session
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign-in failed",
        description: "The email or password you entered is incorrect.",
        variant: "destructive",
      });
      return { error };
    }
  }, [toast]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      // Use direct fetch to call edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/signup-with-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          fullName: fullName || email,
        }),
      });

      // Safely parse JSON response
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // Response is not JSON
        return { 
          error: { message: 'Something went wrong. Please try again.', code: 'PARSE_ERROR' },
          code: 'PARSE_ERROR'
        };
      }

      // Handle server errors (5xx)
      if (response.status >= 500) {
        return { 
          error: { message: data?.error || 'Something went wrong. Please try again.', code: 'SERVER_ERROR' },
          code: 'SERVER_ERROR'
        };
      }

      // Check success flag in response (edge function returns 200 with success: false for validation errors)
      if (data?.success === false) {
        const errorCode = data?.code || 'UNKNOWN';
        const errorMessage = data?.error || 'Registration failed. Please try again.';
        
        return { 
          error: { message: errorMessage, code: errorCode },
          code: errorCode
        };
      }

      // Success case
      if (data?.success === true) {
        // Sign out immediately - user must wait for approval
        await supabase.auth.signOut();

        toast({
          title: "Registration submitted",
          description: "Your account is pending approval. You can sign in once an administrator approves your request.",
        });
        
        return { error: null, isPending: true };
      }

      // Unexpected response format
      return { 
        error: { message: 'Something went wrong. Please try again.', code: 'UNKNOWN' },
        code: 'UNKNOWN'
      };
    } catch (error: any) {
      // Only true network errors reach here
      return {
        error: { message: 'Something went wrong. Please try again.', code: 'NETWORK_ERROR' },
        code: 'NETWORK_ERROR'
      };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const value = useMemo(() => ({ user, session, signIn, signUp, signOut, loading }), [user, session, signIn, signUp, signOut, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
