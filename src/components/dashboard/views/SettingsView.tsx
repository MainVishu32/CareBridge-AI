import React, { useEffect, useRef, useState } from 'react';
import { 
  Eye, 
  Bell, 
  PhoneCall, 
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { AccessibilitySettings, UserProfile } from '../../../types';

interface SettingsViewProps {
  user: UserProfile;
  accessibility: AccessibilitySettings;
  onUpdateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  onUpdateEmergencyContact: (name: string, phone: string, relation: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  accessibility,
  onUpdateAccessibility,
  onUpdateEmergencyContact,
}) => {
  const [emergencyName, setEmergencyName] = useState(user.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user.emergencyContact?.phone || '');
  const [emergencyRel, setEmergencyRel] = useState(user.emergencyContact?.relationship || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEmergencyContact(emergencyName, emergencyPhone, emergencyRel);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveSuccess(true);
    saveTimer.current = setTimeout(() => {
      setSaveSuccess(false);
      saveTimer.current = null;
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Platform & Accessibility Settings
        </h1>
        <p className="text-base text-slate-500 font-normal">
          Customize display text size, high contrast modes, and emergency contacts.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-sage-50 border border-sage-300 text-sage-800 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
          <span>Settings successfully updated.</span>
        </div>
      )}

      {/* 1. SENIOR ACCESSIBILITY PANEL */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200 space-y-6">
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Senior Accessibility & Vision</h3>
            <p className="text-sm text-slate-500">Fine-tune the interface for ease of reading and interaction</p>
          </div>
        </div>

        {/* Font Size Selection */}
        <div className="space-y-3">
          <label className="block text-base font-bold text-slate-900">
            Display Text Size
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'normal', label: 'Standard (16px)', preview: 'Regular' },
              { id: 'large', label: 'Large (18px)', preview: 'Large' },
              { id: 'xlarge', label: 'Extra Large (20px)', preview: 'Jumbo' },
            ].map((sizeOpt) => (
              <button
                key={sizeOpt.id}
                type="button"
                onClick={() => onUpdateAccessibility({ fontSize: sizeOpt.id as any })}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  accessibility.fontSize === sizeOpt.id
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">{sizeOpt.label}</span>
                <span className="text-xs text-slate-500 mt-1 block">Best for {sizeOpt.preview} reading</span>
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="space-y-0.5">
            <h4 className="text-base font-bold text-slate-900">High Contrast Mode</h4>
            <p className="text-xs text-slate-500">Increases border contrast and darkens text for seniors with low vision</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateAccessibility({ highContrast: !accessibility.highContrast })}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              accessibility.highContrast ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                accessibility.highContrast ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Audio Reminders Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="space-y-0.5">
            <h4 className="text-base font-bold text-slate-900">Audio Voice Prompts</h4>
            <p className="text-xs text-slate-500">Read medication names out loud when scheduled dose times arrive</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateAccessibility({ audioVoiceAssistance: !accessibility.audioVoiceAssistance })}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              accessibility.audioVoiceAssistance ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                accessibility.audioVoiceAssistance ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* 2. EMERGENCY CONTACT CONFIGURATION */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200 space-y-6">
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Primary Emergency Contact</h3>
            <p className="text-sm text-slate-500">The person dialed immediately via the Emergency SOS button</p>
          </div>
        </div>

        <form onSubmit={handleSaveContact} className="space-y-4">
          <Input
            label="Contact Full Name"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              required
            />

            <Input
              label="Relationship to Senior"
              value={emergencyRel}
              onChange={(e) => setEmergencyRel(e.target.value)}
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="font-bold"
            >
              Update Emergency Contact
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. NOTIFICATION PREFERENCES */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-sage-100 text-sage-700">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Family & Care Notifications</h3>
            <p className="text-sm text-slate-500">Configure what triggers alerts to connected family members</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-brand-600" />
            <span>Notify family proxy when morning medication is taken</span>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-brand-600" />
            <span>Send reminder alert if dose is delayed by more than 45 minutes</span>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-brand-600" />
            <span>Notify family 24 hours prior to scheduled medical appointments</span>
          </label>
        </div>
      </Card>

    </div>
  );
};
