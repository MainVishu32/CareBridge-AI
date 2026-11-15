import React from 'react';
import { HeartPulse, ShieldCheck, LogIn, KeyRound } from 'lucide-react';
import { Button } from '../common/Button';

interface LandingHeaderProps {
  onOpenAuth: (mode: 'login' | 'register' | 'passcode') => void;
  onNavigateToDemo: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onSetFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onOpenAuth,
  onNavigateToDemo,
  fontSize,
  onSetFontSize,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-sm ring-4 ring-brand-50">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 block leading-tight">
                CareBridge
              </span>
              <span className="text-xs font-medium text-slate-500 tracking-wide uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
                Elderly Health & Medication
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Hidden on small mobile) */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-base font-semibold text-slate-600 hover:text-brand-700 transition-colors">
              Platform Features
            </a>
            <a href="#care-circle" className="text-base font-semibold text-slate-600 hover:text-brand-700 transition-colors">
              Family & Caregivers
            </a>
            <a href="#accessibility" className="text-base font-semibold text-slate-600 hover:text-brand-700 transition-colors">
              Senior Accessibility
            </a>
          </nav>

          {/* Right Controls: Font Scale Pill & Auth CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Font Size Switcher for Elderly Accessibility */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-semibold" title="Adjust text size for easier reading">
              <span className="px-2 text-slate-400 select-none">Text:</span>
              <button
                onClick={() => onSetFontSize('normal')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${fontSize === 'normal' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                A
              </button>
              <button
                onClick={() => onSetFontSize('large')}
                className={`px-2.5 py-1 rounded-lg transition-colors text-sm ${fontSize === 'large' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                A+
              </button>
              <button
                onClick={() => onSetFontSize('xlarge')}
                className={`px-2.5 py-1 rounded-lg transition-colors text-base ${fontSize === 'xlarge' ? 'bg-white text-brand-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                A++
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<KeyRound className="w-4 h-4 text-brand-600" />}
              onClick={() => onOpenAuth('passcode')}
              className="hidden lg:inline-flex"
            >
              Passcode Access
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<LogIn className="w-4 h-4 text-slate-600" />}
              onClick={() => onOpenAuth('login')}
            >
              Sign In
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToDemo}
              className="bg-brand-600 hover:bg-brand-700"
            >
              Open Dashboard
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
