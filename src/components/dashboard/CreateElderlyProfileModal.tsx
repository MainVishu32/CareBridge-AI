import React, { useState } from 'react';
import { HeartPulse, Phone, User, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuth } from '../../context/AuthContext';

interface CreateElderlyProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCompleted?: () => void;
}

export const CreateElderlyProfileModal: React.FC<CreateElderlyProfileModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { createElderlyProfile, user } = useAuth();

  const [fullName, setFullName] = useState(user?.name || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [passcode, setPasscode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !passcode.trim() || !emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
      setError('Passcode must be exactly 4 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    const res = await createElderlyProfile({
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      passcode,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      emergencyContactRelation: emergencyContactRelation.trim() || 'Primary Emergency Contact',
    });
    setIsSubmitting(false);

    if (res.success) {
      if (onCompleted) onCompleted();
      if (onClose) onClose();
    } else {
      setError(res.error || 'Failed to create healthcare profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
          <div className="p-3 rounded-2xl bg-brand-100 text-brand-700">
            <HeartPulse className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Set Up Healthcare Profile</h3>
            <p className="text-xs text-slate-500">Configure your profile, senior passcode, and emergency proxy</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Elderly Individual Full Name"
            placeholder="e.g. Eleanor Vance"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User className="w-5 h-5" />}
            required
          />

          <Input
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          {/* Secure 4-Digit Passcode Setup */}
          <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              4-Digit Healthcare Access Passcode
            </label>
            <p className="text-xs text-slate-600">
              This code allows quick login from the senior keypad. It is securely salted and never stored in plain text.
            </p>
            <div className="w-48">
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl font-bold tracking-widest py-2 rounded-xl border border-slate-300 bg-white focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required
              />
            </div>
          </div>

          {/* Emergency Proxy Contact */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-600" />
              <span>Primary Emergency Contact (Dialable via SOS button)</span>
            </h4>

            <Input
              label="Contact Full Name"
              placeholder="e.g. David Vance"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. (555) 234-8901"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                required
              />
              <Input
                label="Relationship"
                placeholder="e.g. Son / Proxy"
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? 'Saving Profile...' : 'Create Healthcare Profile'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};
