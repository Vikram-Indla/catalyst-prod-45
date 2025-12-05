import { useState, ReactNode } from 'react';
import { ChevronDown, Zap, Calendar, BarChart3, Tag, Trophy, XCircle, Wrench, Flame, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Globe, Send, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== SEEDED DATA (from specification) =====
const weeklyScores = [58, 61, 64, 67, 69, 82, 80, 74, 70, 68, 71, 72];
const weekDates = ['07-SEP', '14-SEP', '21-SEP', '28-SEP', '05-OCT', '12-OCT', '19-OCT', '26-OCT', '02-NOV', '09-NOV', '16-NOV', '23-NOV'];

const demandCardsEn = [
  { label: 'Demand Volume', metric: '47', metricStyle: 'up', headline: 'new requests this month', detail: 'Throughput healthy at 18-day average cycle. Volume up 12% from last month.' },
  { label: 'Blocked Items', metric: '17', metricStyle: 'neutral', headline: 'tickets need action', detail: '10 awaiting business response. 7 on hold with blockers.' },
  { label: 'On-Hold Risk', metric: '8.9%', metricStyle: 'down', headline: 'on-hold rate', detail: 'Above 5% target. Clearing blockers could save ~5 days per ticket.' },
  { label: 'Month-End Targets', metric: '5', metricStyle: 'neutral', headline: 'due this month', detail: '3 on track. 2 need acceleration to meet committed dates.' }
];

const demandCardsAr = [
  { label: 'حجم الطلب', metric: '47', metricStyle: 'up', headline: 'طلب جديد هذا الشهر', detail: 'الإنتاجية صحية بمعدل 18 يوم. زيادة 12% عن الشهر الماضي.' },
  { label: 'العناصر المعلقة', metric: '17', metricStyle: 'neutral', headline: 'تذاكر تحتاج إجراء', detail: '10 في انتظار رد الأعمال. 7 معلقة بعوائق.' },
  { label: 'مخاطر التعليق', metric: '8.9%', metricStyle: 'down', headline: 'معدل التعليق', detail: 'أعلى من هدف 5%. إزالة العوائق قد توفر ~5 أيام لكل تذكرة.' },
  { label: 'أهداف نهاية الشهر', metric: '5', metricStyle: 'neutral', headline: 'مستحقة هذا الشهر', detail: '3 على المسار. 2 تحتاج تسريع للوفاء بالمواعيد.' }
];

const quarterDataEn = [
  { quarter: 'Q4 2024', title: 'Q4 2024 Delivery', total: 24, onTrack: 18, atRisk: 4, delayed: 2 },
  { quarter: 'Q1 2025', title: 'Q1 2025 Pipeline', total: 45, onTrack: 32, atRisk: 8, delayed: 5 }
];

const quarterDataAr = [
  { quarter: 'Q4 2024', title: 'تسليم الربع الرابع 2024', total: 24, onTrack: 18, atRisk: 4, delayed: 2 },
  { quarter: 'Q1 2025', title: 'خط أنابيب الربع الأول 2025', total: 45, onTrack: 32, atRisk: 8, delayed: 5 }
];

const dimensionsEn = [
  { key: 'Rank Execution', score: 78 },
  { key: 'Value Realization', score: 62 },
  { key: 'Ageing Health', score: 58 },
  { key: 'On Hold Control', score: 72 },
  { key: 'Approval Efficiency', score: 85 },
  { key: 'Pipeline Balance', score: 76 },
  { key: 'Conversion Rate', score: 68 }
];

const dimensionsAr = [
  { key: 'تنفيذ الترتيب', score: 78 },
  { key: 'تحقيق القيمة', score: 62 },
  { key: 'صحة التقادم', score: 58 },
  { key: 'التحكم بالتعليق', score: 72 },
  { key: 'كفاءة الموافقة', score: 85 },
  { key: 'توازن خط الأنابيب', score: 76 },
  { key: 'معدل التحويل', score: 68 }
];

const statusesEn = [
  { name: 'Received', count: 11, color: 'bg-gray-500' },
  { name: 'Analysis', count: 17, color: 'bg-gray-400' },
  { name: 'Active', count: 31, color: 'bg-violet-500' },
  { name: 'Pending', count: 10, color: 'bg-gray-500' },
  { name: 'Reopened', count: 4, color: 'bg-amber-500' },
  { name: 'Paused', count: 7, color: 'bg-rose-400' },
  { name: 'Closed', count: 59, color: 'bg-gray-800' },
  { name: 'Done', count: 12, color: 'bg-success' }
];

const statusesAr = [
  { name: 'مستلم', count: 11, color: 'bg-gray-500' },
  { name: 'تحليل', count: 17, color: 'bg-gray-400' },
  { name: 'نشط', count: 31, color: 'bg-violet-500' },
  { name: 'معلق', count: 10, color: 'bg-gray-500' },
  { name: 'أعيد فتحه', count: 4, color: 'bg-amber-500' },
  { name: 'متوقف', count: 7, color: 'bg-rose-400' },
  { name: 'مغلق', count: 59, color: 'bg-gray-800' },
  { name: 'منجز', count: 12, color: 'bg-success' }
];

const deliveryDataEn = [
  { id: 'REQ-4401', title: 'Email Notification System', requester: 'Khalid Mansour', cycle: '21 days', value: 120, type: 'completed' },
  { id: 'REQ-4389', title: 'Report Scheduler', requester: 'Maria Santos', cycle: '18 days', value: 95, type: 'completed' },
  { id: 'REQ-4356', title: 'SSO for Partner Portal', requester: 'Ali Mahmoud', cycle: '25 days', value: 150, type: 'completed' },
  { id: 'REQ-4478', title: 'Salesforce Integration', requester: 'Omar Farouk', cycle: '14 days', value: 110, type: 'closed' },
  { id: 'REQ-4456', title: 'Security Monitoring Dashboard', requester: 'Nadia Rashid', cycle: '8 days', value: 85, type: 'closed' }
];

const deliveryDataAr = [
  { id: 'REQ-4401', title: 'نظام إشعارات البريد الإلكتروني', requester: 'خالد منصور', cycle: '21 يوم', value: 120, type: 'مكتمل' },
  { id: 'REQ-4389', title: 'جدولة التقارير', requester: 'ماريا سانتوس', cycle: '18 يوم', value: 95, type: 'مكتمل' },
  { id: 'REQ-4356', title: 'تسجيل دخول موحد لبوابة الشركاء', requester: 'علي محمود', cycle: '25 يوم', value: 150, type: 'مكتمل' },
  { id: 'REQ-4478', title: 'تكامل Salesforce', requester: 'عمر فاروق', cycle: '14 يوم', value: 110, type: 'مغلق' },
  { id: 'REQ-4456', title: 'لوحة مراقبة الأمان', requester: 'نادية راشد', cycle: '8 أيام', value: 85, type: 'مغلق' }
];

const rejectionDataEn = [
  { id: 'REQ-4312', title: 'Custom Report Builder', requester: 'Ahmed Hassan', reason: 'Duplicate', date: 'Nov 28' },
  { id: 'REQ-4298', title: 'Legacy CRM Export', requester: 'Fatima Al-Rashid', reason: 'Duplicate', date: 'Nov 25' },
  { id: 'REQ-4287', title: 'Manual Inventory Sync', requester: 'Hassan Ibrahim', reason: 'Out of scope', date: 'Nov 22' },
  { id: 'REQ-4265', title: 'Custom Theme Builder', requester: 'Layla Mohammed', reason: 'Out of scope', date: 'Nov 18' },
  { id: 'REQ-4251', title: 'Ad-hoc Notifications', requester: 'Yusuf Ahmed', reason: 'No justification', date: 'Nov 15' }
];

const rejectionDataAr = [
  { id: 'REQ-4312', title: 'منشئ التقارير المخصصة', requester: 'أحمد حسن', reason: 'مكرر', date: '28 نوفمبر' },
  { id: 'REQ-4298', title: 'تصدير نظام CRM القديم', requester: 'فاطمة الراشد', reason: 'مكرر', date: '25 نوفمبر' },
  { id: 'REQ-4287', title: 'مزامنة المخزون يدوياً', requester: 'حسن إبراهيم', reason: 'خارج النطاق', date: '22 نوفمبر' },
  { id: 'REQ-4265', title: 'منشئ القوالب المخصصة', requester: 'ليلى محمد', reason: 'خارج النطاق', date: '18 نوفمبر' },
  { id: 'REQ-4251', title: 'إشعارات فورية', requester: 'يوسف أحمد', reason: 'بدون تبرير', date: '15 نوفمبر' }
];

const recoveryDataEn = [
  { id: 'REQ-4521', rank: 1, title: 'Payment Gateway Integration', riskReason: 'This ticket has only 6 days until go-live and is still in progress. Critical delivery risk.', action: 'Start daily standups with the team. Pre-book UAT slots and ensure all dependencies are cleared immediately.' },
  { id: 'REQ-4489', rank: 2, title: 'Dashboard Performance', riskReason: 'This ticket is blocked waiting for business response for 5 days. Stakeholder delay.', action: 'Send a final reminder today. If no response by end of day, escalate directly to the project sponsor.' },
  { id: 'REQ-3421', rank: 12, title: 'Legacy System Integration', riskReason: 'This ticket has been aging for 67 days and is blocked on vendor API availability.', action: 'Get management involved to unblock the vendor dependency. Schedule a call with the vendor within 48 hours.' }
];

const recoveryDataAr = [
  { id: 'REQ-4521', rank: 1, title: 'تكامل بوابة الدفع', riskReason: 'هذه التذكرة لديها 6 أيام فقط حتى الإطلاق ولا تزال قيد التنفيذ. مخاطر تسليم حرجة.', action: 'ابدأ اجتماعات يومية مع الفريق. احجز مسبقاً فترات اختبار القبول وتأكد من إزالة جميع التبعيات فوراً.' },
  { id: 'REQ-4489', rank: 2, title: 'أداء لوحة التحكم', riskReason: 'هذه التذكرة معلقة في انتظار رد الأعمال منذ 5 أيام. تأخير من أصحاب المصلحة.', action: 'أرسل تذكيراً نهائياً اليوم. إذا لم يكن هناك رد بنهاية اليوم، صعّد مباشرة إلى راعي المشروع.' },
  { id: 'REQ-3421', rank: 12, title: 'تكامل النظام القديم', riskReason: 'هذه التذكرة قيد الانتظار منذ 67 يوماً ومعلقة على توفر واجهة برمجة المورد.', action: 'أشرك الإدارة لإزالة عائق المورد. حدد موعداً للاتصال بالمورد خلال 48 ساعة.' }
];

const trendingTicketsEn = [
  { id: 'REQ-4521', rank: 1, title: 'Payment Gateway Integration', dept: 'Operations', ageing: 14, status: 'In Progress', goLive: 6 },
  { id: 'REQ-4489', rank: 2, title: 'Dashboard Performance', dept: 'IT', ageing: 18, status: 'Awaiting Response', goLive: 11 },
  { id: 'REQ-4534', rank: 3, title: 'Mobile SSO Implementation', dept: 'Security', ageing: 8, status: 'Under Analysis', goLive: 16 }
];

const trendingTicketsAr = [
  { id: 'REQ-4521', rank: 1, title: 'تكامل بوابة الدفع', dept: 'العمليات', ageing: 14, status: 'قيد التنفيذ', goLive: 6 },
  { id: 'REQ-4489', rank: 2, title: 'أداء لوحة التحكم', dept: 'تقنية المعلومات', ageing: 18, status: 'في انتظار الرد', goLive: 11 },
  { id: 'REQ-4534', rank: 3, title: 'تنفيذ تسجيل الدخول الموحد للجوال', dept: 'الأمن', ageing: 8, status: 'قيد التحليل', goLive: 16 }
];

const attentionTicketsEn = [
  { id: 'REQ-3421', rank: 12, title: 'Legacy System Integration', dept: 'Infrastructure', ageing: 67, status: 'On Hold' },
  { id: 'REQ-3512', rank: 18, title: 'Vendor Portal Access', dept: 'Procurement', ageing: 52, status: 'Awaiting Response' }
];

const attentionTicketsAr = [
  { id: 'REQ-3421', rank: 12, title: 'تكامل النظام القديم', dept: 'البنية التحتية', ageing: 67, status: 'معلق' },
  { id: 'REQ-3512', rank: 18, title: 'الوصول لبوابة الموردين', dept: 'المشتريات', ageing: 52, status: 'في انتظار الرد' }
];

const approvedTicketsEn = [
  { id: 'REQ-4478', rank: 4, title: 'Salesforce Integration', dept: 'Sales', ageing: 14, status: 'Approved' },
  { id: 'REQ-4456', rank: 6, title: 'Security Monitoring Dashboard', dept: 'Security', ageing: 8, status: 'Approved' }
];

const approvedTicketsAr = [
  { id: 'REQ-4478', rank: 4, title: 'تكامل Salesforce', dept: 'المبيعات', ageing: 14, status: 'معتمد' },
  { id: 'REQ-4456', rank: 6, title: 'لوحة مراقبة الأمان', dept: 'الأمن', ageing: 8, status: 'معتمد' }
];

const backlogData = [
  { week: 'W1', value: 89 },
  { week: 'W2', value: 93 },
  { week: 'W3', value: 102 },
  { week: 'W4', value: 115 },
  { week: 'W5', value: 128 },
  { week: 'W6', value: 139 }
];

function getSentiment(score: number) {
  if (score >= 80) return { label: 'ON TRACK', className: 'bg-success' };
  if (score >= 60) return { label: 'MONITOR', className: 'bg-amber-500' };
  return { label: 'ACTION', className: 'bg-destructive' };
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-amber-500';
  return 'text-destructive';
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-destructive';
}

// Unified Sleek Gadget Component - Matches Performance Pulse Style
interface SleekGadgetProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  defaultOpen?: boolean;
}

