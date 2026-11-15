import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Activity, 
  TrendingUp, 
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { HealthMetric } from '../../../types';

interface ReportsViewProps {
  vitals: HealthMetric[];
  patientName: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  vitals,
  patientName,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadReport = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const weeklyAdherenceDays = [
    { day: 'Mon', percent: 100, status: 'complete' },
    { day: 'Tue', percent: 100, status: 'complete' },
    { day: 'Wed', percent: 100, status: 'complete' },
    { day: 'Thu', percent: 75, status: 'missed' },
    { day: 'Fri', percent: 100, status: 'complete' },
    { day: 'Sat', percent: 100, status: 'complete' },
    { day: 'Sun', percent: 100, status: 'complete' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Health Reports & Adherence
          </h1>
          <p className="text-base text-slate-500 font-normal">
            Track vital trends and export physician summaries for upcoming consultations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
            className="hidden sm:inline-flex"
          >
            Print
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadReport}
            className="shadow-sm font-bold"
          >
            Export Clinical Summary
          </Button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-sage-50 border border-sage-300 text-sage-800 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
          <span>Clinical Health Summary Report ready for {patientName}. You can bring this to your next clinic visit.</span>
        </div>
      )}

      {/* Weekly Medication Adherence Bar */}
      <Card className="p-6 sm:p-7 bg-white border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h3 className="text-xl font-bold text-slate-900">7-Day Medication Adherence</h3>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Overall compliance for the current week</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-brand-700">96%</span>
            <span className="text-xs font-bold text-sage-700 uppercase bg-sage-50 px-2 py-0.5 rounded-md border border-sage-200">
              Optimal Tier
            </span>
          </div>
        </div>

        {/* Day-by-day pill adherence bars */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2">
          {weeklyAdherenceDays.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{item.day}</span>
              <div className="w-full bg-slate-100 rounded-xl h-24 p-1 flex flex-col justify-end">
                <div
                  style={{ height: `${item.percent}%` }}
                  className={`w-full rounded-lg transition-all ${
                    item.percent === 100 ? 'bg-sage-500' : 'bg-amber-400'
                  }`}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700">{item.percent}%</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sage-500 inline-block" />
            <span>100% All Doses Taken</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Partial / Delayed Dose</span>
          </span>
        </div>
      </Card>

      {/* Recent Vitals Overview */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600" />
          <span>Recent Recorded Vitals</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {vitals.map((metric) => (
            <Card key={metric.id} className="p-5 bg-white border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.type}</span>
                <Badge
                  variant={metric.status === 'Optimal' ? 'green' : metric.status === 'Normal' ? 'blue' : 'amber'}
                  size="sm"
                >
                  {metric.status}
                </Badge>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{metric.value}</span>
                <span className="text-sm font-semibold text-slate-500">{metric.unit}</span>
              </div>

              <p className="text-xs text-slate-400 mt-2 font-medium">Recorded: {metric.recordedAt}</p>
              {metric.note && (
                <p className="text-xs text-brand-800 bg-brand-50 p-2 rounded-lg mt-2 font-medium">
                  {metric.note}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Clinical Notes Summary Card */}
      <Card className="p-6 sm:p-7 bg-slate-50 border-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900">Geriatric Care Physician Summary</h4>
            <p className="text-xs text-slate-500">Last updated by Dr. Emily Watson on Nov 14, 2026</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
          "Patient is demonstrating excellent adherence to Lisinopril and Metformin morning regimen. Blood pressure has stabilized well within normal range (122/78). Bone density supplementation (Vitamin D3) is well tolerated. Recommend continuing current dosages through next routine follow-up."
        </p>
      </Card>

    </div>
  );
};
