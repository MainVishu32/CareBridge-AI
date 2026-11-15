import React from 'react';
import { HeartPulse, Shield, Phone, Mail, HelpCircle } from 'lucide-react';

interface FooterProps {
  onOpenAuth: (mode: 'login' | 'register' | 'passcode') => void;
  onNavigateToDemo: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAuth,
  onNavigateToDemo,
}) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                <HeartPulse className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">CareBridge</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Empowering seniors to maintain independent wellness while keeping families connected with clear medication schedules, vitals logs, and care coordination.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-sage-400" />
              <span>HIPAA privacy compliant design framework</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={onNavigateToDemo} className="hover:text-white transition-colors">
                  Care Overview
                </button>
              </li>
              <li>
                <button onClick={onNavigateToDemo} className="hover:text-white transition-colors">
                  Medication Tracker
                </button>
              </li>
              <li>
                <button onClick={onNavigateToDemo} className="hover:text-white transition-colors">
                  Doctor Appointments
                </button>
              </li>
              <li>
                <button onClick={onNavigateToDemo} className="hover:text-white transition-colors">
                  Care Circle
                </button>
              </li>
            </ul>
          </div>

          {/* Access & Security */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Access</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onOpenAuth('passcode')} className="hover:text-white transition-colors">
                  Senior 4-Digit Passcode
                </button>
              </li>
              <li>
                <button onClick={() => onOpenAuth('login')} className="hover:text-white transition-colors">
                  Family / Caregiver Login
                </button>
              </li>
              <li>
                <button onClick={() => onOpenAuth('register')} className="hover:text-white transition-colors">
                  Register Care Circle
                </button>
              </li>
            </ul>
          </div>

          {/* Support & Accessibility */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Support</h4>
            <div className="space-y-2.5 text-sm text-slate-400">
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-400 shrink-0" />
                <span>1-800-CARE-BRIDGE</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                <span>support@carebridge.health</span>
              </p>
              <p className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-400 shrink-0" />
                <span>Accessibility Hotline 24/7</span>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom copyright notice */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 CareBridge Health Systems Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Accessibility Statement (WCAG 2.1 AA)</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
