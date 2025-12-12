import { createContext, useContext, useEffect, useState } from 'react';
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
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
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // Use direct fetch to properly handle non-2xx responses without throwing
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
      }

      // Handle expected validation errors (409, 400, 429) - NOT runtime errors
      if (response.status === 409 || response.status === 400 || response.status === 429) {
        const errorCode = data?.code || 'UNKNOWN';
        const errorMessage = data?.error || 'An error occurred';
        
        return { 
          error: { message: errorMessage, code: errorCode },
          code: errorCode
        };
      }

      // Handle server errors (5xx)
      if (response.status >= 500) {
        return { 
          error: { message: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' },
          code: 'SERVER_ERROR'
        };
      }

      // Handle other non-2xx responses
      if (!response.ok) {
        const errorMessage = data?.error || 'An error occurred';
        const errorCode = data?.code || 'UNKNOWN';
        return { 
          error: { message: errorMessage, code: errorCode },
          code: errorCode
        };
      }

      // Success case
      if (!data?.success) {
        const errorCode = data?.code || 'UNKNOWN';
        const errorMessage = data?.error || 'Registration failed. Please try again.';
        
        return { 
          error: { message: errorMessage, code: errorCode },
          code: errorCode
        };
      }

      // Sign out immediately - user must wait for approval
      await supabase.auth.signOut();

      toast({
        title: "Registration submitted",
        description: "Your account is pending approval. You can sign in once an administrator approves your request.",
      });
      
      return { error: null, isPending: true };
    } catch (error: any) {
      // Only true network errors reach here
      return { 
        error: { message: 'Something went wrong. Please try again.', code: 'NETWORK_ERROR' },
        code: 'NETWORK_ERROR'
      };
    }
  };

  const signOut = async () => {
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
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading }}>
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
