import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RaDocument } from '@/types/requirement-assist';
import { AiAssistantPanel } from './AiAssistantPanel';
import { ArrowLeft } from 'lucide-react';

/* ── Demo translation sections ── */
const DEMO_SECTIONS = [
  {
    arabic: 'الملخص التنفيذي\n\nيوضح هذا المستند متطلبات العمل لبوابة تطبيق الرخصة الصناعية، وهي منصة رقمية مصممة لتبسيط عملية التقديم والمراجعة وإصدار الرخص الصناعية.',
    english: 'Executive Summary\n\nThis document outlines the business requirements for the Industrial License Application Portal, a digital platform designed to streamline the end-to-end process of applying for, reviewing, and issuing industrial licenses.',
    title: { ar: 'الملخص التنفيذي', en: 'Executive Summary' },
    glossaryTerms: ['Industrial License', 'Ministry of Industry'],
  },
  {
    arabic: 'أهداف العمل\n\nرقمنة ١٠٠٪ من سير عمل طلبات الترخيص خلال ١٢ شهرًا من النشر. تقليل متوسط وقت المعالجة من ٤٥ يومًا إلى ١٥ يومًا.',
    english: 'Business Objectives\n\nDigitize 100% of license application workflows within 12 months of deployment. Reduce average processing time from 45 days to 15 days.',
    title: { ar: 'أهداف العمل', en: 'Business Objectives' },
    glossaryTerms: ['license application', 'processing time'],
  },
  {
    arabic: 'النطاق والحدود\n\nيشمل النطاق: طلبات الرخص الجديدة، تجديد الرخص، تعديل الرخص، جدولة التفتيش، حساب الرسوم، وإدارة المستندات.',
    english: 'Scope & Boundaries\n\nIn Scope: New license applications, license renewals, license amendments, inspection scheduling, fee calculation, and document management.',
    title: { ar: 'النطاق والحدود', en: 'Scope & Boundaries' },
    glossaryTerms: ['license renewals', 'inspection scheduling', 'fee calculation'],
  },
  {
    arabic: 'المتطلبات الوظيفية\n\nيجب أن يسمح النظام لمقدمي الطلبات بإنشاء طلبات ترخيص جديدة مع جميع المستندات الداعمة المطلوبة. يجب أن يتحقق النظام من صحة المستندات المرفوعة.',
    english: 'Functional Requirements\n\nThe system shall allow applicants to create new license applications with all required supporting documents. The system shall validate uploaded documents against the required document checklist.',
    title: { ar: 'المتطلبات الوظيفية', en: 'Functional Requirements' },
    glossaryTerms: ['license applications', 'document checklist'],
  },
  {
    arabic: 'متطلبات الأمان\n\nمصادقة متعددة العوامل لجميع المستخدمين الداخليين. التحكم في الوصول القائم على الأدوار مع مبدأ أقل الامتيازات.',
    english: 'Security Requirements\n\nMulti-factor authentication for all internal users. Role-based access control (RBAC) with minimum privilege principle.',
    title: { ar: 'متطلبات الأمان', en: 'Security Requirements' },
    glossaryTerms: ['Role-based access control', 'multi-factor authentication'],
  },
];

function highlightGlossary(text: string, terms: string[]) {
  if (!terms.length) return text;
  const parts: (string | { term: string })[] = [];
  let remaining = text;
  for (const term of terms) {
    const idx = remaining.toLowerCase().indexOf(term.toLowerCase());
    if (idx !== -1) {
      if (idx > 0) parts.push(remaining.slice(0, idx));
      parts.push({ term: remaining.slice(idx, idx + term.length) });
      remaining = remaining.slice(idx + term.length);
    }
  }
  if (remaining) parts.push(remaining);
  return parts;
}

interface TranslationViewProps {
  document: RaDocument;
}

export function TranslationView({ document }: TranslationViewProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[hsl(var(--border))] px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/producthub/requirement-assist')}
          className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Workspace
        </button>
        <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700">
          {document.brd_number}
        </span>
        <h1 className="text-base font-extrabold text-foreground flex-1 truncate">{document.title}</h1>
      </div>

      {/* 2-column + AI panel */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 1fr 280px' }}>
        {/* Arabic column */}
        <div className="bg-zinc-50 border-r border-[hsl(var(--border))] overflow-y-auto p-6" dir="rtl">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-4">
            🇸🇦 Arabic Original
          </div>
          {DEMO_SECTIONS.map((sec, i) => (
            <div key={i} className="bg-zinc-25 border border-[hsl(var(--border))] rounded-lg p-4 mb-5">
              <h4 className="text-[15px] font-bold text-foreground mb-2">{sec.title.ar}</h4>
              <p className="text-[13px] text-zinc-600 leading-[1.7] whitespace-pre-line">{sec.arabic.split('\n').slice(2).join('\n')}</p>
            </div>
          ))}
        </div>

        {/* English column */}
        <div className="bg-white overflow-y-auto p-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-4">
            🇬🇧 English Translation
          </div>
          {DEMO_SECTIONS.map((sec, i) => (
            <div key={i} className="border border-[hsl(var(--border))] rounded-lg p-4 mb-5">
              <h4 className="text-[15px] font-bold text-foreground mb-2">{sec.title.en}</h4>
              <p className="text-[13px] text-zinc-600 leading-[1.7] whitespace-pre-line">
                {(() => {
                  const content = sec.english.split('\n').slice(2).join('\n');
                  const parts = highlightGlossary(content, sec.glossaryTerms);
                  if (typeof parts === 'string') return parts;
                  return parts.map((part, j) =>
                    typeof part === 'string' ? (
                      <span key={j}>{part}</span>
                    ) : (
                      <span
                        key={j}
                        className="bg-teal-50 border border-teal-500/20 rounded px-1 font-semibold"
                        style={{ color: 'var(--cap-translate)' }}
                      >
                        {part.term}
                      </span>
                    )
                  );
                })()}
              </p>
            </div>
          ))}
        </div>

        {/* AI Panel */}
        <AiAssistantPanel
          qualityScore={document.quality_score}
          qualityBreakdown={document.quality_breakdown}
          verdict={document.verdict}
        />
      </div>
    </div>
  );
}
