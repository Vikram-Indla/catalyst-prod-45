import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import catalystLogo from '@/assets/catalyst-logo-network.svg';

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
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={catalystLogo} 
            alt="Catalyst" 
            className="h-16 w-auto mx-auto mb-3"
          />
          <h1 className="text-3xl font-bold mb-1">
            <span className="text-[hsl(var(--catalyst-black))]">Cata</span>
            <span className="text-[hsl(var(--catalyst-gold))]">lyst</span>
          </h1>
          <p className="text-xs text-[#606666] tracking-wider font-medium">
            ENTERPRISE DEMAND & DELIVERY MANAGEMENT
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-8 shadow-sm">
          {activeTab === "signin" ? (
            <SignInForm onSubmit={handleSignIn} loading={isLoading} />
          ) : (
            <SignUpForm onSubmit={handleSignUp} loading={isLoading} />
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E5E5]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-[#606666]">OR CONTINUE WITH</span>
            </div>
          </div>

          {/* Enterprise SSO Button */}
          <button
            type="button"
            className="w-full py-3 px-4 border border-[#E5E5E5] rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-[hsl(var(--catalyst-black))]"
          >
            Enterprise SSO (SAML)
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-[#606666]">
              {activeTab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="font-medium text-[hsl(var(--catalyst-gold))] hover:text-[hsl(var(--catalyst-gold))]/80 transition-colors"
                  >
                    Request access
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="font-medium text-[hsl(var(--catalyst-gold))] hover:text-[hsl(var(--catalyst-gold))]/80 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <a 
            href="#" 
            className="text-xs text-[hsl(var(--catalyst-gold))] hover:text-[hsl(var(--catalyst-gold))]/80 transition-colors font-medium"
          >
            JIRA Integration
          </a>
        </div>
      </div>
    </div>
  );
}