function SleekGadget({ title, subtitle, icon: Icon, collapsedContent, expandedContent, defaultOpen = false }: SleekGadgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-brand-dark rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-brand-gold/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-brand-gold/20">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold" />
          </div>
          <div className="text-start">
            <h3 className="text-xs sm:text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-[10px] sm:text-xs text-white/50">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden xs:flex items-center">{collapsedContent}</div>
          <ChevronDown className={cn('w-4 h-4 sm:w-5 sm:h-5 text-white/50 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-white/10">
          {expandedContent}
        </div>
      )}
    </div>
  );
}

// Translations
const translations = {
  en: {
    greeting: 'Good Morning',
    greetingAr: 'صباح الخير',
    businessDemandSummary: 'Business Demand Summary',
    monthlyOverview: 'Monthly Overview',
    performancePulse: 'Performance Pulse',
    cpiTrend: '8-Week CPI Trend & Dimensions',
    quarterDelivery: 'Quarter Delivery Tracking',
    deliveryMilestones: 'Delivery Milestones',
    recentCompletions: 'Recent Completions',
    rejectionInsights: 'Rejection Insights',
    analysis: 'Analysis',
    recoveryPlan: 'Recovery Plan',
    actionRequired: 'Action Required',
    trendingTickets: 'Trending Tickets',
    highPriority: 'High Priority',
    requiresAttention: 'Requires Attention',
    criticalItems: 'Critical Items',
    approvedQueue: 'Approved Queue',
    readyForImplementation: 'Ready for Implementation',
    backlogTrend: 'Backlog Trend',
    sixWeekGrowth: '6-Week Growth',
    askAI: 'Ask AI',
    aiAssistant: 'AI Analytics Assistant',
    askQuestion: 'Ask a question...',
    statusOverview: 'Status Overview',
    tickets: 'tickets',
    requests: 'requests',
    total: 'Total',
    onTrack: 'On Track',
    atRisk: 'At Risk',
    delayed: 'Delayed',
    week: 'Week',
    month: 'Month',
    quarter: 'Quarter',
    year: 'Year',
    performanceDimensions: 'Performance Dimensions',
  },
  ar: {
    greeting: 'صباح الخير',
    greetingAr: 'Good Morning',
    businessDemandSummary: 'ملخص الطلب التجاري',
    monthlyOverview: 'نظرة عامة شهرية',
    performancePulse: 'نبض الأداء',
    cpiTrend: 'اتجاه مؤشر الأداء 8 أسابيع',
    quarterDelivery: 'تتبع التسليم الربع سنوي',
    deliveryMilestones: 'معالم التسليم',
    recentCompletions: 'الإنجازات الأخيرة',
    rejectionInsights: 'رؤى الرفض',
    analysis: 'التحليل',
    recoveryPlan: 'خطة الاسترداد',
    actionRequired: 'إجراء مطلوب',
    trendingTickets: 'التذاكر الرائجة',
    highPriority: 'أولوية عالية',
    requiresAttention: 'يتطلب الاهتمام',
    criticalItems: 'عناصر حرجة',
    approvedQueue: 'قائمة الانتظار المعتمدة',
    readyForImplementation: 'جاهز للتنفيذ',
    backlogTrend: 'اتجاه الأعمال المتراكمة',
    sixWeekGrowth: 'نمو 6 أسابيع',
    askAI: 'اسأل الذكاء الاصطناعي',
    aiAssistant: 'مساعد التحليلات الذكي',
    askQuestion: 'اطرح سؤالاً...',
    statusOverview: 'نظرة عامة على الحالة',
    tickets: 'تذاكر',
    requests: 'طلبات',
    total: 'الإجمالي',
    onTrack: 'على المسار',
    atRisk: 'في خطر',
    delayed: 'متأخر',
    week: 'أسبوع',
    month: 'شهر',
    quarter: 'ربع سنة',
    year: 'سنة',
    performanceDimensions: 'أبعاد الأداء',
  }
};

