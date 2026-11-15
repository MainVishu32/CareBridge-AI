import React, { useState } from 'react';
import { 
  CalendarDays, 
  Plus, 
  MapPin, 
  Clock, 
  Car, 
  Video, 
  FileText, 
  CheckCircle,
  X
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Input } from '../../common/Input';
import { Appointment } from '../../../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  onAddAppointment: (apt: Omit<Appointment, 'id'>) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  onAddAppointment,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // New Appointment Form State
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'In-person' | 'Telehealth'>('In-person');
  const [transportArranged, setTransportArranged] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !date.trim()) return;

    onAddAppointment({
      title: title || `${doctorName} Consultation`,
      doctorName,
      specialty: specialty || 'General Care',
      clinicName: clinicName || 'Health Center',
      address: type === 'Telehealth' ? 'Virtual Video Link' : (address || 'Clinic Office'),
      date,
      time: time || '10:00 AM',
      type,
      transportArranged,
      notes,
      status: 'upcoming',
    });

    setTitle('');
    setDoctorName('');
    setSpecialty('');
    setClinicName('');
    setAddress('');
    setDate('');
    setTime('');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Medical Appointments
          </h1>
          <p className="text-base text-slate-500 font-normal">
            Keep doctor visits, clinic locations, and transport rides organized.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
          className="shadow-sm"
        >
          Schedule Appointment
        </Button>
      </div>

      {/* Appointment Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {appointments.map((apt) => (
          <Card key={apt.id} className="p-6 sm:p-7 bg-white border-slate-200 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Header: Title, Doctor & Type Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-2xl shrink-0 mt-0.5 ${
                    apt.type === 'Telehealth' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                  }`}>
                    {apt.type === 'Telehealth' ? <Video className="w-6 h-6" /> : <CalendarDays className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{apt.title}</h3>
                    <p className="text-base font-semibold text-brand-800 mt-0.5">{apt.doctorName}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{apt.specialty}</p>
                  </div>
                </div>

                <Badge variant={apt.type === 'Telehealth' ? 'purple' : 'blue'} size="sm">
                  {apt.type}
                </Badge>
              </div>

              {/* Date & Time pill */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Clock className="w-5 h-5 text-brand-600" />
                  <span>{apt.date} • {apt.time}</span>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  Upcoming
                </span>
              </div>

              {/* Location details */}
              <div className="space-y-1.5 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">{apt.clinicName}</span>
                    <p className="text-xs text-slate-500">{apt.address}</p>
                  </div>
                </div>
              </div>

              {/* Transportation Badge */}
              <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-semibold bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 text-slate-700">
                  <Car className="w-4 h-4 text-brand-600" />
                  <span>Transportation status:</span>
                </div>
                {apt.transportArranged ? (
                  <span className="text-sage-800 bg-sage-100 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Ride Confirmed (David)</span>
                  </span>
                ) : (
                  <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
                    Needs Ride Coordination
                  </span>
                )}
              </div>

              {/* Instructions / Notes */}
              {apt.notes && (
                <div className="p-3 rounded-xl bg-brand-50/50 border border-brand-100 text-xs text-brand-900 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <span><strong>Important Note:</strong> {apt.notes}</span>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert(`Details for ${apt.doctorName} appointment`)}
              >
                View Full Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Schedule Medical Visit</h3>
                  <p className="text-xs text-slate-500">Record a doctor appointment and ride notes</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Appointment Title"
                placeholder="e.g. Cardiology Routine Check"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Doctor Name"
                  placeholder="e.g. Dr. Sarah Mitchell"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                />
                <Input
                  label="Specialty"
                  placeholder="e.g. Cardiologist"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  placeholder="e.g. Dec 12, 2026"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Input
                  label="Time"
                  placeholder="e.g. 10:30 AM"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-slate-800 mb-2">
                    Visit Mode
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'In-person' | 'Telehealth')}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 text-base min-h-[50px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="In-person">In-person Visit</option>
                    <option value="Telehealth">Telehealth / Video Call</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={transportArranged}
                      onChange={(e) => setTransportArranged(e.target.checked)}
                      className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>Ride already arranged</span>
                  </label>
                </div>
              </div>

              {type === 'In-person' && (
                <>
                  <Input
                    label="Clinic / Hospital Name"
                    placeholder="e.g. St. Jude Heart Center"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                  <Input
                    label="Address"
                    placeholder="e.g. 420 Health Parkway, Suite 300"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </>
              )}

              <Input
                label="Preparation Notes / Papers to Bring"
                placeholder="e.g. Bring fasting blood sugar records and updated Medicare card"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="font-bold"
                >
                  Save Appointment
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
