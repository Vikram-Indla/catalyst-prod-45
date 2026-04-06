import React, { useState } from 'react';
import { Share2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCatalystUser } from '@/hooks/useJiraUserSync';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  '.Net Developer', '.Net Lead', 'Backend Architect',
  'Business Analyst', 'Data Engineer', 'DEVOPS',
  'Enterprise Architect', 'Management',
];

const DEPARTMENTS = ['Technology', 'Management', 'Operations', 'Strategy', 'Compliance'];

const CreateCatalystUserModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState('');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { mutate: createUser, isPending } = useCreateCatalystUser();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = 'Name is required';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required';
    if (!password || password.length < 8) e.password = 'Min 8 characters required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createUser(
      { displayName: displayName.trim(), email: email.trim(), password, resourceRoleId: roleId || null, catalystOnly: true },
      {
        onSuccess: () => {
          toast.success('User created. Catalyst-only account — not synced to Jira.');
          setDisplayName(''); setEmail(''); setPassword(''); setRoleId(''); setDepartment(''); setErrors({});
          onClose();
          onSuccess();
        },
        onError: (err: any) => {
          const msg = err?.message || '';
          if (msg.includes('23505') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already')) {
            setErrors(p => ({ ...p, email: 'This email is already registered in Catalyst.' }));
          } else {
            toast.error(msg || 'Failed to create user');
          }
        },
      }
    );
  };

  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED] p-0 gap-0"
        style={{ maxWidth: '460px', borderRadius: '8px' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', position: 'relative' }}>
          <DialogTitle style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700, color: 'var(--fg-1, #0F172A)', margin: 0 }}>
            Create Catalyst User
          </DialogTitle>
          <p style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
            Local account — not pushed to Jira
          </p>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '14px', right: '16px',
              width: '26px', height: '26px', borderRadius: '50%',
              border: '1px solid rgba(15,23,42,0.10)', background: 'var(--bg-app, #FFFFFF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748B',
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px' }}>
          {/* Purple info banner */}
          <div style={{
            background: '#F5F3FF', border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: '6px', padding: '9px 11px', display: 'flex', gap: '8px',
            alignItems: 'flex-start', marginBottom: '16px',
          }}>
            <Share2 size={13} style={{ color: '#7C3AED', flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '11px', color: '#7C3AED', lineHeight: 1.55 }}>
              This user will exist only in Catalyst. Jira bidirectional sync is
              excluded. They authenticate with a Catalyst-managed password.
            </span>
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Full Name <span style={{ color: '#DC2626' }}>*</span></label>
            <Input
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, displayName: '' })); }}
              placeholder="e.g. Dr. Ahmed Al-Rashid"
              className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED] !border-slate-200 dark:!border-[rgba(255,255,255,0.08)]"
              style={{ fontSize: '12px', height: '34px' }}
            />
            {errors.displayName && <span style={{ fontSize: '10px', color: '#DC2626', marginTop: '2px', display: 'block' }}>{errors.displayName}</span>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Email <span style={{ color: '#DC2626' }}>*</span></label>
            <Input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="user@moi.gov.sa"
              className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED] !border-slate-200 dark:!border-[rgba(255,255,255,0.08)]"
              style={{ fontSize: '12px', height: '34px' }}
            />
            {errors.email && <span style={{ fontSize: '10px', color: '#DC2626', marginTop: '2px', display: 'block' }}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Password <span style={{ color: '#DC2626' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                placeholder="Min 8 characters"
                className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED] !border-slate-200 dark:!border-[rgba(255,255,255,0.08)] pr-9"
                style={{ fontSize: '12px', height: '34px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--fg-3, #94A3B8)', marginTop: '2px', display: 'block' }}>
              Min 8 characters. Stored securely in Catalyst (bcrypt).
            </span>
            {errors.password && <span style={{ fontSize: '10px', color: '#DC2626', marginTop: '1px', display: 'block' }}>{errors.password}</span>}
          </div>

          {/* Role + Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Resource Role</label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED] !border-slate-200 dark:!border-[rgba(255,255,255,0.08)]" style={{ height: '34px', fontSize: '12px' }}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED]">
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r} style={{ fontSize: '12px' }}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED] !border-slate-200 dark:!border-[rgba(255,255,255,0.08)]" style={{ height: '34px', fontSize: '12px' }}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="!bg-white dark:!bg-[#1A1A1A] !text-slate-900 dark:!text-[#EDEDED]">
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d} style={{ fontSize: '12px' }}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amber warning */}
          <div style={{
            background: '#FFFBEB', border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: '4px', padding: '8px 10px',
            fontSize: '10.5px', color: '#92400E', lineHeight: 1.5,
          }}>
            ⚠ This user will be flagged catalyst_only = true and permanently excluded
            from bidirectional Jira sync. Jira will never receive this user's data.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(15,23,42,0.06)',
          background: 'var(--bg-1, #F8FAFC)', display: 'flex', gap: '8px', borderRadius: '0 0 8px 8px',
        }}>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              background: '#2563EB', color: '#FFFFFF', border: 'none',
              padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Create User
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
              border: '1px solid rgba(15,23,42,0.10)', background: 'var(--bg-app, #FFFFFF)', color: '#334155',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCatalystUserModal;
