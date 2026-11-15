import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mail, UserPlus, X } from 'lucide-react';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { ProfileInvitation, ProfileMemberRole } from '../../../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteMember: (
    email: string,
    role: ProfileMemberRole,
  ) => Promise<{ invitation: ProfileInvitation | null; error?: string }>;
  onInviteCreated: (email: string) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInviteMember,
  onInviteCreated,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProfileMemberRole>('family_member');
  const [invitation, setInvitation] = useState<ProfileInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const closeModal = () => {
    setEmail('');
    setRole('family_member');
    setInvitation(null);
    setError(null);
    setCopiedCode(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const invitedEmail = email.trim();
    if (!invitedEmail) {
      setError('Please enter the email address to invite.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onInviteMember(invitedEmail, role);
      if (result.error || !result.invitation) {
        setError(result.error || 'Failed to create invitation.');
        return;
      }

      setInvitation(result.invitation);
      onInviteCreated(invitedEmail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => {
        setCopiedCode(null);
        copyTimer.current = null;
      }, 2500);
    } catch {
      setError('Unable to copy the invitation code. Select and copy it manually.');
    }
  };

  const handleInviteAnother = () => {
    setInvitation(null);
    setEmail('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {invitation ? 'Invitation Generated!' : 'Invite Care Circle Member'}
              </h3>
              <p className="text-xs text-slate-500">
                {invitation
                  ? 'Share this secure code with your invitee'
                  : 'Generate a secure invitation code for this healthcare profile'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            aria-label="Close invitation dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {invitation ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-sage-50 border border-sage-300 text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sage-800 block">
                Secure Invitation Code
              </span>
              <div className="p-4 bg-white rounded-2xl border-2 border-sage-400 font-mono text-sm sm:text-lg font-extrabold text-slate-900 break-all">
                {invitation.invite_code}
              </div>
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={copiedCode === invitation.invite_code ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                onClick={() => void handleCopyCode(invitation.invite_code)}
                className="font-bold shadow-xs"
              >
                {copiedCode === invitation.invite_code ? 'Copied to Clipboard!' : 'Copy Invitation Code'}
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Invited Email:</span>
                <strong className="text-slate-800">{invitation.invited_email}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Assigned Role:</span>
                <strong className="text-slate-800">
                  {invitation.role === 'caretaker' ? '🩺 Caretaker' : '👨‍👩‍👧 Family Member'}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Validity:</span>
                <strong className="text-amber-700">{new Date(invitation.expires_at).toLocaleString()}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900">
              <strong>How to redeem:</strong> The invited person can enter this code during registration on CareBridge, or via the <em>"Redeem Code"</em> form in their dashboard.
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleInviteAnother}>
                Invite Another
              </Button>
              <Button type="button" variant="primary" onClick={closeModal} className="font-bold">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Invitee Email Address"
              type="email"
              placeholder="e.g. family.member@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Assign Healthcare Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('family_member')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'family_member'
                      ? 'bg-sage-50 border-sage-500 text-sage-900 ring-2 ring-sage-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold text-sm">Family Member</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Read-only health logs & appointments</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('caretaker')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'caretaker'
                      ? 'bg-brand-50 border-brand-500 text-brand-900 ring-2 ring-brand-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold text-sm">Caretaker</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Manage daily health activities & notes</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">How joining works:</span>
              <p>A unique, time-limited secure code will be created. The recipient must register or sign in with this email address to redeem it.</p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="font-bold">
                {isSubmitting ? 'Generating Invite...' : 'Generate Invitation Code'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
