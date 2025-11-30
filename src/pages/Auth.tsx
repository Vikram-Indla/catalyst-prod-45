import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { TabSwitcher } from '@/components/auth/TabSwitcher';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

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
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-10">
          <Logo size="lg" className="justify-center" />
          <p className="font-body text-sm text-text-tertiary mt-2 uppercase tracking-wide">
            Enterprise Demand & Delivery Management
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-surface-gray-200 p-8">
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
  );
}
