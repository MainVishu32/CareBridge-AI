import React from 'react';
import { 
  Pill, 
  CalendarDays, 
  HeartPulse, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Medication, Appointment, HealthMetric, NavigationTab } from '../../../types';

interface OverviewViewProps {
  medications: Medication[];
  appointments: Appointment[];
  vitals: HealthMetric[];
  onMarkMedTaken: (id: string) => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  medications,
  appointments,
  vitals,
  onMarkMedTaken,
  onNavigateTab,
}) => {
  const takenMedsCount = medications.filter(m => m.status === 'taken').length;
  const totalMedsCount = medications.length;
  const adherencePercent = totalMedsCount > 0 ? Math.round((takenMedsCount / totalMedsCount) * 100) : 100;
  
  const nextPendingMed = medications.find(m => m.status === 'pending');
  const nextAppointment = appointments.find(a => a.status === 'upcoming');
  const bpVital = vitals.find(v => v.type === 'Blood Pressure');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Top Greeting Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sage-300" />
              <span>Daily Health Summary • Active Circle Protected</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Good Morning, Eleanor! 👋
            </h1>
            <p className="text-brand-100 text-base sm:text-lg max-w-xl font-normal">
              You are doing wonderfully. You've completed {takenMedsCount} of {totalMedsCount} scheduled medications for today.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 text-center shrink-0 min-w-[160px]">
            <span className="block text-3xl sm:text-4xl font-black text-white">{adherencePercent}%</span>
            <span className="text-xs uppercase font-bold text-brand-100 tracking-wider">Today's Adherence</span>
          </div>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Next Medication */}
        <Card className="p-5 flex flex-col justify-between hoverable" onClick={() => onNavigateTab('medications')}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Next Due</span>
              <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                <Pill className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600">Medication</p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate">
              {nextPendingMed ? nextPendingMed.name : 'All done today!'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {nextPendingMed ? `${nextPendingMed.scheduleTime} • ${nextPendingMed.dosage}` : 'No more pending pills'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-700">
            <span>View Med Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>

        {/* Next Doctor Visit */}
        <Card className="p-5 flex flex-col justify-between hoverable" onClick={() => onNavigateTab('appointments')}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Visit</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600">Doctor Visit</p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate">
              {nextAppointment ? nextAppointment.doctorName : 'None scheduled'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {nextAppointment ? `${nextAppointment.date} at ${nextAppointment.time}` : 'Up to date'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>View Appointments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>

        {/* Latest Blood Pressure */}
        <Card className="p-5 flex flex-col justify-between hoverable" onClick={() => onNavigateTab('reports')}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest Vital</span>
              <div className="p-2 rounded-xl bg-sage-50 text-sage-600">
                <HeartPulse className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600">Blood Pressure</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900">
                {bpVital ? bpVital.value : '120/80'}
              </h3>
              <span className="text-xs text-slate-500 font-medium">mmHg</span>
            </div>
            <p className="text-xs text-sage-700 font-semibold mt-1">
              ✓ In normal range
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sage-700">
            <span>Review Health Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>

        {/* Caregiver On Duty */}
        <Card className="p-5 flex flex-col justify-between hoverable" onClick={() => onNavigateTab('care-circle')}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Care Circle</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600">Assigned Aide</p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate">Maria Rodriguez, CNA</h3>
            <p className="text-xs text-slate-500 mt-1">Checked in at 8:15 AM</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Contact Circle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>

      </div>

      {/* Main Row: Today's Action Schedule & Quick Family Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left 8 Cols: Today's Medication Action Checklist */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Today's Medication Schedule</h2>
              <p className="text-sm text-slate-500 font-medium">Tap to confirm pills you have taken</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('medications')}
            >
              See All Doses
            </Button>
          </div>

          <div className="space-y-3.5">
            {medications.map((med) => {
              const isTaken = med.status === 'taken';
              return (
                <div
                  key={med.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isTaken 
                      ? 'bg-slate-50 border-slate-200 opacity-80' 
                      : 'bg-white border-brand-200 ring-2 ring-brand-50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl shrink-0 mt-0.5 ${
                      isTaken ? 'bg-sage-100 text-sage-700' : 'bg-brand-100 text-brand-700'
                    }`}>
                      <Pill className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-bold text-slate-900">{med.name}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {med.dosage}
                        </span>
                        <Badge variant={isTaken ? 'green' : 'amber'} size="sm">
                          {isTaken ? 'Taken ✓' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{med.instructions}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{med.timeOfDay} • {med.scheduleTime}</span>
                        <span>•</span>
                        <span>{med.purpose}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {isTaken ? (
                      <div className="flex items-center gap-2 text-sage-700 font-bold text-sm px-4 py-2.5 bg-sage-50 rounded-xl border border-sage-200">
                        <CheckCircle2 className="w-5 h-5 text-sage-600" />
                        <span>Verified Taken</span>
                      </div>
                    ) : (
                      <Button
                        variant="success"
                        size="md"
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        onClick={() => onMarkMedTaken(med.id)}
                        className="font-bold text-base shadow-sm"
                      >
                        Mark as Taken
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Emergency Reach & Active Family Notes */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Quick Family Contact Card */}
          <Card className="p-6 bg-white border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Primary Contact</span>
              <span className="text-xs font-bold text-sage-700 bg-sage-50 px-2.5 py-1 rounded-full">
                Active Now
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-lg">
                DV
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">David Vance</h4>
                <p className="text-xs text-slate-500">Son • Legal Healthcare Proxy</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              "Hi Mom, I arranged the ride for your eye screening on Monday. Call me if you need groceries this evening!"
            </p>

            <a
              href="tel:5552348901"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-sm border border-brand-200 transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-brand-600" />
              <span>Call David (555) 234-8901</span>
            </a>
          </Card>

          {/* Quick Doctor Visit Alert */}
          {nextAppointment && (
            <Card className="p-6 bg-slate-50 border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                <CalendarDays className="w-4 h-4" />
                <span>Next Doctor Appointment</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">{nextAppointment.title}</h4>
              <p className="text-sm text-slate-600">{nextAppointment.doctorName} • {nextAppointment.specialty}</p>
              <p className="text-xs text-slate-500">{nextAppointment.clinicName}</p>
              <div className="pt-2 flex items-center justify-between text-xs font-semibold text-purple-700">
                <span>{nextAppointment.date} at {nextAppointment.time}</span>
                <span className="bg-purple-100 px-2 py-0.5 rounded-md">Ride Arranged ✓</span>
              </div>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
};
