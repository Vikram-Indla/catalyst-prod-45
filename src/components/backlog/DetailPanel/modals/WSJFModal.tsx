import { useState } from 'react';
import { X } from 'lucide-react';
import { WSJFScore } from '@/types/backlog.types';

interface WSJFModalProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string;
  epicTitle: string;
  wsjfScores: WSJFScore[];
  onUpdate: (piId: string, updates: Partial<WSJFScore>) => void;
}

const WSJF_TABS = [
  { id: 'business', label: 'Set Business Value' },
  { id: 'time', label: 'Set Time Value' },
  { id: 'rroe', label: 'Set RR/OE Value' },
  { id: 'jobsize', label: 'Set Job Size' },
  { id: 'calculations', label: 'View Calculations' },
];

const WSJF_VALUES = ['', '0', '1', '2', '3', '5', '8', '13', '20', '40', '100'];

const WSJF_DESCRIPTIONS = {
  business: "Relative value in the eyes of the customer/business, including such considerations as they prefer this over that, revenue impact or any penalty (cost, market share) for slow or late delivery.",
  time: "This parameter reflects how the user value may decay (or CoD will increase) over time. Considerations include deadlines; customers wait, and the effect on customer satisfaction while the feature is not available.",
  rroe: "This last element is an aggregation of three things: 1) the need to eliminate risks early, 2) giving credit to the value of the information, and the potential for new business opportunities that might be unlocked.",
  jobsize: "If availability of resources means that a larger job may be delivered more quickly than some other job, then the job size estimate must be converted to job length to have a more accurate result. But rarely is that the case.",
};

export function WSJFModal({ isOpen, onClose, epicId, epicTitle, wsjfScores, onUpdate }: WSJFModalProps) {
  const [activeTab, setActiveTab] = useState('time');

  if (!isOpen) return null;

  const getFieldKey = (tabId: string): keyof WSJFScore => {
    switch (tabId) {
      case 'business': return 'businessValue';
      case 'time': return 'timeValue';
      case 'rroe': return 'rroeValue';
      case 'jobsize': return 'jobSize';
      default: return 'businessValue';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
      <div className="w-[900px] max-w-[95vw] max-h-[90vh] bg-background rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Weighted Shortest Job First - {WSJF_TABS.find(t => t.id === activeTab)?.label || 'Time Value'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 bg-muted">
          {WSJF_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'text-primary border-primary font-medium'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab !== 'calculations' && (
            <div className="p-6">
              {/* Epic Row with Dropdown */}
              {wsjfScores.map((score) => (
                <div key={score.piId} className="flex items-center justify-between py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-xs">⊞</div>
                    <span className="text-sm text-foreground">{epicId}</span>
                    <span className="text-sm text-foreground">{epicTitle}</span>
                    <span className="text-xs text-muted-foreground">*</span>
                  </div>
                  <select
                    value={score[getFieldKey(activeTab)] || ''}
                    onChange={(e) => onUpdate(score.piId, { [getFieldKey(activeTab)]: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
                  >
                    {WSJF_VALUES.map((val) => (
                      <option key={val} value={val}>{val || 'Select'}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Descriptions */}
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Business Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.business}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Time Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.time}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">RR/OE Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.rroe}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Job Size</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.jobsize}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calculations' && (
            <div className="p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">WSJF Calculations</h3>
              {wsjfScores.map((score) => (
                <div key={score.piId} className="p-4 mb-4 border border-border rounded-lg">
                  <div className="text-sm font-semibold text-foreground mb-2">{score.piName}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Business Value: {score.businessValue}</div>
                    <div>Time Value: {score.timeValue}</div>
                    <div>RR/OE Value: {score.rroeValue}</div>
                    <div>Job Size: {score.jobSize}</div>
                    <div className="pt-2 mt-2 border-t border-border font-semibold text-foreground">
                      WSJF Score: {score.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}