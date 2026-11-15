import React from 'react';
import { Pill, Users, CalendarCheck, FileHeart, BellRing, Smartphone } from 'lucide-react';
import { Card } from '../common/Card';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Pill className="w-7 h-7 text-brand-600" />,
      title: "Clear Medication Schedules",
      description: "Organized by Morning, Afternoon, Evening, and Night. High-contrast labels, clear dosages, and visual pill indicators make it simple and unambiguous.",
      benefit: "Prevents missed doses & double dosing",
    },
    {
      icon: <Users className="w-7 h-7 text-sage-600" />,
      title: "Shared Care Circle",
      description: "Synchronize family members, home nurses, and doctors. When a medication is marked taken, everyone gets quiet confidence in real-time.",
      benefit: "Bridges distance between family & seniors",
    },
    {
      icon: <CalendarCheck className="w-7 h-7 text-brand-600" />,
      title: "Doctor Appointments & Rides",
      description: "Keep clinic addresses, doctor notes, and transportation arrangements in one place. Never scramble for a ride or forget appointment papers.",
      benefit: "Integrated transport coordination notes",
    },
    {
      icon: <FileHeart className="w-7 h-7 text-sage-600" />,
      title: "Daily Vitals & Health Logs",
      description: "Track blood pressure, blood glucose, and pulse without overwhelming graphs. Generates printable reports for doctor visits.",
      benefit: "Ready-to-share medical summaries",
    },
    {
      icon: <BellRing className="w-7 h-7 text-brand-600" />,
      title: "Gentle, Non-Intrusive Reminders",
      description: "Customizable alerts that respect senior routines. No alarming buzzers—just polite visual and audio notifications.",
      benefit: "Reduces anxiety around healthcare routines",
    },
    {
      icon: <Smartphone className="w-7 h-7 text-sage-600" />,
      title: "Elderly-Friendly Accessibility",
      description: "Big touch buttons, high contrast, clean typography, and 4-digit PIN access without confusing password resets.",
      benefit: "Designed for real people of all tech levels",
    },
  ];

  return (
    <section id="features" className="py-20 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider">
            Engineered for Senior Dignity & Safety
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything Needed for Complete Care Coordination
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            CareBridge replaces scattered paper pillboxes, sticky notes, and frantic text messages with one calm, unified platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <Card key={idx} className="p-8 hoverable flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-sage-500 shrink-0" />
                <span>{feature.benefit}</span>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};
