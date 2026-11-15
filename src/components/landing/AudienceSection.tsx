import React from 'react';
import { UserCheck, Heart, Stethoscope, Check } from 'lucide-react';
import { Card } from '../common/Card';

export const AudienceSection: React.FC = () => {
  const audiences = [
    {
      title: "For Seniors",
      role: "Independence & Clarity",
      icon: <UserCheck className="w-8 h-8 text-brand-600" />,
      tagline: "Stay comfortably independent in your home with confidence.",
      points: [
        "Extra-large text options and clear high contrast",
        "Simple 4-digit passcode login (no complex passwords)",
        "Visual pill box showing exact morning, afternoon & night doses",
        "One-touch emergency help calling your designated family member",
      ],
      badgeColor: "bg-brand-50 text-brand-700 border-brand-200",
    },
    {
      title: "For Family Members",
      role: "Peace of Mind From Anywhere",
      icon: <Heart className="w-8 h-8 text-rose-500" />,
      tagline: "Support aging parents without stressful daily interrogations.",
      points: [
        "Live notification when Mom or Dad takes their morning medicine",
        "Coordinate rides and transportation to medical visits",
        "Track prescription refills so medicines never run out",
        "Direct access to caregiver notes and vital health logs",
      ],
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    },
    {
      title: "For Caregivers & Nurses",
      role: "Seamless Coordination",
      icon: <Stethoscope className="w-8 h-8 text-sage-600" />,
      tagline: "Deliver dignified, professional care with documented precision.",
      points: [
        "Standardized care logs and time-stamped dose verification",
        "Clear doctor instructions and specific food/liquid guidelines",
        "Smooth shift handover between visiting nurses and family",
        "Organized emergency physician contacts in one tap",
      ],
      badgeColor: "bg-sage-50 text-sage-700 border-sage-200",
    },
  ];

  return (
    <section id="care-circle" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-bold uppercase tracking-wider">
            Connected Care Circle
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for the Entire Circle of Care
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            Whether you are taking your own medications, looking after an aging parent from across town, or providing daily nursing care.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {audiences.map((audience, idx) => (
            <Card key={idx} className="p-8 flex flex-col justify-between bg-white border-slate-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    {audience.icon}
                  </div>
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${audience.badgeColor}`}>
                    {audience.role}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{audience.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 font-medium">{audience.tagline}</p>
                </div>

                <div className="space-y-3 pt-2">
                  {audience.points.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm text-slate-700 font-medium leading-normal">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};
