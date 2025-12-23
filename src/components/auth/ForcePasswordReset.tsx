import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PasswordInput } from '@/components/auth/PasswordInput';

interface ForcePasswordResetProps {
  onSuccess: () => void;
  userId: string;
}

/**
 * Force Password Reset Component
 * Displayed when a user logs in with must_change_password = true
 * 
 * TODO: Replace this default-password + first-login-reset flow with a full email-based 
 * invitation + activation flow using the Catalyst HTML email template when we move to production.
 */
export function ForcePasswordReset({ onSuccess, userId }: ForcePasswordResetProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      // Verify session is still valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        // Session is invalid - sign out and show error
        await supabase.auth.signOut();
        throw new Error('Your session has expired. Please log in again.');
      }

      // Use edge function to update password with admin privileges
      const { data, error: invokeError } = await supabase.functions.invoke('user-update-password', {
        body: { newPassword },
      });

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        // Check if it's a session/token error
        if (invokeError.message?.includes('401') || invokeError.message?.includes('token') || invokeError.message?.includes('session')) {
          await supabase.auth.signOut();
          throw new Error('Your session has expired. Please log in again.');
        }
        throw new Error('Failed to update password. Please try again.');
      }

      if (!data?.success) {
        // Check for session-related errors
        if (data?.error?.includes('token') || data?.error?.includes('session') || data?.error?.includes('expired')) {
          await supabase.auth.signOut();
          throw new Error('Your session has expired. Please log in again.');
        }
        throw new Error(data?.error || 'Failed to update password. Please try again.');
      }

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });

      onSuccess();
    } catch (err) {
      console.error('Error updating password:', err);
      const errorMessage = (err as Error).message || 'Failed to update password. Please try again.';
      setError(errorMessage);
      
      // If session expired, the signOut will trigger auth state change and redirect to login
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <h2 className="text-center mb-2" style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(1.5rem, 3vw, 1.875rem)",
        fontWeight: 500,
        color: "#1a1a1a"
      }}>
        Reset your password
      </h2>
      <p className="text-center mb-6" style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "clamp(0.9rem, 2vw, 1rem)",
        color: "rgba(26, 26, 26, 0.55)"
      }}>
        For your security, please create a new password on your first login.
      </p>

      {/* Password Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password Field */}
        <div>
          <label htmlFor="newPassword" className="block mb-1.5" style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#1a1a1a"
          }}>
            New Password
          </label>
          <PasswordInput
            id="newPassword"
            value={newPassword}
            onChange={(val) => {
              setNewPassword(val);
              setError(null);
            }}
            placeholder="Enter your new password"
            required
            hasError={!!error}
          />
          <p className="mt-1.5 text-xs" style={{
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(26, 26, 26, 0.45)"
          }}>
            Min. 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block mb-1.5" style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#1a1a1a"
          }}>
            Confirm New Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(val) => {
              setConfirmPassword(val);
              setError(null);
            }}
            placeholder="Confirm your new password"
            required
            hasError={!!error}
          />
          {/* Inline Error Message */}
          {error && (
            <p 
              className="mt-2 text-sm"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: "#dc2626"
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full relative overflow-hidden transition-all duration-300"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            padding: "16px",
            backgroundColor: "#1a1a1a",
            color: "#feffff",
            fontWeight: 600,
            borderRadius: "10px",
            fontSize: "1rem",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            marginTop: "8px",
            opacity: isLoading ? 0.7 : 1
          }}
          onMouseEnter={e => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(26, 26, 26, 0.2)";
            }
          }}
          onMouseLeave={e => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          <span className="relative flex items-center justify-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Password
          </span>
        </button>
      </form>
    </>
  );
}
