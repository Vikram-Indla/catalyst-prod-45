// ════════════════════════════════════════════════════════════════════════════
// ADD MEMBER MODAL
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { useAddMember } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { MEMBER_ROLE_CONFIG } from '@/lib/space-constants';
import type { MemberRole } from '@/types/spaces';

export function AddMemberModal() {
  const { id: spaceId } = useParams<{ id: string }>();
  const { isAddMemberModalOpen, closeAddMemberModal } = useSpaceStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');

  const addMember = useAddMember();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !email.trim()) return;

    addMember.mutate(
      { spaceId, input: { user_email: email.trim(), role } },
      {
        onSuccess: () => {
          closeAddMemberModal();
          setEmail('');
          setRole('member');
        },
      }
    );
  };

  if (!isAddMemberModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={closeAddMemberModal} />
      
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Member</h2>
          <button
            onClick={closeAddMemberModal}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="user@example.com"
                autoFocus
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <div className="space-y-2">
              {(Object.keys(MEMBER_ROLE_CONFIG) as MemberRole[]).map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    role === r ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">
                      {MEMBER_ROLE_CONFIG[r].label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r === 'administrator' && 'Full access to all settings and data'}
                      {r === 'member' && 'Can create and edit work items'}
                      {r === 'viewer' && 'Can view but not modify anything'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeAddMemberModal}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || addMember.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
