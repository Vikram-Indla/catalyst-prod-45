import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RaDocument } from '@/types/requirement-assist';
import { ArrowLeft } from 'lucide-react';

/* ── Demo epics & stories ── */
interface DemoStory {
  id: string;
  name: string;
  points: number;
  asA: string;
  iWant: string;
  soThat: string;
  given: string;
  when: string;
  then: string;
  invest: { I: boolean; N: boolean; V: boolean; E: boolean; S: boolean; T: boolean };
}

interface DemoEpic {
  id: string;
  title: string;
  sourceRef: string;
  priority: 'P1' | 'P2' | 'P3';
  stories: DemoStory[];
}

const DEMO_EPICS: DemoEpic[] = [
  {
    id: 'EP-001',
    title: 'License Application Submission',
    sourceRef: 'FR-001, FR-002',
    priority: 'P1',
    stories: [
      {
        id: 'US-001', name: 'Create New Application', points: 5,
        asA: 'an industrial applicant',
        iWant: 'to submit a new license application with all required documents',
        soThat: 'I can obtain an industrial license for my factory',
        given: 'I am logged into the portal with a valid CR number',
        when: 'I fill in all required fields and upload supporting documents',
        then: 'The system creates a new application with status "Submitted" and sends a confirmation',
        invest: { I: true, N: true, V: true, E: true, S: true, T: true },
      },
      {
        id: 'US-002', name: 'Document Validation', points: 3,
        asA: 'an industrial applicant',
        iWant: 'the system to validate my uploaded documents automatically',
        soThat: 'I know immediately if any required documents are missing',
        given: 'I have uploaded documents to my application',
        when: 'I click "Validate Documents"',
        then: 'The system checks each document against the required checklist and highlights any missing items',
        invest: { I: true, N: true, V: true, E: true, S: true, T: true },
      },
    ],
  },
  {
    id: 'EP-002',
    title: 'Application Review Workflow',
    sourceRef: 'FR-003',
    priority: 'P1',
    stories: [
      {
        id: 'US-003', name: 'Review Application', points: 5,
        asA: 'a license officer',
        iWant: 'to review submitted applications with all supporting documents',
        soThat: 'I can make an informed approval or rejection decision',
        given: 'I have an application assigned to my review queue',
        when: 'I open the application and review all sections',
        then: 'I can approve, reject, or request changes with mandatory justification',
        invest: { I: true, N: true, V: true, E: true, S: true, T: true },
      },
    ],
  },
  {
    id: 'EP-003',
    title: 'Fee Calculation & Payment',
    sourceRef: 'FR-004',
    priority: 'P2',
    stories: [
      {
        id: 'US-004', name: 'Calculate Fees', points: 3,
        asA: 'an applicant',
        iWant: 'to see the calculated fees for my license application',
        soThat: 'I can prepare the payment before submission',
        given: 'I have selected the license type and duration',
        when: 'The system calculates fees based on type, duration, and factory classification',
        then: 'The fee breakdown is displayed with total amount in SAR',
        invest: { I: true, N: true, V: true, E: true, S: false, T: true },
      },
      {
        id: 'US-005', name: 'Process Payment via SADAD', points: 5,
        asA: 'an applicant',
        iWant: 'to pay license fees through SADAD integration',
        soThat: 'I can complete my application without visiting a physical office',
        given: 'The fee has been calculated and I have a SADAD account',
        when: 'I initiate payment through the portal',
        then: 'The payment is processed within 30 seconds and a receipt is generated',
        invest: { I: true, N: true, V: true, E: true, S: true, T: true },
      },
    ],
  },
  {
    id: 'EP-004',
    title: 'Notification System',
    sourceRef: 'FR-005',
    priority: 'P2',
    stories: [
      {
        id: 'US-006', name: 'Status Change Notifications', points: 2,
        asA: 'an applicant',
        iWant: 'to receive notifications when my application status changes',
        soThat: 'I stay informed throughout the process',
        given: 'My application status has changed',
        when: 'The status update is saved',
        then: 'I receive both email and SMS notifications within 5 minutes',
        invest: { I: true, N: true, V: true, E: true, S: true, T: true },
      },
    ],
  },
];

interface EpicViewProps {
  document: RaDocument;
}

export function EpicView({ document }: EpicViewProps) {
  const navigate = useNavigate();
  const [selectedEpicIdx, setSelectedEpicIdx] = useState(0);
  const selectedEpic = DEMO_EPICS[selectedEpicIdx];

  const totalStories = DEMO_EPICS.reduce((sum, e) => sum + e.stories.length, 0);
  const totalPoints = DEMO_EPICS.reduce((sum, e) => sum + e.stories.reduce((s, st) => s + st.points, 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-b border-[hsl(var(--border))] px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/producthub/requirement-assist')}
          className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Workspace
        </button>
        <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
          {document.brd_number}
        </span>
        <h1 className="text-base font-extrabold text-foreground flex-1 truncate">{document.title}</h1>
      </div>

      {/* 2-column */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* Left — Epic list */}
        <div className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-r border-[hsl(var(--border))] overflow-y-auto p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">
            {DEMO_EPICS.length} Epics · {totalStories} Stories · {totalPoints} pts
          </div>
          {DEMO_EPICS.map((epic, i) => {
            const storyCount = epic.stories.length;
            const pts = epic.stories.reduce((s, st) => s + st.points, 0);
            return (
              <button
                key={epic.id}
                onClick={() => setSelectedEpicIdx(i)}
                className={cn(
                  'w-full text-left border rounded-[10px] p-4 mb-3 transition-all',
                  selectedEpicIdx === i
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-[hsl(var(--border))] hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                )}
              >
                <div className="text-sm font-bold text-foreground">{epic.title}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{epic.sourceRef}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded',
                    epic.priority === 'P1' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {epic.priority}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{storyCount} stories</span>
                  <span className="text-[10px] text-muted-foreground">· {pts} pts</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — Story detail */}
        <div className="bg-zinc-50 overflow-y-auto p-6">
          {/* Epic header */}
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-foreground">{selectedEpic.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Source: {selectedEpic.sourceRef} · {selectedEpic.priority} · {selectedEpic.stories.length} stories · {selectedEpic.stories.reduce((s, st) => s + st.points, 0)} points
            </p>
          </div>

          {/* Stories */}
          {selectedEpic.stories.map((story) => (
            <div key={story.id} className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[hsl(var(--border))] rounded-[10px] p-[18px] mb-3">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{story.id}</span>
                <span className="text-[13px] font-bold text-foreground flex-1">{story.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{story.points} pts</span>
              </div>

              {/* Story text */}
              <div className="text-xs text-zinc-600 leading-relaxed mb-3">
                <span className="font-bold">As</span> {story.asA}, <span className="font-bold">I want to</span> {story.iWant}, <span className="font-bold">so that</span> {story.soThat}.
              </div>

              {/* Given/When/Then */}
              <div className="font-mono text-[11px] leading-[1.8] text-zinc-600 bg-zinc-50 rounded-lg p-3 mb-3">
                <div><span className="font-bold text-blue-600">Given</span> {story.given}</div>
                <div><span className="font-bold text-blue-600">When</span> {story.when}</div>
                <div><span className="font-bold text-blue-600">Then</span> {story.then}</div>
              </div>

              {/* INVEST badges */}
              <div className="flex items-center gap-1">
                {(['I', 'N', 'V', 'E', 'S', 'T'] as const).map((letter) => {
                  const passed = story.invest[letter];
                  return (
                    <span
                      key={letter}
                      className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded',
                        passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      {letter}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
