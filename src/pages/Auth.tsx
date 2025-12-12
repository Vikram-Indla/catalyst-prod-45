import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2, Briefcase, Package, GitMerge, Link2, TriangleAlert, FlaskConical, FileText } from "lucide-react";
import { IntegrationBadge } from "@/components/brand/IntegrationBadge";
import { getLastRoute, clearLastRoute } from "@/hooks/useSessionPersistence";
import { supabase } from "@/integrations/supabase/client";
import { ForcePasswordReset } from "@/components/auth/ForcePasswordReset";
import { PasswordInput } from "@/components/auth/PasswordInput";

// TODO: Replace this default-password + first-login-reset flow with a full email-based 
// invitation + activation flow using the Catalyst HTML email template when we move to production.

const REMEMBERED_EMAIL_KEY = 'catalyst_remembered_email';

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"existing" | "external">("existing");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const checkMustChangePassword = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking must_change_password:', error);
        return false;
      }

      return profile?.must_change_password === true;
    } catch (err) {
      console.error('Error in checkMustChangePassword:', err);
      return false;
    }
  };

  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (!loading && user && !mustChangePassword) {
        const needsPasswordChange = await checkMustChangePassword(user.id);
        
        if (needsPasswordChange) {
          setMustChangePassword(true);
          setCurrentUserId(user.id);
        } else {
          const lastRoute = getLastRoute();
          navigate(lastRoute, { replace: true });
        }
      }
    };

    handleAuthRedirect();
  }, [user, loading, navigate, mustChangePassword]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    const result = await signIn(email, password);
    
    if (result.error) {
      // Check for pending approval status
      if ((result as any).isPending) {
        setLoginError("Your account is pending approval.");
      } else if ((result as any).isBlocked) {
        setLoginError("Unable to sign in.");
      } else {
        setLoginError("The email or password you entered is incorrect.");
      }
      setIsLoading(false);
      return;
    }

    // Handle Remember Me - store email only (never password)
    if (rememberMe) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser) {
      const needsPasswordChange = await checkMustChangePassword(currentUser.id);
      
      if (needsPasswordChange) {
        setMustChangePassword(true);
        setCurrentUserId(currentUser.id);
        setIsLoading(false);
        return;
      }
    }
    
    const lastRoute = getLastRoute();
    clearLastRoute();
    navigate(lastRoute);
    
    setIsLoading(false);
  };

  const handlePasswordResetSuccess = () => {
    setMustChangePassword(false);
    setCurrentUserId(null);
    const lastRoute = getLastRoute();
    clearLastRoute();
    navigate(lastRoute);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    if (password !== confirmPassword) {
      setLoginError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setLoginError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setLoginError(error.message || "Failed to create account");
      setIsLoading(false);
      return;
    }

    setAuthMode("signin");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setLoginError(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Brand Panel */}
      <div 
        className="hidden lg:flex relative w-full lg:w-[45%] flex-col justify-start p-6 sm:p-8 md:p-12 lg:p-16 overflow-hidden min-h-[40vh] lg:min-h-screen bg-brand-dark"
        style={{ paddingTop: "clamp(100px, 15vh, 160px)" }}
      >
        {/* Decorative Gradient 1 */}
        <div 
          className="absolute -top-24 -right-24 w-[350px] h-[350px] rounded-full pointer-events-none animate-float"
          style={{ background: "radial-gradient(circle, hsl(var(--brand-gold) / 0.3) 0%, transparent 70%)" }}
        />

        {/* Decorative Gradient 2 */}
        <div 
          className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(var(--brand-gold) / 0.1) 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse"
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Headline */}
          <h1 
            className="mb-4 sm:mb-6 leading-tight font-display text-white"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 500,
              lineHeight: 1.2
            }}
          >
            Streamline your <span className="text-brand-gold italic">enterprise</span> demand & delivery
          </h1>

          {/* Description */}
          <p 
            className="mb-8 sm:mb-12 max-w-md font-body"
            style={{
              fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
              color: "hsl(var(--n0) / 0.65)",
              lineHeight: 1.8
            }}
          >
            Transform how your organization manages demand and delivery with intelligent workflows and real-time insights.
          </p>

          {/* Capabilities Section */}
          <div className="pt-8 sm:pt-12 border-t border-brand-gold/25">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { Icon: Briefcase, label: "Portfolio Management" },
                { Icon: GitMerge, label: "Dependency Management" },
                { Icon: TriangleAlert, label: "Capacity Management" },
                { Icon: Package, label: "Product Management" },
                { Icon: FlaskConical, label: "Test Management" },
                { Icon: Link2, label: "Release Schedule" },
              ].map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 group py-2.5 whitespace-nowrap"
                >
                  <item.Icon 
                    className="transition-transform duration-300 group-hover:scale-110 text-brand-gold"
                    size={18}
                    strokeWidth={1.5}
                  />
                  <span 
                    className="font-body text-base font-medium tracking-wide transition-colors duration-300 group-hover:text-brand-gold"
                    style={{ color: "hsl(var(--n0) / 0.85)" }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 sm:bottom-8 md:bottom-12 left-6 sm:left-8 md:left-12 lg:left-16 z-10">
          <div className="flex flex-col gap-3 mb-4">
            <div className="rounded-sm w-20 h-[3px] bg-brand-gold" />
            <div className="rounded-sm w-10 h-[3px] bg-brand-gold/50" />
            <div className="rounded-sm w-5 h-[3px] bg-brand-gold/30" />
          </div>
          <p className="font-body text-sm" style={{ color: "hsl(var(--n0) / 0.35)" }}>
            © 2025 Catalyst. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login/Password Reset Panel */}
      <div className="relative w-full lg:w-[55%] p-6 sm:p-8 md:p-12 lg:p-16 bg-background">
        {/* Subtle background gradients */}
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--brand-gold) / 0.03) 0%, transparent 70%)" }}
        />
        <div 
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--brand-gold) / 0.02) 0%, transparent 70%)" }}
        />

        {/* Catalyst Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 z-20" style={{ top: "clamp(24px, 6vh, 100px)" }}>
          <h1 
            className="font-display leading-none"
            style={{
              fontSize: "clamp(36px, 7vw, 52px)",
              fontWeight: 600,
              letterSpacing: "-0.02em"
            }}
          >
            <span className="text-brand-dark">Cata</span>
            <span className="text-brand-gold">lyst</span>
            <sup className="text-brand-dark font-normal ml-0.5" style={{ fontSize: "0.4em" }}>TM</sup>
          </h1>
        </div>

        {/* Main Container */}
        <div className="w-full max-w-md mx-auto relative z-10" style={{ marginTop: "clamp(100px, 16vh, 140px)" }}>
          
          {mustChangePassword && currentUserId ? (
            <ForcePasswordReset 
              userId={currentUserId} 
              onSuccess={handlePasswordResetSuccess} 
            />
          ) : (
            <>
              {/* User Type Selector */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-full p-1 bg-brand-dark/5">
                  <button
                    type="button"
                    onClick={() => setUserType("existing")}
                    className="font-body transition-all duration-200 px-6 py-2.5 rounded-full text-sm font-medium border-none cursor-pointer"
                    style={{
                      backgroundColor: userType === "existing" ? "hsl(var(--brand-dark))" : "transparent",
                      color: userType === "existing" ? "hsl(var(--n0))" : "hsl(var(--brand-dark) / 0.6)",
                    }}
                  >
                    Existing User
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("external")}
                    className="font-body transition-all duration-200 px-6 py-2.5 rounded-full text-sm font-medium border-none cursor-pointer"
                    style={{
                      backgroundColor: userType === "external" ? "hsl(var(--brand-dark))" : "transparent",
                      color: userType === "external" ? "hsl(var(--n0))" : "hsl(var(--brand-dark) / 0.6)",
                    }}
                  >
                    External User
                  </button>
                </div>
              </div>

              {userType === "existing" ? (
                <>
                  {/* Sign In / Sign Up Toggle */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex rounded-lg p-1 bg-brand-dark/5">
                      <button
                        type="button"
                        onClick={() => { setAuthMode("signin"); resetForm(); }}
                        className="font-body transition-all duration-200 px-5 py-2 rounded-md text-sm font-medium border-none cursor-pointer"
                        style={{
                          backgroundColor: authMode === "signin" ? "hsl(var(--brand-gold))" : "transparent",
                          color: authMode === "signin" ? "hsl(var(--n0))" : "hsl(var(--brand-dark) / 0.6)",
                        }}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthMode("signup"); resetForm(); }}
                        className="font-body transition-all duration-200 px-5 py-2 rounded-md text-sm font-medium border-none cursor-pointer"
                        style={{
                          backgroundColor: authMode === "signup" ? "hsl(var(--brand-gold))" : "transparent",
                          color: authMode === "signup" ? "hsl(var(--n0))" : "hsl(var(--brand-dark) / 0.6)",
                        }}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>

                  {/* Header */}
                  <h2 
                    className="text-center mb-2 font-display text-brand-dark"
                    style={{ fontSize: "clamp(1.5rem, 3vw, 1.875rem)", fontWeight: 500 }}
                  >
                    {authMode === "signin" ? "Welcome back" : "Create an account"}
                  </h2>
                  <p className="text-center mb-6 font-body text-muted-foreground" style={{ fontSize: "clamp(0.9rem, 2vw, 1rem)" }}>
                    {authMode === "signin" ? "Enter your credentials to access your account" : "Fill in your details to get started"}
                  </p>

                  {/* Auth Form */}
                  <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
                    {authMode === "signup" && (
                      <div>
                        <label htmlFor="fullName" className="block mb-1.5 font-body text-sm font-medium text-brand-dark">
                          Full Name
                        </label>
                        <input 
                          id="fullName" 
                          type="text" 
                          value={fullName} 
                          onChange={e => { setFullName(e.target.value); setLoginError(null); }} 
                          placeholder="John Doe" 
                          required 
                          className="w-full transition-all outline-none font-body text-base py-3.5 px-4 rounded-[10px] bg-background border-2 border-border focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10" 
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="email" className="block mb-1.5 font-body text-sm font-medium text-brand-dark">
                        Email Address
                      </label>
                      <input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={e => { setEmail(e.target.value); setLoginError(null); }} 
                        placeholder="name@company.com" 
                        required 
                        className={`w-full transition-all outline-none font-body text-base py-3.5 px-4 rounded-[10px] bg-background border-2 ${loginError ? 'border-destructive' : 'border-border'} focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10`}
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block mb-1.5 font-body text-sm font-medium text-brand-dark">
                        Password
                      </label>
                      <PasswordInput
                        id="password"
                        value={password}
                        onChange={(val) => { setPassword(val); setLoginError(null); }}
                        placeholder={authMode === "signin" ? "Enter your password" : "Create a password"}
                        required
                        hasError={!!loginError}
                      />
                    </div>

                    {authMode === "signup" && (
                      <div>
                        <label htmlFor="confirmPassword" className="block mb-1.5 font-body text-sm font-medium text-brand-dark">
                          Confirm Password
                        </label>
                        <PasswordInput
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(val) => { setConfirmPassword(val); setLoginError(null); }}
                          placeholder="Confirm your password"
                          required
                          hasError={!!loginError && loginError.includes("match")}
                        />
                      </div>
                    )}

                    {loginError && (
                      <p className="text-sm font-body text-destructive">{loginError}</p>
                    )}

                    {authMode === "signin" && (
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={rememberMe} 
                            onChange={e => setRememberMe(e.target.checked)} 
                            className="w-4 h-4 rounded border-2 cursor-pointer appearance-none transition-all border-border checked:bg-brand-gold checked:border-brand-gold"
                            style={{
                              backgroundImage: rememberMe ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")" : "none",
                              backgroundSize: "100% 100%",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat"
                            }}
                          />
                          <span className="font-body text-sm text-muted-foreground">Remember me</span>
                        </label>
                        <button 
                          type="button" 
                          className="font-body text-sm font-medium text-brand-gold hover:text-brand-dark transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isLoading} 
                      className="w-full relative overflow-hidden transition-all duration-300 font-body py-4 font-semibold rounded-[10px] text-base border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                      style={{
                        backgroundColor: authMode === "signin" ? "hsl(var(--brand-dark))" : "hsl(var(--brand-gold))",
                        color: "hsl(var(--n0))"
                      }}
                    >
                      <span className="relative flex items-center justify-center gap-2">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {authMode === "signin" ? "Sign In" : "Create Account"}
                      </span>
                    </button>
                  </form>

                  <div className="mt-6">
                    <IntegrationBadge />
                  </div>
                </>
              ) : (
                <>
                  {/* External User Header */}
                  <h2 
                    className="text-center mb-2 font-display text-brand-dark"
                    style={{ fontSize: "clamp(1.5rem, 3vw, 1.875rem)", fontWeight: 500 }}
                  >
                    Submit a Request
                  </h2>
                  <p className="text-center mb-6 font-body text-muted-foreground" style={{ fontSize: "clamp(0.9rem, 2vw, 1rem)" }}>
                    Log your business demand without an account
                  </p>

                  {/* Request Card */}
                  <div className="flex flex-col items-center p-8 rounded-xl bg-brand-gold/5 border border-brand-gold/15">
                    <div className="mb-5 p-4 rounded-full bg-brand-gold/10">
                      <FileText className="w-10 h-10 text-brand-gold" />
                    </div>

                    <p className="text-center mb-6 font-body text-base leading-relaxed" style={{ color: "hsl(var(--brand-dark) / 0.65)" }}>
                      No account needed. Submit your business demand request and our team will review it promptly.
                    </p>

                    <button 
                      type="button" 
                      onClick={() => navigate('/request-access')}
                      className="w-full transition-all duration-300 font-body py-4 px-6 font-semibold rounded-[10px] text-base border-2 cursor-pointer bg-transparent text-brand-gold border-brand-gold hover:bg-brand-gold hover:text-white hover:-translate-y-0.5"
                    >
                      Log Demand Request
                    </button>

                    <p className="mt-4 text-center font-body text-xs" style={{ color: "hsl(var(--brand-dark) / 0.4)" }}>
                      Ticket ID will be generated upon submission
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
      `}</style>
    </div>
  );
}