import React, { useState } from 'react';
import { HeartPulse, PhoneCall, LogOut, Menu, X, ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button';
import { UserProfile, AccessibilitySettings, ElderlyProfile } from '../../types';

interface TopBarProps {
  user: UserProfile;
  elderlyProfile: ElderlyProfile | null;
  accessibility: AccessibilitySettings;
  onUpdateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  onSignOut: () => void;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  elderlyProfile,
  accessibility,
  onUpdateAccessibility,
  onSignOut,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const toggleFontSize = () => {
    if (accessibility.fontSize === 'normal') {
      onUpdateAccessibility({ fontSize: 'large' });
    } else if (accessibility.fontSize === 'large') {
      onUpdateAccessibility({ fontSize: 'xlarge' });
    } else {
      onUpdateAccessibility({ fontSize: 'normal' });
    }
  };

  const roleLabel = user.role === 'elderly'
    ? 'Elderly Individual (Profile Owner)'
    : user.role === 'caretaker'
    ? 'Caretaker'
    : 'Family Member';

  const roleBadgeStyle = user.role === 'elderly'
    ? 'bg-purple-100 text-purple-800 border-purple-200'
    : user.role === 'caretaker'
    ? 'bg-brand-100 text-brand-800 border-brand-200'
    : 'bg-sage-100 text-sage-800 border-sage-200';

  const connectedPatientName = elderlyProfile ? elderlyProfile.full_name : 'Primary Profile';
  const emergencyPhone = elderlyProfile?.emergency_contact_phone || user.emergencyContact?.phone || '911';
  const emergencyName = elderlyProfile?.emergency_contact_name || user.emergencyContact?.name || 'Designated Proxy';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Left: Mobile hamburger + Platform Logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-sm ring-4 ring-brand-50">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                    CareBridge
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-700 hidden sm:inline-block">
                      Profile: <span className="text-slate-800 font-bold">{connectedPatientName}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeStyle}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Senior Accessibility Controls & Emergency Dial */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Quick Font Size Switcher for Senior Vision */}
              <button
                type="button"
                onClick={toggleFontSize}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-sm font-bold shadow-2xs"
                title="Cycle font size (Normal, Large, Extra Large)"
              >
                <span className="text-brand-700 font-extrabold text-base">A</span>
                <span className="hidden sm:inline text-xs text-slate-500">
                  {accessibility.fontSize === 'normal' && 'Text: Normal'}
                  {accessibility.fontSize === 'large' && 'Text: Large'}
                  {accessibility.fontSize === 'xlarge' && 'Text: Jumbo'}
                </span>
              </button>

              {/* Large Emergency Assistance Button (Accessible red highlight) */}
              <button
                type="button"
                onClick={() => setShowEmergencyModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                <span className="hidden md:inline">Emergency Help</span>
                <span className="md:hidden">SOS</span>
              </button>

              {/* User Profile Pill & Sign Out */}
              <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Emergency Assistance Modal (Accessible prompt) */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-red-200 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Emergency Healthcare Contacts</h3>
                <p className="text-sm text-slate-600">Immediate access for {connectedPatientName}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Emergency Service 911 */}
              <a
                href="tel:911"
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 hover:bg-red-100 border-2 border-red-300 text-red-800 font-bold transition-all text-lg group"
              >
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
                  <span>Call Emergency 911</span>
                </div>
                <span className="text-sm font-semibold bg-red-600 text-white px-3 py-1 rounded-xl">
                  Dial 911
                </span>
              </a>

              {/* Designated Primary Family Emergency Contact */}
              <a
                href={`tel:${emergencyPhone.replace(/[^0-9]/g, '')}`}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 text-slate-900 font-bold transition-all text-base group"
              >
                <div>
                  <p className="text-xs font-bold uppercase text-brand-700 tracking-wider">Primary Emergency Proxy</p>
                  <p className="text-lg">{emergencyName}</p>
                  <p className="text-sm text-slate-500 font-normal">{emergencyPhone}</p>
                </div>
                <span className="bg-brand-600 text-white text-sm px-4 py-2 rounded-xl group-hover:bg-brand-700 transition-colors">
                  Call Now
                </span>
              </a>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowEmergencyModal(false)}
              >
                Close Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
