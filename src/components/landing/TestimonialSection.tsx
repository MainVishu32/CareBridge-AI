import React from 'react';
import { Star, ShieldCheck, HeartPulse } from 'lucide-react';
import { Card } from '../common/Card';

export const TestimonialSection: React.FC = () => {
  const testimonials = [
    {
      quote: "My 82-year-old mother lives alone 40 miles away. With CareBridge, I can see on my phone that she took her morning blood pressure medication before I even finish my first cup of coffee. The peace of mind is priceless.",
      author: "Robert Sterling",
      role: "Family Caregiver, Boston MA",
      rating: 5,
    },
    {
      quote: "Other medical apps are full of tiny text and complicated menus that confuse my senior patients. CareBridge’s large buttons and high contrast make medication tracking intuitive and dignified.",
      author: "Dr. Evelyn Ross, MD",
      role: "Geriatric Specialist & Clinical Advisor",
      rating: 5,
    },
    {
      quote: "I love the 4-digit code. I don't have to remember passwords or type on a tiny keyboard. The big green checkmark when I take my pills gives me confidence I haven't forgotten anything.",
      author: "Margaret H., 79",
      role: "Independent Senior Living Resident",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
            <HeartPulse className="w-3.5 h-3.5 text-brand-600" />
            Trusted Healthcare Standard
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Loved by Seniors, Trusted by Physicians
          </h2>
          <p className="text-lg text-slate-600">
            Real families sharing how simplified medication management transformed their daily routine.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <Card key={idx} className="p-8 flex flex-col justify-between bg-slate-50 border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-base text-slate-700 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="font-bold text-slate-900 text-base">{t.author}</div>
                <div className="text-xs text-slate-500 font-medium">{t.role}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Security & Compliance Highlights */}
        <div className="mt-16 p-6 rounded-2xl bg-brand-50 border border-brand-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand-600 text-white shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Enterprise Healthcare Privacy Standards</h4>
              <p className="text-sm text-slate-600">Encrypted data transmission, strict medical proxy authorization, and zero third-party health tracking.</p>
            </div>
          </div>
          <div className="text-xs font-bold text-brand-800 uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-brand-200 shrink-0">
            Secure & Private
          </div>
        </div>

      </div>
    </section>
  );
};
