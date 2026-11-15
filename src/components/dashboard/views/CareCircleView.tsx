import React, { useEffect, useRef, useState } from 'react';
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
  Ticket
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { ProfileMember } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { InviteMemberModal } from './InviteMemberModal';
import { RevokeMemberDialog } from './RevokeMemberDialog';

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
    isCareCircleLoading,
    refreshCareCircleData,
    error: profileDataError,
  } = useAuth();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Revocation confirmation state
  const [memberToRevoke, setMemberToRevoke] = useState<ProfileMember | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const copiedCodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedCodeTimer.current) clearTimeout(copiedCodeTimer.current);
  }, []);

  useEffect(() => {
    void refreshCareCircleData();
  }, [refreshCareCircleData]);

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
      if (copiedCodeTimer.current) clearTimeout(copiedCodeTimer.current);
      copiedCodeTimer.current = setTimeout(() => {
        setCopiedCode(null);
        copiedCodeTimer.current = null;
      }, 2500);
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
              setActionError(null);
              setActionSuccess(null);
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

        {isCareCircleLoading ? (
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

      {memberToRevoke && (
        <RevokeMemberDialog
          member={memberToRevoke}
          isRevoking={isRevoking}
          onCancel={() => setMemberToRevoke(null)}
          onConfirm={() => void handleConfirmRevoke()}
        />
      )}

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteMember={(email, role) => inviteMember(email, role)}
        onInviteCreated={(email) => setActionSuccess(`Invitation generated successfully for ${email}`)}
      />

    </div>
  );
};
