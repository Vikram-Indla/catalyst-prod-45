import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RaDocument, QualityBreakdown } from '@/types/requirement-assist';
import { BrdOutline, type BrdSection } from './BrdOutline';
import { AiAssistantPanel } from './AiAssistantPanel';
import { ArrowLeft, Printer } from 'lucide-react';

/* ── Demo BRD sections ── */
const DEMO_SECTIONS: { number: string; title: string; qualityGood: boolean; content: string }[] = [
  { number: '1', title: 'Executive Summary', qualityGood: true, content: 'This document outlines the business requirements for the Industrial License Application Portal, a digital platform designed to streamline the end-to-end process of applying for, reviewing, and issuing industrial licenses within the Ministry of Industry and Mineral Resources (MIM). The system will replace the current paper-based workflow, reducing processing time by an estimated 60% and improving applicant satisfaction scores.' },
  { number: '2', title: 'Business Objectives', qualityGood: true, content: 'The primary objectives are: (1) Digitize 100% of license application workflows within 12 months of deployment; (2) Reduce average processing time from 45 days to 15 days; (3) Achieve 95% applicant satisfaction rating; (4) Enable real-time status tracking for all stakeholders; (5) Ensure full compliance with Saudi Vision 2030 digital transformation mandates.' },
  { number: '3', title: 'Scope & Boundaries', qualityGood: true, content: 'In Scope: New license applications, license renewals, license amendments, inspection scheduling, fee calculation, and document management. Out of Scope: Financial accounting systems, HR management, legacy data migration from pre-2020 records, and third-party API integrations beyond the National Address API.' },
  { number: '4', title: 'Stakeholder Analysis', qualityGood: true, content: 'Primary stakeholders include: Industrial Applicants (external users submitting applications), License Officers (MIM staff reviewing and processing applications), Section Managers (supervisory approval authority), IT Operations (system maintenance and monitoring), and Compliance Officers (regulatory oversight and audit trail review).' },
  { number: '5', title: 'Functional Requirements', qualityGood: false, content: 'FR-001: The system shall allow applicants to create new license applications with all required supporting documents.\nFR-002: The system shall validate uploaded documents against the required document checklist.\nFR-003: License officers shall be able to review, approve, or reject applications with mandatory justification.\nFR-004: The system shall calculate applicable fees based on license type, duration, and factory classification.\nFR-005: Automated notifications shall be sent at each status change via email and SMS.' },
  { number: '6', title: 'Non-Functional Requirements', qualityGood: true, content: 'NFR-001: System availability of 99.5% during business hours (Sun-Thu 8AM-5PM AST). NFR-002: Page load time under 3 seconds for 95th percentile of requests. NFR-003: Support concurrent usage by up to 500 simultaneous users. NFR-004: All data encrypted at rest (AES-256) and in transit (TLS 1.3). NFR-005: Comply with NCA Essential Cybersecurity Controls.' },
  { number: '7', title: 'Data Requirements', qualityGood: true, content: 'The system shall maintain records for: applicant profiles, license applications, supporting documents, inspection reports, fee transactions, and audit logs. Data retention period: minimum 10 years per regulatory requirements. Personal data handling must comply with PDPL (Personal Data Protection Law).' },
  { number: '8', title: 'Integration Points', qualityGood: true, content: 'var(--ds-font-family-body)' },
  { number: '9', title: 'var(--ds-font-family-body)', qualityGood: true, content: 'The portal shall provide a responsive web interface supporting Arabic (RTL) and English. Design shall follow the MIM digital brand guidelines. Accessibility: WCAG 2.1 Level AA compliance. Mobile-responsive design with minimum support for Chrome, Safari, and Edge browsers.' },
  { number: '10', title: 'Security Requirements', qualityGood: true, content: 'Multi-factor authentication for all internal users. Role-based access control (RBAC) with minimum privilege principle. Session timeout after 15 minutes of inactivity. Complete audit trail for all data modifications. Annual penetration testing by certified third party.' },
  { number: '11', title: 'Business Rules', qualityGood: true, content: 'BR-001: License applications require a valid Commercial Registration (CR) number. BR-002: Renewal applications must be submitted at least 30 days before expiry. BR-003: Factory inspections are mandatory for new licenses and classification changes. BR-004: Applications with incomplete documents are automatically placed on hold for 14 days.' },
  { number: '12', title: 'Acceptance Criteria', qualityGood: false, content: 'AC-001: End-to-end application submission completes in under 20 minutes. AC-002: All required validation rules fire correctly on form submission. AC-003: Payment processing completes within 30 seconds. AC-004: Notification delivery within 5 minutes of status change.' },
  { number: '13', title: 'Assumptions & Constraints', qualityGood: true, content: 'Assumptions: Stable internet connectivity for all internal users; Absher API availability per published SLA; applicants have valid CR numbers. Constraints: Budget ceiling of SAR 2.5M for Phase 1; delivery timeline of 8 months; Arabic language support required from Day 1.' },
  { number: '14', title: 'Risk Assessment', qualityGood: true, content: 'R-001 (High): Third-party API downtime affecting application processing — Mitigation: implement circuit breaker pattern and graceful degradation. R-002 (Medium): User adoption resistance — Mitigation: phased rollout with training program. R-003 (Low): Data migration errors — Mitigation: parallel run period of 3 months.' },
  { number: '15', title: 'Implementation Roadmap', qualityGood: true, content: 'Phase 1 (Months 1-3): Core application submission and review workflow. Phase 2 (Months 4-5): Payment integration and notification system. Phase 3 (Months 6-7): Reporting, analytics, and inspection scheduling. Phase 4 (Month 8): UAT, performance testing, and go-live preparation.' },
  { number: '16', title: 'Appendices', qualityGood: true, content: 'Appendix A: Document Checklist by License Type. Appendix B: Fee Schedule. Appendix C: API Specification References. Appendix D: Glossary of Terms. Appendix E: Regulatory References (Vision 2030, PDPL, NCA ECC).' },
];

