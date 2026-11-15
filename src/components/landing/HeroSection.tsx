import React from 'react';
import { Pill, CheckCircle2, HeartHandshake, PhoneCall, ShieldCheck, ArrowRight, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

interface HeroSectionProps {
  onGetStarted: () => void;
  onOpenPasscode: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onOpenPasscode,
}) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 bg-gradient-to-b from-brand-50/70 via-slate-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading and Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage-100/90 text-sage-800 border border-sage-200 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-sage-600" />
              <span>Dignified, Stress-Free Senior Care Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Medication Clarity & Care <br className="hidden sm:inline" />
              <span className="text-brand-700">Every Single Day.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
              CareBridge connects elderly individuals, family members, and trusted caregivers in a calm, accessible digital circle. Never wonder if a pill was missed or an appointment overlooked.
            </p>

            {/* Senior-focused assurances */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
                <span>Large Readable Text</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
                <span>One-Tap Passcode</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
                <span>Family Sync in Real-Time</span>
              </div>
            </div>

            {/* Call To Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 justify-center lg:justify-start">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
                onClick={onGetStarted}
                className="shadow-brand-700/20 shadow-lg text-lg font-bold"
              >
                Explore Care Dashboard
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onOpenPasscode}
                className="text-base"
              >
                Sign In with 4-Digit Passcode
              </Button>
            </div>

            <div className="pt-2 text-sm text-slate-500 flex items-center justify-center lg:justify-start gap-2">
              <HeartHandshake className="w-4 h-4 text-brand-600" />
              <span>HIPAA Compliant architectural standards • Free for family care circles</span>
            </div>
          </div>

          {/* Right Column: High Fidelity Senior Dashboard Preview Card */}
          <div className="lg:col-span-5 relative">
            {/* Background gentle blur highlight */}
            <div className="absolute -inset-4 bg-brand-200/40 rounded-3xl blur-2xl transform -rotate-1 pointer-events-none" />

            <div className="relative space-y-4">
              
              {/* Main Preview Card: Today's Senior Schedule */}
              <Card className="p-6 sm:p-7 shadow-xl border-slate-200 bg-white">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                      EV
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">Eleanor Vance</h2>
                      <p className="text-sm text-slate-500">Today: Tuesday, Morning Schedule</p>
                    </div>
                  </div>
                  <Badge variant="green" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    On Track
                  </Badge>
                </div>

                {/* Next Medication highlight */}
                <div className="mt-5 p-4 rounded-xl bg-brand-50/70 border border-brand-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-brand-600 text-white">
                        <Pill className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs uppercase font-bold text-brand-700 tracking-wider">Morning Medication</span>
                        <h3 className="text-lg font-bold text-slate-900">Lisinopril (10mg)</h3>
                        <p className="text-sm text-slate-600">Take with breakfast and a glass of water</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-brand-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-brand-800 font-medium">
                      <Clock className="w-4 h-4 text-brand-600" />
                      <span>Scheduled for 08:00 AM</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-sage-600 text-white shadow-xs">
                      Taken at 8:12 AM ✓
                    </span>
                  </div>
                </div>

                {/* Afternoon Upcoming */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                      1 PM
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Vitamin D3 & Calcium</h4>
                      <p className="text-xs text-slate-500">Afternoon pill • 1 Softgel</p>
                    </div>
                  </div>
                  <Badge variant="amber" size="sm">
                    Upcoming
                  </Badge>
                </div>

                {/* Emergency & Family contact preview */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sage-500 animate-pulse" />
                    <span className="text-xs text-slate-600 font-medium">Caregiver Maria is active</span>
                  </div>
                  <button
                    onClick={onGetStarted}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                  >
                    <span>View Full Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>

              {/* Floating Emergency Pill Card */}
              <div className="bg-white rounded-xl border border-red-200 shadow-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Primary Emergency Contact</h4>
                    <p className="text-xs text-slate-600">David Vance (Son) • (555) 234-8901</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                  Instant Reach
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