export default function DemandSummaryPage() {
  const [activePeriod, setActivePeriod] = useState('Month');
  const [expandedRecovery, setExpandedRecovery] = useState<string | null>(null);
  const [expandedTrending, setExpandedTrending] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isArabic, setIsArabic] = useState(false);

  const t = isArabic ? translations.ar : translations.en;
  
  // Language-specific data
  const demandCards = isArabic ? demandCardsAr : demandCardsEn;
  const quarterData = isArabic ? quarterDataAr : quarterDataEn;
  const dimensions = isArabic ? dimensionsAr : dimensionsEn;
  const statuses = isArabic ? statusesAr : statusesEn;
  const deliveryData = isArabic ? deliveryDataAr : deliveryDataEn;
  const rejectionData = isArabic ? rejectionDataAr : rejectionDataEn;
  const recoveryData = isArabic ? recoveryDataAr : recoveryDataEn;
  const trendingTickets = isArabic ? trendingTicketsAr : trendingTicketsEn;
  const attentionTickets = isArabic ? attentionTicketsAr : attentionTicketsEn;
  const approvedTickets = isArabic ? approvedTicketsAr : approvedTicketsEn;
  const userName = isArabic ? 'خالد' : 'Khalid';

  const currentScore = weeklyScores[weeklyScores.length - 1];
  const prevScore = weeklyScores[weeklyScores.length - 2];
  const trend = currentScore - prevScore;
  const sentiment = getSentiment(currentScore);

  const periodOptions = isArabic 
    ? [{ key: 'Week', label: t.week }, { key: 'Month', label: t.month }, { key: 'Quarter', label: t.quarter }, { key: 'Year', label: t.year }]
    : [{ key: 'Week', label: 'Week' }, { key: 'Month', label: 'Month' }, { key: 'Quarter', label: 'Quarter' }, { key: 'Year', label: 'Year' }];

  return (
    <div className={cn("min-h-screen bg-background", isArabic && "rtl")} style={{ fontFamily: "'Inter', sans-serif" }} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center flex-wrap gap-3 sm:gap-4">
          <div>
            <p className="text-xs text-brand-gold font-medium">{isArabic ? 'Good Morning' : 'صباح الخير'}</p>
            <h1 className="text-lg sm:text-[22px] font-bold text-foreground">{t.greeting}, <span className="text-brand-gold">{userName}</span></h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button 
              onClick={() => setIsArabic(!isArabic)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-muted border-2 border-brand-gold rounded-lg text-xs font-medium text-foreground hover:bg-brand-gold/10 transition-colors"
            >
              <Globe className="w-4 h-4 text-brand-gold" />
              <span>{isArabic ? 'EN | عربي' : 'عربي | EN'}</span>
            </button>
            <div className="flex bg-muted rounded-lg p-0.5">
              {periodOptions.map((p) => (
                <button key={p.key} onClick={() => setActivePeriod(p.key)} className={cn('px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all', activePeriod === p.key ? 'bg-brand-dark text-white' : 'text-muted-foreground hover:bg-border')}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {/* Business Demand Summary - TOP (includes Status Overview) */}
        <SleekGadget
          title={t.businessDemandSummary}
          subtitle={t.monthlyOverview}
          icon={BarChart3}
          defaultOpen={true}
          collapsedContent={
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-2 sm:px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-semibold rounded">CPI 72</span>
              <span className="text-white/60 text-[10px] sm:text-xs">47 {t.requests} • 152 {t.tickets}</span>
            </div>
          }
          expandedContent={
            <>
              {/* Demand Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-4">
                {demandCards.map((card, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-semibold text-brand-gold uppercase tracking-wider">{card.label}</span>
                      <span className="text-brand-gold text-xs cursor-pointer hover:text-brand-gold-hover">{isArabic ? '←' : '→'}</span>
                    </div>
                    <div className="text-white mb-1">
                      <span className={cn('font-mono text-lg sm:text-xl font-bold', card.metricStyle === 'up' && 'text-success', card.metricStyle === 'down' && 'text-destructive')}>{card.metric}</span>
                      <span className="text-xs sm:text-sm ms-1">{card.headline}</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-white/50">{card.detail}</p>
                  </div>
                ))}
              </div>
              
              {/* Status Overview */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{t.statusOverview}</span>
                  <span className="text-white/50 text-xs">152 {t.tickets}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statuses.map((s, i) => (
                    <div key={i} className={cn('bg-white/5 rounded-lg p-2.5 border-l-4 border border-white/10', 
                      s.color === 'bg-gray-500' ? 'border-l-gray-500' : 
                      s.color === 'bg-gray-400' ? 'border-l-gray-400' : 
                      s.color === 'bg-violet-500' ? 'border-l-violet-500' : 
                      s.color === 'bg-rose-400' ? 'border-l-rose-400' : 
                      s.color === 'bg-brand-gold' ? 'border-l-brand-gold' : 
                      s.color === 'bg-success' ? 'border-l-success' : 'border-l-destructive'
                    )}>
                      <div className="text-lg font-bold text-white">{s.count}</div>
                      <div className="text-[10px] text-white/50">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        />

        {/* Performance Pulse + CPI Combined */}
        <SleekGadget
          title={t.performancePulse}
          subtitle={t.cpiTrend}
          icon={Zap}
          collapsedContent={
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn('px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center gap-1 sm:gap-2', sentiment.className)}>
                <span className="font-mono font-bold text-white text-sm sm:text-lg">{currentScore}</span>
                <span className="text-white/80 text-[8px] sm:text-[10px] font-medium uppercase">{sentiment.label}</span>
              </div>
              <div className={cn('text-[10px] sm:text-xs font-medium', trend >= 0 ? 'text-success' : 'text-destructive')}>
                {trend >= 0 ? '+' : ''}{trend} pts
              </div>
              <div className="hidden sm:flex items-end gap-0.5 h-6">
                {weeklyScores.slice(-8).map((score, i) => {
                  const height = (score / 100) * 24;
                  const s = getSentiment(score);
                  return <div key={i} className={cn('w-1.5 rounded-sm', s.className)} style={{ height, opacity: 0.4 + (i * 0.08) }} />;
                })}
              </div>
            </div>
          }
          expandedContent={
            <>
              {/* Weekly Trend */}
              <div className="flex justify-between items-center flex-wrap gap-3 py-3 sm:py-4">
                <div className="flex gap-3 sm:gap-5 flex-wrap text-[10px] sm:text-[11px] text-white/50">
                  <span>Trending: <strong className="text-success ms-1">+1 pts</strong></span>
                  <span>Best: <strong className="text-white ms-1">19-OCT (82)</strong></span>
                  <span>Lowest: <strong className="text-white ms-1">16-NOV (68)</strong></span>
                </div>
              </div>
              <div className="flex items-end justify-center gap-0.5 sm:gap-1 mb-4 overflow-x-auto pb-2">
                {weeklyScores.slice(-8).map((score, index) => {
                  const totalWeeks = 8; const minSize = 40; const maxSize = 70;
                  const size = minSize + ((maxSize - minSize) / (totalWeeks - 1)) * index;
                  const isCurrentWeek = index === totalWeeks - 1;
                  const opacity = isCurrentWeek ? 1.0 : (0.45 + (0.45 * (index / (totalWeeks - 1))));
                  const s = getSentiment(score);
                  const dateIndex = weekDates.length - totalWeeks + index;
                  return (
                    <div key={index} className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105 flex-shrink-0" style={{ width: size, height: size + 16, opacity }}>
                      <span className="text-[7px] sm:text-[8px] font-semibold mb-1 text-white/40">{weekDates[dateIndex]}</span>
                      <div className={cn('rounded-lg flex flex-col items-center justify-center', s.className)} style={{ width: size, height: size, border: isCurrentWeek ? '2px solid white' : 'none' }}>
                        <span className="font-mono font-bold text-white" style={{ fontSize: size * 0.28 }}>{score}</span>
                        <span className="text-white font-semibold uppercase" style={{ fontSize: size * 0.11 }}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* CPI Dimensions */}
              <div className="border-t border-white/10 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-[10px] sm:text-xs font-semibold text-white/70 uppercase tracking-wider">{t.performanceDimensions}</span>
                  <div className="flex items-center gap-2">
                    <div className="text-xl sm:text-2xl font-bold text-white">72</div>
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded">AMBER</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {dimensions.map((d, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2 sm:p-2.5 border border-white/10">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] sm:text-[10px] text-white/50 truncate">{d.key}</span>
                        <span className={cn('font-mono text-[10px] sm:text-xs font-bold', getScoreColor(d.score))}>{d.score}</span>
                      </div>
                      <div className="h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', getScoreBg(d.score))} style={{ width: `${d.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        />

        {/* Quarter Delivery Tracking */}
        <SleekGadget
          title={t.quarterDelivery}
          subtitle="Q4 2024 & Q1 2025"
          icon={Calendar}
          collapsedContent={
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-white/60 text-[10px] sm:text-xs">69 {t.total.toLowerCase()}</span>
              <div className="hidden sm:flex items-center gap-1">
                <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded">50 {t.onTrack.toLowerCase()}</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded">12 {t.atRisk.toLowerCase()}</span>
              </div>
            </div>
          }
          expandedContent={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-4">
              {quarterData.map((q, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                  <h4 className="font-semibold text-[13px] sm:text-[14px] text-white mb-3">{q.title}</h4>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <div className="text-center p-1.5 sm:p-2 bg-white/5 rounded"><div className="text-base sm:text-lg font-bold text-white">{q.total}</div><div className="text-[9px] sm:text-[10px] text-white/50">{t.total}</div></div>
                    <div className="text-center p-1.5 sm:p-2 bg-success/20 rounded"><div className="text-base sm:text-lg font-bold text-success">{q.onTrack}</div><div className="text-[9px] sm:text-[10px] text-success">{t.onTrack}</div></div>
                    <div className="text-center p-1.5 sm:p-2 bg-amber-500/20 rounded"><div className="text-base sm:text-lg font-bold text-amber-400">{q.atRisk}</div><div className="text-[9px] sm:text-[10px] text-amber-400">{t.atRisk}</div></div>
                    <div className="text-center p-1.5 sm:p-2 bg-destructive/20 rounded"><div className="text-base sm:text-lg font-bold text-destructive">{q.delayed}</div><div className="text-[9px] sm:text-[10px] text-destructive">{t.delayed}</div></div>
                  </div>
                </div>
              ))}
            </div>
          }
        />


        {/* Delivery Milestones */}
        <SleekGadget
          title={t.deliveryMilestones}
          subtitle={t.recentCompletions}
          icon={Trophy}
          collapsedContent={
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded">{isArabic ? '3 منفذ' : '3 implemented'}</span>
              <span className="px-2 py-0.5 bg-brand-gold/20 text-brand-gold text-[10px] font-medium rounded">{isArabic ? '2 معتمد' : '2 approved'}</span>
            </div>
          }
          expandedContent={
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'المعرف' : 'ID'}</th>
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'الملخص' : 'Summary'}</th>
                    <th className="hidden sm:table-cell text-start py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'مقدم الطلب' : 'Requested By'}</th>
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'القيمة' : 'Value'}</th>
                    <th className="hidden sm:table-cell text-start py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'الدورة' : 'Cycle'}</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryData.map((d, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-1.5 sm:px-2">
                        <span className={cn('px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium', (d.type === 'implemented' || d.type === 'منفذ') ? 'bg-success/20 text-success' : 'bg-brand-gold/20 text-brand-gold')}>{d.type}</span>
                      </td>
                      <td className="py-2 px-1.5 sm:px-2 font-mono text-[10px] text-brand-gold">{d.id}</td>
                      <td className="py-2 px-1.5 sm:px-2 text-white text-xs">{d.title}</td>
                      <td className="hidden sm:table-cell py-2 px-2 text-white/60 text-xs">{d.requester}</td>
                      <td className="py-2 px-1.5 sm:px-2 font-mono text-white text-xs">{d.value}</td>
                      <td className="hidden sm:table-cell py-2 px-2 text-white/60 text-xs">{d.cycle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />

        {/* Rejection Insights */}
        <SleekGadget
          title={t.rejectionInsights}
          subtitle={t.analysis}
          icon={XCircle}
          collapsedContent={
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">{isArabic ? '5 مرفوض' : '5 rejected'}</span>
              <span className="text-white/60 text-[10px]">{isArabic ? 'معدل 8.5%' : '8.5% rate'}</span>
            </div>
          }
          expandedContent={
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'المعرف' : 'ID'}</th>
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'العنوان' : 'Title'}</th>
                    <th className="hidden sm:table-cell text-start py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'مقدم الطلب' : 'Requester'}</th>
                    <th className="text-start py-2 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'السبب' : 'Reason'}</th>
                    <th className="hidden sm:table-cell text-start py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">{isArabic ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectionData.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-1.5 sm:px-2 font-mono text-[10px] text-brand-gold">{r.id}</td>
                      <td className="py-2 px-1.5 sm:px-2 text-white text-xs">{r.title}</td>
                      <td className="hidden sm:table-cell py-2 px-2 text-white/60 text-xs">{r.requester}</td>
                      <td className="py-2 px-1.5 sm:px-2"><span className="px-1.5 sm:px-2 py-0.5 bg-destructive/20 text-destructive rounded text-[9px] sm:text-[10px] font-medium">{r.reason}</span></td>
                      <td className="hidden sm:table-cell py-2 px-2 text-white/60 text-xs">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />

        {/* Recovery Plan */}
        <SleekGadget
          title={t.recoveryPlan}
          subtitle={t.actionRequired}
          icon={Wrench}
          collapsedContent={
            <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">3 {t.atRisk.toLowerCase()}</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {recoveryData.map((r) => (
                <div key={r.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedRecovery(expandedRecovery === r.id ? null : r.id)} className="w-full flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-white/5 text-start">
                    <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive text-[10px] font-bold rounded">#{r.rank}</span>
                    <span className="font-mono text-[10px] text-brand-gold">{r.id}</span>
                    <span className="font-medium text-white flex-1 text-xs">{r.title}</span>
                    <ChevronDown className={cn('w-4 h-4 text-white/50 transition-transform', expandedRecovery === r.id && 'rotate-180')} />
                  </button>
                  {expandedRecovery === r.id && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-white/5 border-t border-white/10">
                      <div className="mb-3 pt-3">
                        <div className="text-[10px] font-semibold text-white/50 uppercase mb-1">{isArabic ? 'سبب المخاطرة' : 'Risk Reason'}</div>
                        <p className="text-xs text-white/70">{r.riskReason}</p>
                      </div>
                      <div className="bg-brand-gold/10 rounded-lg p-2.5 sm:p-3 border-s-4 border-brand-gold">
                        <div className="text-[10px] font-semibold text-brand-gold uppercase mb-1">{isArabic ? 'الإجراء الموصى به' : 'Recommended Action'}</div>
                        <p className="text-xs text-white">{r.action}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        />

        {/* Trending Tickets */}
        <SleekGadget
          title={t.trendingTickets}
          subtitle={t.highPriority}
          icon={Flame}
          collapsedContent={
            <span className="text-white/60 text-[10px] sm:text-xs">Top 3</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {trendingTickets.map((ticket) => (
                <div key={ticket.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedTrending(expandedTrending === ticket.id ? null : ticket.id)} className="w-full flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-white/5 text-start">
                    <span className="px-1.5 py-0.5 bg-brand-gold/20 text-brand-gold text-[10px] font-bold rounded">#{ticket.rank}</span>
                    <span className="font-mono text-[10px] text-brand-gold">{ticket.id}</span>
                    <span className="font-medium text-white flex-1 text-xs">{ticket.title}</span>
                    <ChevronDown className={cn('w-4 h-4 text-white/50 transition-transform', expandedTrending === ticket.id && 'rotate-180')} />
                  </button>
                  {expandedTrending === ticket.id && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-white/5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3">
                      <div><div className="text-[9px] sm:text-[10px] text-white/50">{isArabic ? 'القسم' : 'Department'}</div><div className="text-xs font-medium text-white">{ticket.dept}</div></div>
                      <div><div className="text-[9px] sm:text-[10px] text-white/50">{isArabic ? 'التقادم' : 'Ageing'}</div><div className="text-xs font-medium text-white">{ticket.ageing} {isArabic ? 'يوم' : 'days'}</div></div>
                      <div><div className="text-[9px] sm:text-[10px] text-white/50">{isArabic ? 'الإطلاق' : 'Go-Live'}</div><div className="text-xs font-medium text-destructive">{ticket.goLive} {isArabic ? 'يوم' : 'days'}</div></div>
                      <div><div className="text-[9px] sm:text-[10px] text-white/50">{isArabic ? 'الحالة' : 'Status'}</div><div className="text-xs font-medium text-white">{ticket.status}</div></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        />

        {/* Requires Attention */}
        <SleekGadget
          title={t.requiresAttention}
          subtitle={t.criticalItems}
          icon={AlertTriangle}
          collapsedContent={
            <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">2 critical</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {attentionTickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-destructive/10 rounded-lg border border-destructive/20">
                  <span className="px-1.5 py-0.5 bg-white/10 text-destructive text-[10px] font-bold rounded">#{ticket.rank}</span>
                  <span className="font-mono text-[10px] text-brand-gold">{ticket.id}</span>
                  <span className="font-medium text-white flex-1 text-xs">{ticket.title}</span>
                  <span className="text-[10px] text-white/60">{ticket.dept}</span>
                  <span className="text-[10px] font-bold text-destructive">{ticket.ageing} {isArabic ? 'يوم' : 'days'}</span>
                </div>
              ))}
            </div>
          }
        />

        {/* Approved Queue */}
        <SleekGadget
          title={t.approvedQueue}
          subtitle={t.readyForImplementation}
          icon={CheckCircle}
          collapsedContent={
            <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded">2 {isArabic ? 'جاهز' : 'ready'}</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {approvedTickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-success/10 rounded-lg border border-success/20">
                  <span className="px-1.5 py-0.5 bg-white/10 text-success text-[10px] font-bold rounded">#{ticket.rank}</span>
                  <span className="font-mono text-[10px] text-brand-gold">{ticket.id}</span>
                  <span className="font-medium text-white flex-1 text-xs">{ticket.title}</span>
                  <span className="text-[10px] text-white/60">{ticket.dept}</span>
                  <span className="text-[10px] font-bold text-success">{ticket.ageing} {isArabic ? 'يوم' : 'days'}</span>
                </div>
              ))}
            </div>
          }
        />

        {/* Backlog Trend */}
        <SleekGadget
          title={t.backlogTrend}
          subtitle={t.sixWeekGrowth}
          icon={TrendingUp}
          collapsedContent={
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">139</span>
              <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">+56%</span>
            </div>
          }
          expandedContent={
            <div className="pt-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl sm:text-4xl font-bold text-white">139</div>
                <div>
                  <div className="text-xs font-medium text-destructive">{isArabic ? '+56% خلال 6 أسابيع' : '+56% over 6 weeks'}</div>
                  <div className="text-[10px] text-white/50">{isArabic ? 'من 89 ← 139' : 'From 89 → 139'}</div>
                </div>
              </div>
              <div className="flex items-end gap-1 sm:gap-2 h-24 sm:h-32">
                {backlogData.map((b, i) => {
                  const maxVal = Math.max(...backlogData.map(d => d.value));
                  const height = (b.value / maxVal) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-brand-gold rounded-t" style={{ height: `${height}%` }} />
                      <div className="text-[9px] sm:text-[10px] text-white/50 mt-1">{isArabic ? `أ${i + 1}` : b.week}</div>
                      <div className="text-[10px] font-medium text-white">{b.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          }
        />
      </main>

      {/* AI Chat Button */}
      <button 
        onClick={() => setChatOpen(true)} 
        className={cn(
          "fixed bottom-4 sm:bottom-6 bg-brand-gold text-brand-dark px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg hover:bg-brand-gold-hover hover:scale-105 transition-all z-50",
          isArabic ? "left-4 sm:left-6" : "right-4 sm:right-6"
        )}
      >
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base">{t.askAI}</span>
      </button>

      {/* AI Chat Panel */}
      {chatOpen && (
        <div className={cn(
          "fixed inset-y-0 w-full sm:w-[400px] bg-brand-dark shadow-2xl z-50 flex flex-col",
          isArabic ? "left-0 border-e border-brand-gold/20" : "right-0 border-s border-brand-gold/20"
        )}>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              <span className="font-semibold text-white text-sm sm:text-base">{t.aiAssistant}</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-1.5 hover:bg-white/10 rounded">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white/5 text-white rounded-lg p-3 mb-4 text-sm border border-white/10">
              {isArabic 
                ? 'مرحبًا! أنا مساعدك التحليلي. يمكنني مساعدتك في فهم مقاييس لوحة التحكم، وتحديد المخاطر، واقتراح الإجراءات. ماذا تريد أن تعرف؟'
                : "Hello! I'm your analytics assistant. I can help you understand your dashboard metrics, identify risks, and suggest actions. What would you like to know?"
              }
            </div>
            <div className="space-y-2 mb-4">
              {(isArabic 
                ? ['لماذا تغير مؤشر الأداء هذا الأسبوع؟', 'ما هي التذاكر الأكثر عرضة للخطر؟', 'على ماذا يجب أن أركز اليوم؟', 'اشرح نمو الأعمال المتراكمة']
                : ['Why did CPI change this week?', 'Which tickets are most at risk?', 'What should I focus on today?', 'Explain the backlog growth']
              ).map((q, i) => (
                <button key={i} className="w-full text-start px-3 py-2 bg-white/5 rounded-lg text-sm text-white/70 hover:bg-brand-gold/10 hover:text-white transition-colors border border-white/10">
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 sm:p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={t.askQuestion}
                className="flex-1 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
              />
              <button className="px-3 sm:px-4 py-2 bg-brand-gold text-brand-dark rounded-lg hover:bg-brand-gold-hover transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
