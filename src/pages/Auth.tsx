import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { TabSwitcher } from '@/components/auth/TabSwitcher';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import catalystLogo from '@/assets/catalyst-logo-transparent.svg';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-gray-50 via-surface-gray-100 to-surface-gray-50 p-6">
      <div className="w-full max-w-[440px]">
        {/* Logo - Floating above card */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-surface-gray-200">
            <img 
              src={catalystLogo} 
              alt="Catalyst" 
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-surface-gray-200 p-10">
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "signin" ? (
            <SignInForm onSubmit={handleSignIn} loading={isLoading} />
          ) : (
            <SignUpForm onSubmit={handleSignUp} loading={isLoading} />
          )}

          <div className="mt-8 pt-6 border-t border-surface-gray-100 text-center">
            <p className="font-body text-xs text-text-muted">
              {activeTab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="font-medium text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    Request access
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="font-medium text-brand-gold hover:text-brand-gold/80 transition-colors"
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
