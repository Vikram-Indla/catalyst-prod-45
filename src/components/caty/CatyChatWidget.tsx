import { useState, useEffect, useRef } from 'react';
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

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CatyChatWidgetProps {
  criticalCount?: number;
  warningCount?: number;
  totalCount?: number;
  departments?: DepartmentData[];
}

// Helper to format date
const formatContractDate = (dateStr: string | null) => {
  if (!dateStr) return 'No date set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Query database for response - async
  const generateResponseAsync = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    
    // Check if query mentions a specific person's name
    const nameMatch = query.match(/(?:when is|what about|show me|find)\s+(.+?)(?:'s)?\s*(?:contract|expir|ending|status)?/i);
    if (nameMatch) {
      const searchName = nameMatch[1].trim();
      const { data: personResults } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date, contract_start_date')
        .ilike('full_name', `%${searchName}%`)
        .limit(5);
      
      if (personResults && personResults.length > 0) {
        if (personResults.length === 1) {
          const p = personResults[0];
          const endDate = p.contract_end_date ? formatContractDate(p.contract_end_date) : 'Not set';
          return `**${p.full_name}**\n\n• **Vendor:** ${p.vendor || 'N/A'}\n• **Contract End Date:** ${endDate}\n• **Contract Start Date:** ${p.contract_start_date ? formatContractDate(p.contract_start_date) : 'N/A'}`;
        } else {
          return `**Found ${personResults.length} matching resources:**\n\n${personResults.map(p => 
            `• **${p.full_name}** (${p.vendor || 'N/A'}) — Contract ends ${p.contract_end_date ? formatContractDate(p.contract_end_date) : 'Not set'}`
          ).join('\n')}`;
        }
      }
    }
    
    // Critical resources query
    if (lowerQuery.includes('critical') || lowerQuery.match(/\b8\b.*critical/)) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: criticalResults } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date')
        .lte('contract_end_date', thirtyDaysFromNow.toISOString())
        .not('contract_end_date', 'is', null)
        .order('contract_end_date', { ascending: true })
        .limit(10);
      
      if (criticalResults && criticalResults.length > 0) {
        return `**${criticalResults.length} Critical Resources (ending within 30 days):**\n\n${criticalResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No critical resources found** (contracts ending within 30 days)`;
    }
    
    // Warning resources query  
    if (lowerQuery.includes('warning')) {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      
      const { data: warningResults } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date')
        .gt('contract_end_date', thirtyDays.toISOString())
        .lte('contract_end_date', ninetyDays.toISOString())
        .order('contract_end_date', { ascending: true })
        .limit(10);
      
      if (warningResults && warningResults.length > 0) {
        return `**${warningResults.length} Warning Resources (ending in 30-90 days):**\n\n${warningResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No warning resources found** (contracts ending in 30-90 days)`;
    }
    
    // This month query
    if (lowerQuery.includes('expiring this month') || lowerQuery.includes('this month')) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data: monthResults } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date')
        .gte('contract_end_date', startOfMonth.toISOString())
        .lte('contract_end_date', endOfMonth.toISOString())
        .order('contract_end_date', { ascending: true });
      
      const monthName = now.toLocaleDateString('en-US', { month: 'long' });
      if (monthResults && monthResults.length > 0) {
        return `**Contracts expiring this month (${monthName}):**\n\n${monthResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No contracts expiring this month (${monthName})**`;
    }
    
    // Total/all resources
    if (lowerQuery.includes('total') || lowerQuery.includes('all resources')) {
      return `**Total Resources: ${totalCount}**\n\n**By Department:**\n${departments.map(d => `• **${d.name}**: ${d.count} resources (${d.critical} critical, ${d.warning} warning)`).join('\n')}`;
    }
    
    // Available resources
    if (lowerQuery.includes('available')) {
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      
      const { data: availableResults, count } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date', { count: 'exact' })
        .gt('contract_end_date', ninetyDays.toISOString());
      
      return `**Available Resources:**\n\nCurrently, there are **${count || 0} healthy** resources with contracts extending beyond 90 days.\n\n**By Department:**\n${departments.map(d => `• **${d.name}**: ${d.count - d.critical - d.warning} available`).join('\n')}`;
    }
    
    // Renewals
    if (lowerQuery.includes('renewal')) {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      
      const { data: renewalResults } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date')
        .lte('contract_end_date', thirtyDays.toISOString())
        .not('contract_end_date', 'is', null)
        .order('contract_end_date', { ascending: true })
        .limit(5);
      
      if (renewalResults && renewalResults.length > 0) {
        return `**Priority Contract Renewals:**\n\n${renewalResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — ends ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No urgent renewals needed**`;
    }
    
    // Try to search by name as fallback
    const words = query.split(' ').filter(w => w.length > 2);
    for (const word of words) {
      const { data: searchResults } = await supabase
        .from('profiles')
        .select('full_name, vendor, contract_end_date')
        .ilike('full_name', `%${word}%`)
        .limit(3);
      
      if (searchResults && searchResults.length > 0) {
        return `**Found resources matching "${word}":**\n\n${searchResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — Contract ends ${r.contract_end_date ? formatContractDate(r.contract_end_date) : 'Not set'}`
        ).join('\n')}`;
      }
    }
    
    return `I can help you with capacity insights. Try asking about:\n• A specific person (e.g., "When is Nada's contract expiring?")\n• Critical resources\n• Warning resources\n• Contract renewals\n• Available resources`;
  };

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Query real database
      const response = await generateResponseAsync(query);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error fetching the data. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const handleKpiClick = (type: 'critical' | 'warning' | 'total') => {
    const queries = {
      critical: `Show me the ${criticalCount} critical resources`,
      warning: `Show me the ${warningCount} warning resources`,
      total: `Show me all ${totalCount} resources breakdown`
    };
    handleSubmit(queries[type]);
  };

  const handleSend = () => {
    handleSubmit(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRefresh = () => {
    setMessages([]);
  };

  // Render message content with markdown-like formatting
  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Bold text
      const formattedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return (
        <span 
          key={i} 
          className="block"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
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
          className="relative px-4 py-3 overflow-hidden shrink-0"
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
                onClick={handleRefresh}
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

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
          {/* Greeting Message - No redundant avatar */}
          <div className="animate-[message-in_0.5s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
              <h3 className="text-lg font-bold text-foreground tracking-tight mb-0.5">
                {getGreeting()}, {getUserFirstName()}! 👋
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Here&apos;s your capacity snapshot
              </p>

              {/* KPI Cards - Clickable */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button 
                  onClick={() => handleKpiClick('critical')}
                  className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-red-500 to-red-400" />
                  <span className="text-base block mb-1">⚠️</span>
                  <div className="text-2xl font-extrabold text-red-500 tracking-tight leading-none mb-0.5">{criticalCount}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Critical</div>
                </button>

                <button 
                  onClick={() => handleKpiClick('warning')}
                  className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-amber-600 to-amber-500" />
                  <span className="text-base block mb-1">⏰</span>
                  <div className="text-2xl font-extrabold text-amber-600 tracking-tight leading-none mb-0.5">{warningCount}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Warning</div>
                </button>

                <button 
                  onClick={() => handleKpiClick('total')}
                  className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-teal-500 to-teal-400" />
                  <span className="text-base block mb-1">👥</span>
                  <div className="text-2xl font-extrabold text-teal-600 tracking-tight leading-none mb-0.5">{totalCount}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</div>
                </button>
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
                      <div className="flex items-center gap-2">
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={cn(
                "mt-3 animate-[message-in_0.3s_cubic-bezier(0.16,1,0.3,1)]",
                message.type === 'user' && "flex justify-end"
              )}
            >
              <div 
                className={cn(
                  "p-3 shadow-sm",
                  message.type === 'user' 
                    ? "rounded-xl bg-teal-600 text-white max-w-[85%]" 
                    : "rounded-xl bg-card border border-border"
                )}
              >
                <div className={cn(
                  "text-sm leading-relaxed",
                  message.type === 'user' ? "text-white" : "text-foreground"
                )}>
                  {renderMessageContent(message.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="mt-3 animate-[message-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
              <div className="p-3 rounded-xl bg-card border border-border inline-block">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area with Suggestions */}
        <div className="p-3 pb-4 bg-background border-t border-border shrink-0">
          {/* Quick Suggestions - closer to input */}
          <div className="mb-2">
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground rounded-full transition-all duration-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-500/10 bg-muted/50 border border-border"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          
          {/* Input field - more prominent */}
          <div className="flex items-center gap-2 rounded-xl bg-card border-2 border-border p-1.5 pl-4 focus-within:border-teal-500 transition-colors">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Caty about capacity..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all duration-250 hover:scale-105 shrink-0 disabled:opacity-50 disabled:hover:scale-100"
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
