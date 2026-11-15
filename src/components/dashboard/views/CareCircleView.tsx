import React, { useState } from 'react';
import { 
  UserPlus, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  UserX, 
  Copy, 
  Check, 
  AlertCircle, 
  Lock, 
  X,
  Ticket,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Input } from '../../common/Input';
import { ProfileMember, ProfileMemberRole, ProfileInvitation } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

export const CareCircleView: React.FC = () => {
  const { 
    user, 
    elderlyProfile, 
    members, 
    pendingInvitations, 
    isOwner, 
    canManageMembers, 
    canRevokeMember, 
    inviteMember, 
    revokeMember,
    isLoading,
    error: profileDataError,
  } = useAuth();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProfileMemberRole>('family_member');
  const [createdInvite, setCreatedInvite] = useState<ProfileInvitation | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Revocation confirmation state
  const [memberToRevoke, setMemberToRevoke] = useState<ProfileMember | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!inviteEmail.trim()) {
      setActionError('Please enter the email address to invite.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inviteMember(inviteEmail.trim(), inviteRole);
      if (res.error || !res.invitation) {
        setActionError(res.error || 'Failed to create invitation.');
      } else {
        setCreatedInvite(res.invitation);
        setActionSuccess(`Invitation generated successfully for ${inviteEmail.trim()}`);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setCreatedInvite(null);
    setInviteEmail('');
  };

  const handleConfirmRevoke = async () => {
    if (!memberToRevoke) return;
    if (!canRevokeMember) {
      setActionError('Unauthorized: Only the Elderly Profile Owner can revoke members.');
      setMemberToRevoke(null);
      return;
    }

    setIsRevoking(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await revokeMember(memberToRevoke.id);
      if (res.success) {
        setActionSuccess(`Access revoked for ${memberToRevoke.member_name || memberToRevoke.member_email}. Their profile permissions have been invalidated.`);
        setMemberToRevoke(null);
      } else {
        setActionError(res.error || 'Failed to revoke member access.');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to revoke member access.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setActionError('Unable to copy the invitation code. Select and copy it manually.');
    }
  };

  const activeMembers = members.filter(m => m.status === 'active');
  const revokedMembers = members.filter(m => m.status === 'revoked');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Care Circle & Role Management
          </h1>
          <p className="text-base text-slate-500 font-normal">
            Authorized family members and caretakers connected to {elderlyProfile ? elderlyProfile.full_name : 'the profile'}.
          </p>
        </div>

        {canManageMembers ? (
          <Button
            variant="primary"
            size="md"
            icon={<UserPlus className="w-5 h-5" />}
            onClick={() => {
              setCreatedInvite(null);
              setShowInviteModal(true);
            }}
            className="shadow-sm font-bold"
          >
            Invite Member
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Member management restricted to Profile Owner</span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-sage-50 border border-sage-300 text-sm text-sage-800 font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-sage-600 hover:text-sage-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {profileDataError && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{profileDataError}</span>
        </div>
      )}

      {/* Permissions and Role Overview Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Role Permission Architecture (Enforced by Database Policies)
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
            Current User: {user?.role === 'elderly' ? 'Elderly Individual (Profile Owner)' : user?.role === 'caretaker' ? 'Caretaker' : 'Family Member'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
            <p className="font-bold text-purple-900">👴 Profile Owner (Elderly)</p>
            <p className="text-purple-700 mt-1">Full control over healthcare profile, issue new member invite codes, and revoke member permissions.</p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50/70 border border-brand-200">
            <p className="font-bold text-brand-900">🩺 Caretaker</p>
            <p className="text-brand-700 mt-1">Access and manage permitted daily healthcare activities, dose records, and routine tracking.</p>
          </div>
          <div className="p-3 rounded-xl bg-sage-50/70 border border-sage-200">
            <p className="font-bold text-sage-900">👨‍👩‍👧 Family Member</p>
            <p className="text-sage-700 mt-1">View vital healthcare information, receive notifications, and assist in emergency transport.</p>
          </div>
        </div>
      </div>

      {/* INVITATIONS (Only visible to Profile Owner) */}
      {isOwner && pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-brand-600" />
            <span>Invitations ({pendingInvitations.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
                      Invited as {inv.role === 'caretaker' ? 'Caretaker' : 'Family Member'}
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{inv.invited_email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {inv.status === 'expired' ? 'Expired' : 'Expires'} {new Date(inv.expires_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={inv.status === 'expired' ? 'red' : 'amber'} size="sm">
                    {inv.status === 'expired' ? 'Expired' : 'Pending'}
                  </Badge>
                </div>

                {inv.status === 'pending' && (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-amber-200">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Invite Code</span>
                      <span className="break-all text-sm font-mono font-bold text-slate-900">{inv.invite_code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyCode(inv.invite_code)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition-colors"
                    >
                      {copiedCode === inv.invite_code ? <Check className="w-3.5 h-3.5 text-sage-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === inv.invite_code ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE MEMBERS LIST */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900">
          Authorized Members Connected ({activeMembers.length})
        </h3>

        {isLoading ? (
          <div role="status" className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
            Loading care circle members...
          </div>
        ) : activeMembers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-700">No authorized members yet</p>
            <p className="text-xs text-slate-500 mt-1">Invite family members or caretakers using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeMembers.map((member) => (
              <Card key={member.id} className="p-6 bg-white border-slate-200 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  {/* Name and Role */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 font-bold text-lg flex items-center justify-center shrink-0">
                        {(member.member_name || member.member_email || 'M').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">
                          {member.member_name || 'Care Circle Member'}
                        </h4>
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mt-0.5 ${
                          member.role === 'caretaker' 
                            ? 'bg-brand-50 text-brand-700 border-brand-200' 
                            : 'bg-sage-50 text-sage-700 border-sage-200'
                        }`}>
                          {member.role === 'caretaker' ? '🩺 Caretaker' : '👨‍👩‍👧 Family Member'}
                        </span>
                      </div>
                    </div>

                    <Badge variant="green" size="sm">Active</Badge>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {member.member_email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.member_email}</span>
                      </p>
                    )}
                    {member.member_phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{member.member_phone}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Joined: {new Date(member.accepted_at || member.invited_at).toLocaleDateString()}</span>
                    </p>
                  </div>

                  {/* Permitted Activities */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Permitted Access</span>
                    <div className="flex flex-wrap gap-1.5">
                      {member.permissions.map((perm, pIdx) => (
                        <span key={pIdx} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {perm.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Revoke member action (Owner only) */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {canRevokeMember ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<UserX className="w-4 h-4 text-red-600" />}
                      onClick={() => setMemberToRevoke(member)}
                      className="text-red-700 hover:bg-red-50 hover:border-red-200 text-xs font-bold"
                    >
                      Revoke Access
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Active Authorized Member
                    </span>
                  )}

                  {member.member_phone && (
                    <a
                      href={`tel:${member.member_phone.replace(/[^0-9]/g, '')}`}
                      className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Direct Call</span>
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* REVOKED MEMBERS LIST (Owner only audit trail) */}
      {isOwner && revokedMembers.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Revoked Member History ({revokedMembers.length})
          </h3>
          <div className="space-y-2">
            {revokedMembers.map((rev) => (
              <div key={rev.id} className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div>
                  <span className="font-bold text-slate-800">{rev.member_name || rev.member_email}</span>
                  <span className="ml-2 text-slate-400">({rev.role === 'caretaker' ? 'Caretaker' : 'Family Member'})</span>
                </div>
                <Badge variant="red" size="sm">Access Revoked</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRM REVOCATION MODAL */}
      {memberToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3.5 text-red-600">
              <div className="p-3 rounded-2xl bg-red-100 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Revoke Member Access</h3>
                <p className="text-xs text-slate-500">Confirm access revocation</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-sm text-slate-700 space-y-2">
              <p>
                Are you sure you want to revoke access for{' '}
                <strong className="text-slate-900 font-bold">
                  {memberToRevoke.member_name || memberToRevoke.member_email}
                </strong>{' '}
                ({memberToRevoke.role === 'caretaker' ? 'Caretaker' : 'Family Member'})?
              </p>
              <p className="text-xs text-red-700 font-medium">
                Their active access to this elderly healthcare profile will be immediately invalidated. Their user account will remain intact, but they will no longer be able to view or manage medications, vitals, or activities.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberToRevoke(null)}
                disabled={isRevoking}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="font-bold"
              >
                {isRevoking ? 'Revoking Access...' : 'Confirm Revocation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {createdInvite ? 'Invitation Generated!' : 'Invite Care Circle Member'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {createdInvite 
                      ? 'Share this secure code with your invitee' 
                      : 'Generate a secure invitation code for this healthcare profile'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseInviteModal}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdInvite ? (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-sage-50 border border-sage-300 text-center space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-sage-800 block">
                    Secure Invitation Code
                  </span>
                  <div className="p-4 bg-white rounded-2xl border-2 border-sage-400 font-mono text-sm sm:text-lg font-extrabold text-slate-900 break-all">
                    {createdInvite.invite_code}
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    icon={copiedCode === createdInvite.invite_code ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    onClick={() => handleCopyCode(createdInvite.invite_code)}
                    className="font-bold shadow-xs"
                  >
                    {copiedCode === createdInvite.invite_code ? 'Copied to Clipboard!' : 'Copy Invitation Code'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Invited Email:</span>
                    <strong className="text-slate-800">{createdInvite.invited_email}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Assigned Role:</span>
                    <strong className="text-slate-800">
                      {createdInvite.role === 'caretaker' ? '🩺 Caretaker' : '👨‍👩‍👧 Family Member'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Validity:</span>
                    <strong className="text-amber-700">{new Date(createdInvite.expires_at).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900">
                  <strong>How to redeem:</strong> The invited person can enter this code during registration on CareBridge, or via the <em>"Redeem Code"</em> form in their dashboard.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreatedInvite(null);
                      setInviteEmail('');
                    }}
                  >
                    Invite Another
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCloseInviteModal}
                    className="font-bold"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <Input
                  label="Invitee Email Address"
                  type="email"
                  placeholder="e.g. family.member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
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
                      onClick={() => setInviteRole('family_member')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === 'family_member'
                          ? 'bg-sage-50 border-sage-500 text-sage-900 ring-2 ring-sage-100'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-bold text-sm">Family Member</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Read-only health logs & appointments</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteRole('caretaker')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === 'caretaker'
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseInviteModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="font-bold"
                  >
                    {isSubmitting ? 'Generating Invite...' : 'Generate Invitation Code'}
                  </Button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
