import { useState, useEffect } from 'react';
import { X, RotateCw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatyOrb } from './CatyOrb';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DepartmentData {
  id: string;
  name: string;
  shortName: string;
  count: number;
  critical: number;
  warning: number;
  insight: string;
  color: string;
  bgColor: string;
}

interface CatyChatWidgetProps {
  criticalCount?: number;
  warningCount?: number;
  totalCount?: number;
  departments?: DepartmentData[];
}

export function CatyChatWidget({
  criticalCount = 8,
  warningCount = 6,
  totalCount = 67,
  departments = [
    { id: 'delivery', name: 'Delivery', shortName: 'D', count: 34, critical: 5, warning: 3, insight: 'Ahmed Yousry, Hasan Elsherby +3 others contracts ending by Mar 30', color: '#2563eb', bgColor: 'bg-blue-600' },
    { id: 'product', name: 'Product', shortName: 'P', count: 14, critical: 1, warning: 2, insight: 'Alouf Aldrees contract ending Jan 11', color: '#7c3aed', bgColor: 'bg-violet-600' },
    { id: 'operations', name: 'Operations', shortName: 'O', count: 12, critical: 2, warning: 1, insight: 'Mahmoud Mesbah contract expired, Abdulmajeed AlJabari ending Jan 9', color: '#ea580c', bgColor: 'bg-orange-600' },
    { id: 'support', name: 'Technical Support', shortName: 'T', count: 7, critical: 0, warning: 1, insight: 'Abdulrahman AlRajhi contract ending Mar 29', color: '#0d9488', bgColor: 'bg-teal-600' },
  ]
}: CatyChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();

  // Fetch user profile for first name
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get user's first name
  const getUserFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const suggestions = [
    "Whose contract is expiring this month?",
    "Available resources",
    "Contract renewals"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // TODO: Auto-send the suggestion to AI backend
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // TODO: Send to AI backend
    console.log('Sending:', inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-[60px] h-[60px] rounded-full z-[1000]",
          "flex items-center justify-center cursor-pointer",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:scale-110",
          isOpen && "opacity-0 pointer-events-none"
        )}
        style={{
          background: 'linear-gradient(135deg, #5eaaa8 0%, #3d9a98 50%, #2d8a88 100%)',
          boxShadow: '0 4px 20px rgba(20, 184, 166, 0.4), 0 0 60px rgba(20, 184, 166, 0.3)',
          animation: 'fab-breathe 4s ease-in-out infinite'
        }}
        aria-label="Open Caty AI Assistant"
      >
        {/* Mini face */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-2">
            <div className="w-[5px] h-[7px] bg-white rounded-[2px]" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
            <div className="w-[5px] h-[7px] bg-white rounded-[2px]" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
          </div>
          <div className="w-3 h-1.5 border-b-2 border-white rounded-b-full" />
        </div>

        {/* Notification badge */}
        {criticalCount > 0 && (
          <div 
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)' }}
          >
            {criticalCount}
          </div>
        )}
      </button>

      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[1000] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ 
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setIsOpen(false)}
      />

      {/* Chat Panel - Light Mode Default */}
      <div 
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[1001] w-full sm:w-[380px] md:w-[420px]",
          "flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "bg-background border-l border-border shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Thinner */}
        <div 
          className="relative px-4 py-3 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #3d9a98 0%, #4dada8 50%, #5eaaa8 100%)'
          }}
        >
          {/* Light overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.15), transparent 50%),
                radial-gradient(ellipse at 70% 100%, rgba(0,0,0,0.1), transparent 50%)
              `
            }}
          />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CatyOrb size="sm" showStatusDot showParticles={false} />
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Caty</h2>
                <div className="flex items-center gap-1.5 text-[12px] text-white/80">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span>Online · Capacity AI</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Body - Light Mode */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
          {/* Greeting Message */}
          <div className="flex gap-3 animate-[message-in_0.5s_cubic-bezier(0.16,1,0.3,1)]">
            <CatyOrb size="sm" showParticles={false} showStatusDot={false} />
            
            <div className="flex-1 p-4 rounded-[6px_16px_16px_16px] bg-card border border-border shadow-sm">
              <h3 className="text-lg font-bold text-foreground tracking-tight mb-0.5">
                {getGreeting()}, {getUserFirstName()}! 👋
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Here&apos;s your capacity snapshot
              </p>

              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-red-500 to-red-400" />
                  <span className="text-base block mb-1">⚠️</span>
                  <div className="text-2xl font-extrabold text-red-500 tracking-tight leading-none mb-0.5">{criticalCount}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Critical</div>
                </div>

                <div className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-amber-600 to-amber-500" />
                  <span className="text-base block mb-1">⏰</span>
                  <div className="text-2xl font-extrabold text-amber-600 tracking-tight leading-none mb-0.5">{warningCount}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Warning</div>
                </div>

                <div className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-teal-500 to-teal-400" />
                  <span className="text-base block mb-1">👥</span>
                  <div className="text-2xl font-extrabold text-teal-600 tracking-tight leading-none mb-0.5">{totalCount}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</div>
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  By Department
                </div>
                
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div 
                      key={dept.id}
                      className="rounded-lg p-2.5 cursor-pointer transition-all duration-250 hover:translate-x-0.5 hover:shadow-sm bg-card border border-border"
                      style={{ borderLeft: `3px solid ${dept.color}` }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div 
                          className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: dept.color }}
                        >
                          {dept.shortName}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground">{dept.name}</div>
                          <div className="text-[11px] text-muted-foreground">{dept.count} resources</div>
                        </div>
                        {dept.critical > 0 ? (
                          <div className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 shrink-0">
                            {dept.critical} critical
                          </div>
                        ) : dept.warning > 0 ? (
                          <div className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 shrink-0">
                            {dept.warning} warning
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 shrink-0">
                            All safe
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed pl-9">
                        {dept.insight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Ask me about
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-2 text-xs font-medium text-muted-foreground rounded-full transition-all duration-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-500/10 bg-card border border-border"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area - Light Mode */}
        <div className="p-3 pb-4 bg-background border-t border-border">
          <div className="flex items-center gap-2 rounded-xl p-1 pl-3 transition-all duration-250 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 bg-muted/50 border border-border">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Caty about capacity..."
              className="flex-1 bg-transparent border-none text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button 
              onClick={handleSend}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all duration-250 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style>{`
        @keyframes fab-breathe {
          0%, 100% { box-shadow: 0 4px 20px rgba(20, 184, 166, 0.4), 0 0 60px rgba(20, 184, 166, 0.3); }
          50% { box-shadow: 0 4px 30px rgba(20, 184, 166, 0.5), 0 0 80px rgba(20, 184, 166, 0.4); }
        }
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes look-around {
          0%, 40%, 100% { transform: translateX(-50%); }
          45%, 55% { transform: translateX(-100%); }
          60%, 70% { transform: translateX(0%); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes status-pulse {
          0%, 100% { box-shadow: 0 0 8px #22c55e; }
          50% { box-shadow: 0 0 15px #22c55e; }
        }
        @keyframes message-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
