import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RaDocument } from '@/types/requirement-assist';
import { CoverageMatrix } from './CoverageMatrix';
import { ArrowLeft } from 'lucide-react';

/* ── Demo UAT scenarios ── */
interface UatStep {
  num: number;
  action: string;
  expected: string;
}

interface UatScenario {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  preconditions: string;
  steps: UatStep[];
  traceability: string;
}

const DEMO_SCENARIOS: UatScenario[] = [
  {
    id: 'SC-001',
    title: 'Submit New License Application',
    priority: 'High',
    preconditions: 'User is logged in with valid CR number. All required documents are prepared in PDF format.',
    steps: [
      { num: 1, action: 'Navigate to "New Application" page', expected: 'Application form loads with all required fields' },
      { num: 2, action: 'Fill in applicant details and factory information', expected: 'Fields accept valid input and validate in real-time' },
      { num: 3, action: 'Upload required documents (CR, factory plan, EIA report)', expected: 'Documents upload successfully with progress indicator' },
      { num: 4, action: 'Click "Submit Application"', expected: 'Application is created with status "Submitted" and confirmation number is displayed' },
      { num: 5, action: 'Check email for confirmation', expected: 'Confirmation email received within 5 minutes with application details' },
    ],
    traceability: 'FR-001, FR-002',
  },
  {
    id: 'SC-002',
    title: 'Review and Approve Application',
    priority: 'High',
    preconditions: 'License officer is logged in. At least one application is in "Submitted" status in the review queue.',
    steps: [
      { num: 1, action: 'Open the review queue', expected: 'Queue displays all pending applications sorted by date' },
      { num: 2, action: 'Select an application for review', expected: 'Full application details and documents are displayed' },
      { num: 3, action: 'Review each section and document', expected: 'All sections are accessible and documents render correctly' },
      { num: 4, action: 'Click "Approve" and enter justification', expected: 'Application status changes to "Approved" and justification is saved' },
    ],
    traceability: 'FR-003',
  },
  {
    id: 'SC-003',
    title: 'Calculate and Process Fees',
    priority: 'Medium',
    preconditions: 'Application is approved. Applicant has a SADAD account linked.',
    steps: [
      { num: 1, action: 'Navigate to payment section', expected: 'Fee breakdown is displayed with correct amounts' },
      { num: 2, action: 'Verify fee calculation matches schedule', expected: 'Fees match the published fee schedule for license type and duration' },
      { num: 3, action: 'Initiate SADAD payment', expected: 'Payment gateway loads and processes within 30 seconds' },
      { num: 4, action: 'Complete payment', expected: 'Receipt is generated and application status updates to "Paid"' },
    ],
    traceability: 'FR-004',
  },
  {
    id: 'SC-004',
    title: 'Notification Delivery',
    priority: 'Medium',
    preconditions: 'Application status has just changed. Applicant has valid email and phone.',
    steps: [
      { num: 1, action: 'Trigger a status change on an application', expected: 'System queues notification for delivery' },
      { num: 2, action: 'Check email inbox', expected: 'Email notification received within 5 minutes' },
      { num: 3, action: 'Check SMS on registered phone', expected: 'SMS notification received within 5 minutes' },
    ],
    traceability: 'FR-005',
  },
  {
    id: 'SC-005',
    title: 'System Performance Under Load',
    priority: 'High',
    preconditions: 'Load testing environment configured with 500 simulated users.',
    steps: [
      { num: 1, action: 'Simulate 500 concurrent users accessing the portal', expected: 'System remains responsive with no errors' },
      { num: 2, action: 'Measure page load times across all pages', expected: '95th percentile load time under 3 seconds' },
      { num: 3, action: 'Verify system uptime during test period', expected: 'No downtime or service degradation observed' },
    ],
    traceability: 'NFR-001, NFR-002',
  },
  {
    id: 'SC-006',
    title: 'Data Encryption Verification',
    priority: 'High',
    preconditions: 'Access to database and network monitoring tools.',
    steps: [
      { num: 1, action: 'Submit an application with sensitive data', expected: 'Data is stored encrypted (AES-256) in the database' },
      { num: 2, action: 'Monitor network traffic during submission', expected: 'All traffic uses TLS 1.3 encryption' },
    ],
    traceability: 'NFR-004',
  },
];

interface UatViewProps {
  document: RaDocument;
}

export function UatView({ document }: UatViewProps) {
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
        <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
          {document.brd_number}
        </span>
        <h1 className="text-base font-extrabold text-foreground flex-1 truncate">{document.title}</h1>
      </div>

      {/* 2-column */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Left — Scenarios */}
        <div className="overflow-y-auto p-6 space-y-3">
          {DEMO_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="bg-white border border-[hsl(var(--border))] rounded-[10px] p-[18px]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                  {scenario.id}
                </span>
                <span className="text-sm font-bold text-foreground flex-1">{scenario.title}</span>
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded',
                  scenario.priority === 'High' ? 'bg-red-50 text-red-600' :
                  scenario.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                  'bg-zinc-100 text-zinc-600'
                )}>
                  {scenario.priority}
                </span>
              </div>

              {/* Preconditions */}
              <div className="bg-zinc-50 rounded-lg p-3 mb-3">
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Preconditions</div>
                <div className="text-xs text-zinc-600">{scenario.preconditions}</div>
              </div>

              {/* Steps table */}
              <table className="w-full text-[11px] mb-3">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground w-8">#</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Action</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.steps.map((step) => (
                    <tr key={step.num} className="border-b border-[hsl(var(--border))] last:border-0">
                      <td className="py-1.5 px-2 font-mono text-zinc-400">{step.num}</td>
                      <td className="py-1.5 px-2 text-zinc-700">{step.action}</td>
                      <td className="py-1.5 px-2 text-zinc-600">{step.expected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Traceability */}
              <div className="text-[11px]">
                <span className="text-muted-foreground">Traces to: </span>
                <span className="text-blue-600 font-mono font-semibold">{scenario.traceability}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right — Coverage Matrix */}
        <CoverageMatrix />
      </div>
    </div>
  );
}
