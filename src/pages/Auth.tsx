import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { TabSwitcher } from '@/components/auth/TabSwitcher';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import catalystLogo from '@/assets/catalyst-logo.png';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (!error) {
      navigate('/portfolio-room');
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-gray-50 via-surface-gray-100 to-surface-gray-50 p-4 sm:p-6">
      <div className="w-full max-w-[520px]">
        {/* Enterprise Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-surface-gray-200 p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle accent gradient overlay */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-gold/20 via-brand-gold to-brand-gold/20" />
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={catalystLogo} alt="Catalyst" className="h-20 sm:h-24 w-auto" />
          </div>
          
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "signin" ? (
            <SignInForm onSubmit={handleSignIn} loading={isLoading} />
          ) : (
            <SignUpForm onSubmit={handleSignUp} loading={isLoading} />
          )}

          <div className="mt-10 pt-8 border-t border-surface-gray-100 text-center">
            <p className="font-body text-sm text-text-muted">
              {activeTab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="font-semibold text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    Request access
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="font-semibold text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
