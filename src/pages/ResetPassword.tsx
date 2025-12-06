import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type PageState = 'loading' | 'valid' | 'invalid' | 'success';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a valid session from the recovery link
    const checkSession = async () => {
      // The recovery link will set up a session automatically when clicked
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if this is a recovery session
        const accessToken = searchParams.get('access_token') || searchParams.get('token');
        const type = searchParams.get('type');
        
        // If we have a session (either from URL params or existing), allow password reset
        if (session.user) {
          setPageState('valid');
          return;
        }
      }
      
      // Listen for auth state changes (recovery link will trigger this)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPageState('valid');
        } else if (event === 'SIGNED_IN' && session) {
          // User might have been signed in via recovery link
          setPageState('valid');
        }
      });

      // Give it a moment for the auth state to be processed
      setTimeout(() => {
        // If still loading after timeout, check session one more time
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setPageState('valid');
          } else {
            setPageState('invalid');
          }
        });
      }, 2000);

      return () => {
        subscription.unsubscribe();
      };
    };

    checkSession();
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      // Also update the must_change_password flag if it exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);
      }

      setPageState('success');
      toast.success('Password updated successfully');
    } catch (err) {
      console.error('Error updating password:', err);
      setError((err as Error).message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    // Sign out first to ensure clean login
    supabase.auth.signOut().then(() => {
      navigate('/auth');
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
          {pageState === 'loading' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-brand-gold animate-spin" />
                </div>
                <CardTitle>Validating Reset Link</CardTitle>
                <CardDescription>Please wait while we verify your reset link...</CardDescription>
              </CardHeader>
            </>
          )}

          {pageState === 'invalid' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>Invalid or Expired Link</CardTitle>
                <CardDescription>
                  This reset link is invalid or has expired. Please request a new reset link from your administrator.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Go to Login
                </Button>
              </CardContent>
            </>
          )}

          {pageState === 'valid' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-brand-gold" />
                </div>
                <CardTitle>Set New Password</CardTitle>
                <CardDescription>
                  Enter your new password below. Make sure it's secure and memorable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters, with uppercase, lowercase, and a number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Set New Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {pageState === 'success' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Password Updated!</CardTitle>
                <CardDescription>
                  Your password has been reset successfully. You can now log in with your new password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGoToLogin} className="w-full">
                  Go to Login
                </Button>
            </CardContent>
            </>
          )}
        </Card>
      </div>
  );
}
