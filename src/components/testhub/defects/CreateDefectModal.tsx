import { useState, useEffect } from 'react';
import { X, Bug, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CreateDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefill?: {
    title?: string;
    description?: string;
    testCaseId?: string;
    cycleTestCaseId?: string;
    cycleId?: string;
  };
}

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#DC2626', desc: 'System crash, data loss' },
  { value: 'high', label: 'High', color: '#EA580C', desc: 'Major feature broken' },
  { value: 'medium', label: 'Medium', color: '#D97706', desc: 'Feature partially works' },
  { value: 'low', label: 'Low', color: '#059669', desc: 'Minor/cosmetic issue' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', desc: 'Fix immediately' },
  { value: 'high', label: 'High', desc: 'Fix this sprint' },
  { value: 'medium', label: 'Medium', desc: 'Fix next sprint' },
  { value: 'low', label: 'Low', desc: 'When possible' },
];

export function CreateDefectModal({ isOpen, onClose, onCreated, prefill }: CreateDefectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [priority, setPriority] = useState('medium');
  const [environment, setEnvironment] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (prefill) {
      if (prefill.title) setTitle(prefill.title);
      if (prefill.description) setDescription(prefill.description);
    }
  }, [prefill]);

  useEffect(() => {
    if (isOpen && !prefill) {
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setPriority('medium');
      setEnvironment('');
      setStepsToReproduce('');
      setExpectedResult('');
      setActualResult('');
      setAssignedTo('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (title.length > 255) newErrors.title = 'Title must be under 255 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: defect, error } = await supabase
        .from('th_defects' as any)
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          severity,
          priority,
          environment: environment.trim() || null,
          steps_to_reproduce: stepsToReproduce.trim() || null,
          expected_result: expectedResult.trim() || null,
          actual_result: actualResult.trim() || null,
          assigned_to: assignedTo || null,
          reported_by: user?.id || null,
          status: 'new',
          defect_key: '', // trigger will generate
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Create links if prefill provided
      if (defect && prefill) {
        const links: any[] = [];
        if (prefill.testCaseId) {
          links.push({
            defect_id: (defect as any).id,
            link_type: 'test_case',
            linked_id: prefill.testCaseId,
            created_by: user?.id,
          });
        }
        if (prefill.cycleTestCaseId) {
          links.push({
            defect_id: (defect as any).id,
            link_type: 'cycle_test_case',
            linked_id: prefill.cycleTestCaseId,
            created_by: user?.id,
          });
        }
        if (prefill.cycleId) {
          links.push({
            defect_id: (defect as any).id,
            link_type: 'cycle',
            linked_id: prefill.cycleId,
            created_by: user?.id,
          });
        }
        if (links.length > 0) {
          await supabase.from('th_defect_links' as any).insert(links);
        }
      }

      catalystToast.success(`Defect ${(defect as any).defect_key} created`);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Create defect error:', err);
      catalystToast.error(err.message || 'Failed to create defect');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 700, maxHeight: '90vh',
        backgroundColor: 'hsl(var(--card))', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bug size={22} style={{ color: '#FFF' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>
                Create Defect
              </h2>
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                Report a new bug or issue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, border: 'none', borderRadius: 8,
              backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
              Title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              style={{
                width: '100%', height: 44, padding: '0 14px',
                border: `1.5px solid ${errors.title ? '#EF4444' : 'hsl(var(--border))'}`,
                borderRadius: 10, fontSize: 14, backgroundColor: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
              }}
            />
            {errors.title && <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0' }}>{errors.title}</p>}
          </div>

          {/* Severity & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
                Severity
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SEVERITY_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      border: `1.5px solid ${severity === opt.value ? opt.color : 'hsl(var(--border))'}`,
                      borderRadius: 8,
                      backgroundColor: severity === opt.value ? `${opt.color}10` : 'hsl(var(--background))',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio" name="severity" value={opt.value}
                      checked={severity === opt.value}
                      onChange={(e) => setSeverity(e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${severity === opt.value ? opt.color : 'hsl(var(--border))'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {severity === opt.value && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: opt.color }} />
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: severity === opt.value ? opt.color : 'hsl(var(--foreground))' }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginLeft: 8 }}>{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: '100%', height: 44, padding: '0 12px',
                  border: '1.5px solid hsl(var(--border))', borderRadius: 10, fontSize: 14,
                  backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                  marginBottom: 12,
                }}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label} - {opt.desc}</option>
                ))}
              </select>

              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{
                  width: '100%', height: 44, padding: '0 12px',
                  border: '1.5px solid hsl(var(--border))', borderRadius: 10, fontSize: 14,
                  backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                }}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue..."
              rows={3}
              style={{
                width: '100%', padding: 14, border: '1.5px solid hsl(var(--border))',
                borderRadius: 10, fontSize: 14, resize: 'vertical',
                backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
              }}
            />
          </div>

          {/* Environment */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
              Environment
            </label>
            <input
              type="text"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="e.g., Production, Staging, Development"
              style={{
                width: '100%', height: 44, padding: '0 14px',
                border: '1.5px solid hsl(var(--border))', borderRadius: 10, fontSize: 14,
                backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
              }}
            />
          </div>

          {/* Steps to Reproduce */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
              Steps to Reproduce
            </label>
            <textarea
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder={"1. Go to...\n2. Click on...\n3. Observe that..."}
              rows={4}
              style={{
                width: '100%', padding: 14, border: '1.5px solid hsl(var(--border))',
                borderRadius: 10, fontSize: 14, resize: 'vertical', fontFamily: 'monospace',
                backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
              }}
            />
          </div>

          {/* Expected vs Actual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
                Expected Result
              </label>
              <textarea
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="What should happen..."
                rows={3}
                style={{
                  width: '100%', padding: 14, border: '1.5px solid hsl(var(--border))',
                  borderRadius: 10, fontSize: 14, resize: 'vertical',
                  backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} style={{ color: '#DC2626' }} /> Actual Result
                </span>
              </label>
              <textarea
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="What actually happened..."
                rows={3}
                style={{
                  width: '100%', padding: 14, border: '1.5px solid hsl(var(--border))',
                  borderRadius: 10, fontSize: 14, resize: 'vertical',
                  backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              height: 44, padding: '0 20px',
              backgroundColor: 'hsl(var(--background))', border: '1.5px solid hsl(var(--border))',
              borderRadius: 10, fontSize: 14, fontWeight: 500,
              color: 'hsl(var(--foreground))', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              height: 44, padding: '0 24px',
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              color: '#FFFFFF', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Bug size={16} />
            {isSubmitting ? 'Creating...' : 'Create Defect'}
          </button>
        </div>
      </div>
    </div>
  );
}
