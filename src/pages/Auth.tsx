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
    <div className="min-h-screen flex items-center justify-center bg-surface-gray-50 p-8">
      <div className="w-full max-w-[520px]">
        <div className="bg-white rounded-2xl shadow-lg border border-surface-gray-200 overflow-hidden">
          {/* Logo Section */}
          <div className="bg-gradient-to-b from-surface-gray-50 to-white pt-10 pb-8 px-8 border-b border-surface-gray-100">
            <div className="flex justify-center">
              <img 
                src={catalystLogo} 
                alt="Catalyst" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 pt-6">
            <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "signin" ? (
            <SignInForm onSubmit={handleSignIn} loading={isLoading} />
          ) : (
            <SignUpForm onSubmit={handleSignUp} loading={isLoading} />
          )}

            <div className="mt-6 text-center">
              <p className="font-body text-[11px] text-text-muted">
                {activeTab === "signin" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => setActiveTab("signup")}
                      className="font-medium text-brand-gold hover:underline"
                    >
                      Request access
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => setActiveTab("signin")}
                      className="font-medium text-brand-gold hover:underline"
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
    </div>
  );
}
