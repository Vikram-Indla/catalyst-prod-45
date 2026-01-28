/**
 * Caty V4 — Main Panel Component (GOD-TIER 9.8)
 * Enterprise-grade AI Assistant for capacity management
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';

// V4 Components
import { CatyHeader } from './CatyHeader';
import { CatyGreetingCard } from './CatyGreetingCard';
import { CatyMessageBubble } from './CatyMessage';
import { CatyTypingIndicator } from './CatyTypingIndicator';
import { CatySuggestions } from './CatySuggestions';
import { CatyInput } from './CatyInput';
import { CatySkeletonCard, CatyErrorState } from './CatyStates';
import { useCapacityData } from './useCapacityData';
import { useCatyKeyboard } from './useCatyKeyboard';
import { formatTimeAgo, formatContractDate, type ChatMessage } from './types';

// Import ring-fenced styles
import '@/styles/caty.css';

export function CatyPanelV4() {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  
  // Auth
  const { user } = useAuth();
  
  // Capacity data hook
  const { stats, isLoading, isError, refetch } = useCapacityData();
  
  // Keyboard shortcuts
  useCatyKeyboard({ 
    onClose: () => setIsOpen(false), 
    inputRef, 
    isOpen 
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Helpers
  const getUserFirstName = () => {
    if (profile?.full_name) return profile.full_name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((w: string) => w.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Contextual suggestions
  const getSuggestions = (): string[] => {
    if (stats.critical > 0) {
      return ["Show critical resources", "Contract renewals", "Who needs attention?"];
    }
    if (stats.warning > 0) {
      return ["Show warnings", "Upcoming renewals", "Department breakdown"];
    }
    return ["Total resources", "Show all departments", "Contract renewals"];
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Toggle department expansion
  const toggleDeptExpand = (deptId: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  // Generate AI response
  const generateResponse = useCallback(async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDays = new Date(todayStart);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    thirtyDays.setHours(23, 59, 59, 999);
    const ninetyDays = new Date(todayStart);
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    ninetyDays.setHours(23, 59, 59, 999);

    // Critical resources query
    if (lowerQuery.includes('critical')) {
      const { data: criticalResources } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, contract_end_date, vendor_name, role_name')
        .lte('contract_end_date', thirtyDays.toISOString())
        .gte('contract_end_date', todayStart.toISOString())
        .not('contract_end_date', 'is', null)
        .order('contract_end_date', { ascending: true })
        .limit(10);

      if (criticalResources && criticalResources.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', criticalResources.filter(r => r.profile_id).map(r => r.profile_id));
        
        const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
        
        return `**${criticalResources.length} Critical Resources (ending within 30 days):**\n\n${criticalResources.map(r => {
          const name = (r.profile_id && profileMap.get(r.profile_id)) || r.name || r.role_name || 'Resource';
          return `• **${name}** (${r.vendor_name || 'N/A'}) — ${formatContractDate(r.contract_end_date)}`;
        }).join('\n')}`;
      }
      return '**No critical resources found** (contracts ending within 30 days)';
    }

    // Total/breakdown query
    if (lowerQuery.includes('total') || lowerQuery.includes('breakdown') || lowerQuery.includes('department')) {
      return `**Total Resources: ${stats.total}**\n\n**By Department:**\n${stats.departments.map(d => 
        `• **${d.name}**: ${d.count} resources (${d.critical} critical, ${d.warning} warning)`
      ).join('\n')}`;
    }

    // Renewals query
    if (lowerQuery.includes('renewal') || lowerQuery.includes('contract')) {
      const { data: renewals } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, contract_end_date, vendor_name')
        .lte('contract_end_date', ninetyDays.toISOString())
        .gte('contract_end_date', todayStart.toISOString())
        .order('contract_end_date', { ascending: true })
        .limit(10);

      if (renewals && renewals.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', renewals.filter(r => r.profile_id).map(r => r.profile_id));
        
        const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

        return `**Priority Contract Renewals (next 90 days):**\n\n${renewals.map(r => {
          const name = (r.profile_id && profileMap.get(r.profile_id)) || r.name || 'Resource';
          return `• **${name}** (${r.vendor_name || 'N/A'}) — ends ${formatContractDate(r.contract_end_date)}`;
        }).join('\n')}`;
      }
      return '**No urgent renewals needed**';
    }

    // Warning query
    if (lowerQuery.includes('warning')) {
      const warningDepts = stats.departments.filter(d => d.warning > 0 || d.critical > 0);
      if (warningDepts.length > 0) {
        return `**Departments with Warnings:**\n\n${warningDepts.map(d => 
          `• **${d.name}**: ${d.critical} critical, ${d.warning} warning (${d.utilization}% utilization)`
        ).join('\n')}`;
      }
      return '**All departments are looking healthy!** No warnings to report.';
    }

    // Department specific query
    for (const dept of stats.departments) {
      if (lowerQuery.includes(dept.name.toLowerCase())) {
        return `**${dept.name} Department (${dept.count} resources):**\n\n• **Utilization:** ${dept.utilization}%\n• **Critical:** ${dept.critical}\n• **Warning:** ${dept.warning}\n\nClick on the department card above to see the resource list.`;
      }
    }

    return `I can help you with capacity insights. Try asking about:\n• Critical resources\n• Contract renewals\n• Department breakdown\n• A specific department`;
  }, [stats]);

  // Handle message submit
  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Simulate typing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      
      const response = await generateResponse(inputValue);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Caty error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle KPI click
  const handleKpiClick = (type: 'critical' | 'warning' | 'total') => {
    const queries = {
      critical: 'Show critical resources',
      warning: 'Show warning resources',
      total: 'Show all resources breakdown'
    };
    setInputValue(queries[type]);
    setTimeout(() => handleSubmit(), 100);
  };

  // Handle feedback
  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback } : m
    ));
    // TODO: Persist feedback to database
  };

  // Handle copy
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ''));
  };

  // Handle refresh
  const handleRefresh = () => {
    setMessages([]);
    refetch();
  };

  const lastUpdatedText = formatTimeAgo(stats.lastUpdated);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "caty-fab",
          isOpen && "opacity-0 pointer-events-none"
        )}
        aria-label="Open Caty AI Assistant"
      >
        <img 
          src={catalystLogoWhite} 
          alt="Catalyst AI" 
          className="w-10 h-10"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
        {stats.critical > 0 && (
          <div className="caty-fab-badge" aria-label={`${stats.critical} critical alerts`}>
            {stats.critical}
          </div>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="caty-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Panel */}
      {isOpen && (
        <div 
          className={cn(
            "caty-panel",
            isMinimized && "minimized"
          )}
          role="dialog"
          aria-label="Caty Capacity AI Assistant"
          aria-modal="true"
        >
          <CatyHeader
            onClose={() => setIsOpen(false)}
            onMinimize={() => setIsMinimized(!isMinimized)}
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
            lastUpdated={lastUpdatedText}
          />

          {!isMinimized && (
            <>
              {/* Conversation Area */}
              <div 
                ref={conversationRef}
                className="caty-conversation"
              >
                {/* Loading State */}
                {isLoading && <CatySkeletonCard />}

                {/* Error State */}
                {isError && (
                  <CatyErrorState 
                    type="api-error" 
                    onRetry={refetch} 
                  />
                )}

                {/* Initial Greeting Card */}
                {!isLoading && !isError && (
                  <CatyGreetingCard
                    greeting={getGreeting()}
                    userName={getUserFirstName()}
                    stats={stats}
                    expandedDepts={expandedDepts}
                    onDeptToggle={toggleDeptExpand}
                    onKpiClick={handleKpiClick}
                    timestamp={new Date()}
                  />
                )}

                {/* Conversation Messages */}
                {messages.map(message => (
                  <CatyMessageBubble
                    key={message.id}
                    message={message}
                    userInitials={getUserInitials()}
                    onCopy={handleCopy}
                    onFeedback={handleFeedback}
                  />
                ))}

                {/* Typing Indicator */}
                {isTyping && <CatyTypingIndicator />}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              <CatySuggestions
                suggestions={getSuggestions()}
                onSelect={(text) => {
                  setInputValue(text);
                  inputRef.current?.focus();
                }}
              />

              {/* Input */}
              <CatyInput
                ref={inputRef}
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSubmit}
                disabled={isTyping}
              />
            </>
          )}

          {/* Live region for screen readers */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isTyping && 'Caty is typing a response'}
          </div>
        </div>
      )}
    </>
  );
}
