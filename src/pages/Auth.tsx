import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2, Briefcase, Package, GitMerge, Link2, TriangleAlert, FlaskConical, FileText } from "lucide-react";
import { IntegrationBadge } from "@/components/brand/IntegrationBadge";
import { getLastRoute, clearLastRoute } from "@/hooks/useSessionPersistence";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"existing" | "external">("existing");
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to their last route
  useEffect(() => {
    if (!loading && user) {
      const lastRoute = getLastRoute();
      navigate(lastRoute, { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (!error) {
      // Redirect to last visited page or default to home
      const lastRoute = getLastRoute();
      clearLastRoute(); // Clear after use to prevent stale redirects
      navigate(lastRoute);
    }
  };
  return <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Brand Panel */}
      <div className="hidden lg:flex relative w-full lg:w-[45%] flex-col justify-start p-6 sm:p-8 md:p-12 lg:p-16 overflow-hidden min-h-[40vh] lg:min-h-screen" style={{
      backgroundColor: "#1a1a1a",
      paddingTop: "clamp(100px, 15vh, 160px)"
    }}>
        {/* Decorative Gradient 1 */}
        <div className="absolute -top-24 -right-24 w-[350px] h-[350px] rounded-full pointer-events-none animate-float" style={{
        background: "radial-gradient(circle, rgba(198, 156, 109, 0.3) 0%, transparent 70%)"
      }} />

        {/* Decorative Gradient 2 */}
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(198, 156, 109, 0.1) 0%, transparent 70%)",
        animation: "float 10s ease-in-out infinite reverse"
      }} />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Headline */}
          <h1 className="mb-4 sm:mb-6 leading-tight" style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 500,
          color: "#feffff",
          lineHeight: 1.2
        }}>
            Streamline your <span style={{
            color: "#c69c6d",
            fontStyle: "italic"
          }}>enterprise</span> demand & delivery
          </h1>

          {/* Description */}
          <p className="mb-8 sm:mb-12 max-w-md" style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
          color: "rgba(254, 255, 255, 0.65)",
          lineHeight: 1.8
        }}>Transform how your organization manages demand and delivery with intelligent workflows and real-time insights.</p>

          {/* Capabilities Section */}
          <div className="pt-8 sm:pt-12" style={{
            borderTop: "1px solid rgba(198, 156, 109, 0.25)"
          }}>
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
                  className="flex items-center gap-3 group"
                  style={{
                    padding: "10px 0",
                    whiteSpace: "nowrap",
                  }}
                >
                  <item.Icon 
                    className="transition-transform duration-300 group-hover:scale-110"
                    style={{
                      color: "#c69c6d",
                    }}
                    size={18}
                    strokeWidth={1.5}
                  />
                  <span 
                    className="transition-colors duration-300 group-hover:text-[#c69c6d]"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "1rem",
                      color: "rgba(254, 255, 255, 0.85)",
                      fontWeight: 500,
                      letterSpacing: "0.01em",
                    }}
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
          {/* Decorative Lines */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="rounded-sm" style={{
            width: "80px",
            height: "3px",
            backgroundColor: "#c69c6d",
            opacity: 1
          }} />
            <div className="rounded-sm" style={{
            width: "40px",
            height: "3px",
            backgroundColor: "#c69c6d",
            opacity: 0.5
          }} />
            <div className="rounded-sm" style={{
            width: "20px",
            height: "3px",
            backgroundColor: "#c69c6d",
            opacity: 0.3
          }} />
          </div>

          {/* Copyright */}
          <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.85rem",
          color: "rgba(254, 255, 255, 0.35)"
        }}>
            © 2025 Catalyst. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Panel */}
      <div className="relative w-full lg:w-[55%] p-6 sm:p-8 md:p-12 lg:p-16" style={{
      backgroundColor: "#feffff"
    }}>
        {/* Subtle background gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(198, 156, 109, 0.03) 0%, transparent 70%)"
      }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(198, 156, 109, 0.02) 0%, transparent 70%)"
      }} />

        {/* Catalyst Logo Text - absolute positioned */}
        <div className="absolute left-1/2 transform -translate-x-1/2 z-20" style={{ top: "clamp(24px, 6vh, 100px)" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(36px, 7vw, 52px)",
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: "-0.02em"
          }}>
            <span style={{ color: "#1a1a1a" }}>Cata</span>
            <span style={{ color: "#c69c6d" }}>lyst</span>
            <sup style={{ 
              fontSize: "0.4em", 
              color: "#1a1a1a",
              marginLeft: "2px",
              fontWeight: 400
            }}>TM</sup>
          </h1>
        </div>

        {/* Main Container */}
        <div className="w-full max-w-md mx-auto relative z-10" style={{ marginTop: "clamp(100px, 16vh, 140px)" }}>
          
          {/* User Type Selector - Segmented Pills */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-full p-1" style={{
              backgroundColor: "rgba(26, 26, 26, 0.05)"
            }}>
              <button
                type="button"
                onClick={() => setUserType("existing")}
                className="transition-all duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  padding: "10px 24px",
                  borderRadius: "9999px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: userType === "existing" ? "#1a1a1a" : "transparent",
                  color: userType === "existing" ? "#feffff" : "rgba(26, 26, 26, 0.6)",
                }}
              >
                Existing User
              </button>
              <button
                type="button"
                onClick={() => setUserType("external")}
                className="transition-all duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  padding: "10px 24px",
                  borderRadius: "9999px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: userType === "external" ? "#1a1a1a" : "transparent",
                  color: userType === "external" ? "#feffff" : "rgba(26, 26, 26, 0.6)",
                }}
              >
                External User
              </button>
            </div>
          </div>

          {/* Conditional Content */}
          {userType === "existing" ? (
            <>
              {/* Login Header */}
              <h2 className="text-center mb-2" style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.5rem, 3vw, 1.875rem)",
                fontWeight: 500,
                color: "#1a1a1a"
              }}>
                Welcome back
              </h2>
              <p className="text-center mb-6" style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                color: "rgba(26, 26, 26, 0.55)"
              }}>
                Enter your credentials to access your account
              </p>

              {/* Login Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block mb-1.5" style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#1a1a1a"
                  }}>
                    Email Address
                  </label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required className="w-full transition-all outline-none" style={{
                    fontFamily: "'DM Sans', sans-serif",
                    padding: "14px 18px",
                    border: "2px solid rgba(26, 26, 26, 0.1)",
                    borderRadius: "10px",
                    fontSize: "1rem",
                    backgroundColor: "#feffff"
                  }} onFocus={e => {
                    e.target.style.borderColor = "#c69c6d";
                    e.target.style.boxShadow = "0 0 0 3px rgba(198, 156, 109, 0.1)";
                  }} onBlur={e => {
                    e.target.style.borderColor = "rgba(26, 26, 26, 0.1)";
                    e.target.style.boxShadow = "none";
                  }} />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block mb-1.5" style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#1a1a1a"
                  }}>
                    Password
                  </label>
                  <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required className="w-full transition-all outline-none" style={{
                    fontFamily: "'DM Sans', sans-serif",
                    padding: "14px 18px",
                    border: "2px solid rgba(26, 26, 26, 0.1)",
                    borderRadius: "10px",
                    fontSize: "1rem",
                    backgroundColor: "#feffff"
                  }} onFocus={e => {
                    e.target.style.borderColor = "#c69c6d";
                    e.target.style.boxShadow = "0 0 0 3px rgba(198, 156, 109, 0.1)";
                  }} onBlur={e => {
                    e.target.style.borderColor = "rgba(26, 26, 26, 0.1)";
                    e.target.style.boxShadow = "none";
                  }} />
                </div>

                {/* Form Options Row */}
                <div className="flex items-center justify-between">
                  {/* Remember Me */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-2 cursor-pointer appearance-none transition-all" style={{
                      borderColor: "rgba(26, 26, 26, 0.2)",
                      backgroundColor: rememberMe ? "#c69c6d" : "transparent",
                      backgroundImage: rememberMe ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")" : "none",
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }} />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.875rem",
                      color: "rgba(26, 26, 26, 0.7)"
                    }}>
                      Remember me
                    </span>
                  </label>

                  {/* Forgot Password */}
                  <button type="button" className="transition-colors" style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.875rem",
                    color: "#c69c6d",
                    fontWeight: 500
                  }} onMouseEnter={e => {
                    e.currentTarget.style.color = "#1a1a1a";
                  }} onMouseLeave={e => {
                    e.currentTarget.style.color = "#c69c6d";
                  }}>
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button type="submit" disabled={isLoading} className="w-full relative overflow-hidden transition-all duration-300" style={{
                  fontFamily: "'DM Sans', sans-serif",
                  padding: "16px",
                  backgroundColor: "#1a1a1a",
                  color: "#feffff",
                  fontWeight: 600,
                  borderRadius: "10px",
                  fontSize: "1rem",
                  border: "none",
                  cursor: isLoading ? "not-allowed" : "pointer"
                }} onMouseEnter={e => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(26, 26, 26, 0.2)";
                  }
                }} onMouseLeave={e => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}>
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Sign In
                  </span>
                </button>
              </form>

              {/* Jira Badge under login */}
              <div className="mt-6">
                <IntegrationBadge />
              </div>
            </>
          ) : (
            <>
              {/* External User Header */}
              <h2 className="text-center mb-2" style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.5rem, 3vw, 1.875rem)",
                fontWeight: 500,
                color: "#1a1a1a"
              }}>
                Submit a Request
              </h2>
              <p className="text-center mb-6" style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                color: "rgba(26, 26, 26, 0.55)"
              }}>
                Log your business demand without an account
              </p>

              {/* Request Card */}
              <div className="flex flex-col items-center p-8 rounded-xl" style={{
                backgroundColor: "rgba(198, 156, 109, 0.04)",
                border: "1px solid rgba(198, 156, 109, 0.15)"
              }}>
                {/* Icon */}
                <div className="mb-5 p-4 rounded-full" style={{
                  backgroundColor: "rgba(198, 156, 109, 0.1)"
                }}>
                  <FileText className="w-10 h-10" style={{ color: "#c69c6d" }} />
                </div>

                {/* Description */}
                <p className="text-center mb-6" style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "1rem",
                  color: "rgba(26, 26, 26, 0.65)",
                  lineHeight: 1.7
                }}>
                  No account needed. Submit your business demand request and our team will review it promptly.
                </p>

                {/* Submit Button - Outlined Gold */}
                <button 
                  type="button" 
                  onClick={() => navigate('/request-access')}
                  className="w-full transition-all duration-300"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    padding: "16px 24px",
                    backgroundColor: "transparent",
                    color: "#c69c6d",
                    fontWeight: 600,
                    borderRadius: "10px",
                    fontSize: "1rem",
                    border: "2px solid #c69c6d",
                    cursor: "pointer"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#c69c6d";
                    e.currentTarget.style.color = "#feffff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(198, 156, 109, 0.3)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#c69c6d";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Log Demand Request
                </button>

                {/* Info text */}
                <p className="mt-4 text-center" style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.8rem",
                  color: "rgba(26, 26, 26, 0.4)"
                }}>
                  Ticket ID will be generated upon submission
                </p>
              </div>
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
    </div>;
}