interface BrdEditorViewProps {
  document: RaDocument;
}

export function BrdEditorView({ document }: BrdEditorViewProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);

  const outlineSections: BrdSection[] = DEMO_SECTIONS.map(s => ({
    number: s.number,
    title: s.title,
    qualityGood: s.qualityGood,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[hsl(var(--border))] px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/producthub/requirement-assist')}
          className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Workspace
        </button>

        <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
          {document.brd_number}
        </span>

        <h1 className="text-base font-extrabold text-foreground flex-1 truncate">
          {document.title}
        </h1>

        <button className="h-7 px-3 text-xs font-medium text-muted-foreground bg-zinc-100 hover:bg-zinc-200 rounded-lg flex items-center gap-1.5 transition-colors">
          <Printer className="w-3 h-3" /> Print PDF
        </button>
        <button className={cn(
          'h-7 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors'
        )}>
          Push to Project ▾
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '220px 1fr 280px' }}>
        {/* Left — Outline */}
        <BrdOutline
          sections={outlineSections}
          activeIndex={activeSection}
          onSelect={setActiveSection}
        />

        {/* Center — Document */}
        <div className="bg-zinc-50 overflow-y-auto px-5 py-5">
          <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-9 max-w-[720px] mx-auto">
            {/* Cover page */}
            <div className="text-center pb-8 mb-8 border-b-2 border-[hsl(var(--border))]">
              <div className="text-[10px] font-bold font-mono uppercase tracking-[0.1em] text-blue-600 mb-3">
                {document.methodology?.toUpperCase() || 'KPMG'} ADVISORY FRAMEWORK
              </div>
              <h2 className="text-[26px] font-extrabold text-foreground leading-tight tracking-tight">
                {document.title}
              </h2>
              <p className="text-[13px] text-muted-foreground mt-3">
                Ministry of Industry · February 18, 2026 · v{document.version}.0
              </p>
            </div>

            {/* Sections */}
            {DEMO_SECTIONS.map((section, i) => (
              <div key={i} className="mb-7" id={`section-${i}`}>
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.06em] text-blue-600 mb-1">
                  Section {section.number}
                </div>
                <h3 className="text-[17px] font-extrabold text-foreground tracking-tight mb-2">
                  {section.title}
                </h3>
                <div className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — AI Assistant */}
        <AiAssistantPanel
          qualityScore={document.quality_score}
          qualityBreakdown={document.quality_breakdown}
          verdict={document.verdict}
        />
      </div>
    </div>
  );
}
