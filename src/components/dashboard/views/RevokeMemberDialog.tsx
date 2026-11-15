import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../common/Button';
import { ProfileMember } from '../../../types';

interface RevokeMemberDialogProps {
  member: ProfileMember;
  isRevoking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RevokeMemberDialog: React.FC<RevokeMemberDialogProps> = ({
  member,
  isRevoking,
  onCancel,
  onConfirm,
}) => (
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
            {member.member_name || member.member_email}
          </strong>{' '}
          ({member.role === 'caretaker' ? 'Caretaker' : 'Family Member'})?
        </p>
        <p className="text-xs text-red-700 font-medium">
          Their active access to this elderly healthcare profile will be immediately invalidated. Their user account will remain intact, but they will no longer be able to view or manage medications, vitals, or activities.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isRevoking}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={isRevoking} className="font-bold">
          {isRevoking ? 'Revoking Access...' : 'Confirm Revocation'}
        </Button>
      </div>
    </div>
  </div>
);
