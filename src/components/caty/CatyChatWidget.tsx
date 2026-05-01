/**
 * Caty V2 — Capacity AI Assistant
 * Ring-fenced design system using --caty-* tokens
 * Enterprise-grade AI panel with conversation, KPIs, and department breakdowns
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { X, RotateCw, Send, Minus, ChevronDown, Copy, ThumbsUp, ThumbsDown, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';
import { formatDistanceToNow } from 'date-fns';

// ==================== TYPES ====================
interface DepartmentStats {
  id: string;
  name: string;
  shortName: string;
  count: number;
  critical: number;
  warning: number;
  color: string;
  utilization: number;
  resources?: ResourceInfo[];
}

interface ResourceInfo {
  id: string;
  name: string;
  initials: string;
  role?: string;
  warningType?: 'contract' | 'utilization';
  contractEnd?: string;
  utilization?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'positive' | 'negative' | null;
}

interface CapacityStats {
  total: number;
  critical: number;
  warning: number;
  criticalTrend: number;
  warningTrend: number;
  departments: DepartmentStats[];
  lastUpdated: Date;
}

// Department colors mapping
const DEPT_COLORS: Record<string, string> = {
  'Delivery': 'var(--ds-text-brand, #2563eb)',
  'Product': '#8b5cf6',
  'Operations': '#ea580c',
  'Technical Support': '#f97316',
  'Governance': 'var(--ds-text-subtlest, #64748b)',
};

// Get department CSS class
const getDeptClass = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('product')) return 'product';
  if (lower.includes('delivery')) return 'delivery';
  if (lower.includes('operations')) return 'operations';
  if (lower.includes('support')) return 'support';
  return 'governance';
};

// Format contract date
const formatContractDate = (dateStr: string | null) => {
  if (!dateStr) return 'No date set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Get capacity class
const getCapacityClass = (utilization: number): string => {
  if (utilization >= 86) return 'danger';
  if (utilization >= 71) return 'warning';
  return 'safe';
};

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function CatyChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<CapacityStats>({
    total: 0,
    critical: 0,
    warning: 0,
    criticalTrend: 0,
    warningTrend: 0,
    departments: [],
    lastUpdated: new Date(),
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch capacity stats from database
  const fetchCapacityStats = useCallback(async () => {
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    // Fetch resource_inventory with profile names
    const { data: resourceInventory } = await supabase
      .from('resource_inventory')
      .select('id, profile_id, name, department_id, contract_start_date, contract_end_date, vendor_id, role_name');

    // Fetch departments
    const { data: departments } = await supabase
      .from('capacity_departments')
      .select('id, name')
      .order('sort_order');

    // Fetch profiles for names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (!resourceInventory || !departments) return;

    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    // Calculate stats
    let critical = 0;
    let warning = 0;
    const deptStats: Record<string, { 
      count: number; 
      critical: number; 
      warning: number; 
      totalCapacity: number;
      resources: ResourceInfo[];
    }> = {};

    // Initialize department stats
    departments.forEach(d => {
      deptStats[d.id] = { count: 0, critical: 0, warning: 0, totalCapacity: 0, resources: [] };
    });

    resourceInventory.forEach(r => {
      // Count by department
      if (r.department_id && deptStats[r.department_id]) {
        deptStats[r.department_id].count++;
        deptStats[r.department_id].totalCapacity += 100; // Default capacity
      }

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysEnd = new Date(thirtyDays.getFullYear(), thirtyDays.getMonth(), thirtyDays.getDate(), 23, 59, 59);
      const ninetyDaysEnd = new Date(ninetyDays.getFullYear(), ninetyDays.getMonth(), ninetyDays.getDate(), 23, 59, 59);

      // Get display name
      const displayName = (r.profile_id && profileMap.get(r.profile_id)) || r.name || r.role_name || 'Resource';

      // Check contract end dates
      if (r.contract_end_date) {
        const endDate = new Date(r.contract_end_date);
        
        if (endDate >= todayStart && endDate <= thirtyDaysEnd) {
          critical++;
          if (r.department_id && deptStats[r.department_id]) {
            deptStats[r.department_id].critical++;
            deptStats[r.department_id].resources.push({
              id: r.id,
              name: displayName,
              initials: getInitials(displayName),
              role: r.role_name || undefined,
              warningType: 'contract',
              contractEnd: r.contract_end_date,
            });
          }
        } else if (endDate > thirtyDaysEnd && endDate <= ninetyDaysEnd) {
          warning++;
          if (r.department_id && deptStats[r.department_id]) {
            deptStats[r.department_id].warning++;
            deptStats[r.department_id].resources.push({
              id: r.id,
              name: displayName,
              initials: getInitials(displayName),
              role: r.role_name || undefined,
              warningType: 'contract',
              contractEnd: r.contract_end_date,
            });
          }
        }
      }
    });

    const departmentList: DepartmentStats[] = departments.map(d => {
      const deptData = deptStats[d.id];
      const avgUtilization = deptData.count > 0 
        ? Math.round(deptData.totalCapacity / deptData.count) 
        : 0;
      
      return {
        id: d.id,
        name: d.name,
        shortName: d.name.charAt(0),
        count: deptData?.count || 0,
        critical: deptData?.critical || 0,
        warning: deptData?.warning || 0,
        color: DEPT_COLORS[d.name] || '#6b7280',
        utilization: avgUtilization,
        resources: deptData?.resources || [],
      };
    });

    setStats({
      total: resourceInventory.length,
      critical,
      warning,
      criticalTrend: 0, // Could be calculated from historical data
      warningTrend: 2, // Mock trend for demo
      departments: departmentList,
      lastUpdated: new Date(),
    });
  }, []);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchCapacityStats();

    const channel = supabase
      .channel('caty-capacity-updates-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, () => {
        fetchCapacityStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCapacityStats]);

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

  const getUserFirstName = () => {
    if (profile?.full_name) return profile.full_name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  };

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
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const suggestions = [
    "Who's on leave next week?",
    "Critical resources only",
    "Contract renewals"
  ];

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

  // Generate response (simplified - existing logic)
  const generateResponseAsync = async (query: string): Promise<string> => {
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
    if (lowerQuery.includes('total') || lowerQuery.includes('breakdown')) {
      return `**Total Resources: ${stats.total}**\n\n**By Department:**\n${stats.departments.map(d => 
        `• **${d.name}**: ${d.count} resources (${d.critical} critical, ${d.warning} warning)`
      ).join('\n')}`;
    }

    // Renewals query
    if (lowerQuery.includes('renewal')) {
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

    // Department query
    for (const dept of stats.departments) {
      if (lowerQuery.includes(dept.name.toLowerCase())) {
        return `**${dept.name} Department (${dept.count} resources):**\n\n• **Utilization:** ${dept.utilization}%\n• **Critical:** ${dept.critical}\n• **Warning:** ${dept.warning}\n\nClick on the department card to see the resource list.`;
      }
    }

    return `I can help you with capacity insights. Try asking about:\n• Critical resources\n• Contract renewals\n• Department breakdown\n• A specific department`;
  };

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;

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
      const response = await generateResponseAsync(query);
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

  const handleKpiClick = (type: 'critical' | 'warning' | 'total') => {
    const queries = {
      critical: 'Show critical resources',
      warning: 'Show warning resources',
      total: 'Show all resources breakdown'
    };
    handleSubmit(queries[type]);
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback } : m
    ));
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ''));
  };

  const handleRefresh = () => {
    setMessages([]);
    fetchCapacityStats();
  };

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const formattedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedLine) }} />;
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const timeAgo = formatDistanceToNow(stats.lastUpdated, { addSuffix: false });

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "caty-fab",
          isOpen && "opacity-0 pointer-events-none"
        )}
        aria-label="Open Catalyst AI Assistant"
      >
        <img 
          src={catalystLogoWhite} 
          alt="Catalyst AI" 
          className="w-10 h-10"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
        {stats.critical > 0 && (
          <div className="caty-fab-badge">{stats.critical}</div>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="caty-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <div 
        className={cn(
          "caty-panel caty-panel-container",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="caty-header">
          <div className="caty-header-content">
            <div className="caty-header-brand">
              <img 
                src={catalystLogoWhite} 
                alt="Caty" 
                className="w-9 h-9"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              />
              <div>
                <h2 className="caty-header-title">Caty</h2>
                <div className="caty-header-status">
                  <span className="caty-status-dot" />
                  <span>Online · Capacity AI</span>
                </div>
              </div>
            </div>

            <div className="caty-header-actions">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="caty-header-btn"
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRefresh}
                className="caty-header-btn"
                aria-label="Refresh"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="caty-header-btn"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="caty-conversation">
          {/* AI Greeting Message */}
          <div className="caty-message ai">
            <div className="caty-message-avatar">
              <img src={catalystLogoWhite} alt="" className="w-5 h-5" />
            </div>
            <div className="caty-message-content">
              <div className="caty-greeting-card">
                <div className="caty-greeting-header">
                  <span className="caty-greeting-title">
                    {getGreeting()}, {getUserFirstName()}! 👋
                  </span>
                  <span className="caty-greeting-time">
                    <span className="caty-status-dot" />
                    {timeAgo} ago
                  </span>
                </div>
                <p className="caty-greeting-subtitle">Here's your capacity snapshot</p>

                {/* KPI Tiles */}
                <div className="caty-kpi-grid">
                  <button 
                    onClick={() => handleKpiClick('critical')}
                    className="caty-kpi-tile critical"
                  >
                    <div className="caty-kpi-icon">⚠️</div>
                    <div className="caty-kpi-value">{stats.critical}</div>
                    <div className="caty-kpi-label">Critical</div>
                  </button>

                  <button 
                    onClick={() => handleKpiClick('warning')}
                    className="caty-kpi-tile warning"
                  >
                    {stats.warningTrend !== 0 && (
                      <span className={cn("caty-kpi-trend", stats.warningTrend > 0 ? "up" : "down")}>
                        {stats.warningTrend > 0 ? '↑' : '↓'}{Math.abs(stats.warningTrend)}
                      </span>
                    )}
                    <div className="caty-kpi-icon">⏰</div>
                    <div className="caty-kpi-value">{stats.warning}</div>
                    <div className="caty-kpi-label">Warning</div>
                  </button>

                  <button 
                    onClick={() => handleKpiClick('total')}
                    className="caty-kpi-tile total"
                  >
                    <div className="caty-kpi-icon">👥</div>
                    <div className="caty-kpi-value">{stats.total}</div>
                    <div className="caty-kpi-label">Total</div>
                  </button>
                </div>

                {/* Department List */}
                <div className="caty-section-title">By Department</div>
                <div className="caty-dept-list">
                  {stats.departments.map((dept) => {
                    const isExpanded = expandedDepts.has(dept.id);
                    const capacityClass = getCapacityClass(dept.utilization);
                    const deptClass = getDeptClass(dept.name);

                    return (
                      <div 
                        key={dept.id}
                        className={cn("caty-dept-card", deptClass, isExpanded && "expanded")}
                      >
                        <div 
                          className="caty-dept-header"
                          onClick={() => toggleDeptExpand(dept.id)}
                        >
                          <div className="caty-dept-icon">{dept.shortName}</div>
                          <div className="caty-dept-info">
                            <div className="caty-dept-name">{dept.name}</div>
                            <div className="caty-dept-meta">
                              <span>{dept.count} resources</span>
                            </div>
                          </div>
                          <div className="caty-capacity-bar-wrap">
                            <div className="caty-capacity-bar">
                              <div 
                                className={cn("caty-capacity-fill", capacityClass)}
                                style={{ width: `${Math.min(dept.utilization, 100)}%` }}
                              />
                            </div>
                            <span className={cn("caty-capacity-value", capacityClass)}>
                              {dept.utilization}%
                            </span>
                          </div>
                          <span className={cn(
                            "caty-dept-status",
                            (dept.critical > 0 || dept.warning > 0) ? "warning" : "safe"
                          )}>
                            {dept.critical > 0 
                              ? `${dept.critical} critical`
                              : dept.warning > 0 
                                ? `${dept.warning} warning` 
                                : 'All safe'}
                          </span>
                          <ChevronDown className="caty-dept-chevron" />
                        </div>

                        {/* Expanded Resources */}
                        {isExpanded && dept.resources && dept.resources.length > 0 && (
                          <div className="caty-dept-details">
                            <div className="caty-resource-list">
                              {dept.resources.map((resource) => (
                                <div key={resource.id} className="caty-resource-item">
                                  <div className="caty-resource-avatar">{resource.initials}</div>
                                  <div className="caty-resource-info">
                                    <div className="caty-resource-name">{resource.name}</div>
                                    <div className="caty-resource-meta">
                                      {resource.role || 'Team Member'}
                                      {resource.contractEnd && ` · Contract: ${formatContractDate(resource.contractEnd)}`}
                                    </div>
                                  </div>
                                  {resource.warningType && (
                                    <span className={cn("caty-resource-badge", resource.warningType)}>
                                      {resource.warningType === 'contract' ? 'Contract' : 'Utilization'}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isExpanded && (!dept.resources || dept.resources.length === 0) && (
                          <div className="caty-dept-details">
                            <p style={{ fontSize: 'var(--caty-font-size-md)', color: 'var(--caty-text-muted)', textAlign: 'center', padding: 'var(--caty-space-3)' }}>
                              No at-risk resources in this department
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          {messages.map((message) => (
            <div key={message.id} className={cn("caty-message", message.type === 'user' ? 'user' : 'ai')}>
              <div className="caty-message-avatar">
                {message.type === 'assistant' 
                  ? <img src={catalystLogoWhite} alt="" className="w-5 h-5" />
                  : getInitials(getUserFirstName())
                }
              </div>
              <div className="caty-message-content">
                <div className="caty-message-bubble">
                  {renderMessageContent(message.content)}
                </div>
                <div className="caty-message-time">{formatTime(message.timestamp)}</div>
                {message.type === 'assistant' && (
                  <div className="caty-message-actions">
                    <button 
                      className="caty-message-action"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy className="w-3 h-3 inline mr-1" /> Copy
                    </button>
                    <div className="caty-feedback-btns">
                      <button 
                        className={cn("caty-feedback-btn", message.feedback === 'positive' && "selected positive")}
                        onClick={() => handleFeedback(message.id, 'positive')}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button 
                        className={cn("caty-feedback-btn", message.feedback === 'negative' && "selected negative")}
                        onClick={() => handleFeedback(message.id, 'negative')}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="caty-message ai">
              <div className="caty-message-avatar">
                <img src={catalystLogoWhite} alt="" className="w-5 h-5" />
              </div>
              <div className="caty-message-content">
                <div className="caty-message-bubble">
                  <div className="caty-typing">
                    <span className="caty-typing-dot" />
                    <span className="caty-typing-dot" />
                    <span className="caty-typing-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="caty-suggestions">
          <div className="caty-suggestions-list">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSubmit(suggestion)}
                className="caty-suggestion-chip"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="caty-input-area">
          <div className="caty-input-wrap">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(inputValue);
                }
              }}
              placeholder="Ask Caty about capacity..."
              className="caty-input"
            />
            <button className="caty-input-btn mic" aria-label="Voice input">
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleSubmit(inputValue)}
              disabled={!inputValue.trim()}
              className="caty-input-btn send"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
