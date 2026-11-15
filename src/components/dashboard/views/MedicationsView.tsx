import React, { useState } from 'react';
import { 
  Pill, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Stethoscope, 
  Info,
  X
} from 'lucide-react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Input } from '../../common/Input';
import { Medication, MedicationTimeOfDay } from '../../../types';

interface MedicationsViewProps {
  medications: Medication[];
  onMarkTaken: (id: string) => void;
  onAddMedication: (med: Omit<Medication, 'id'>) => void;
}

export const MedicationsView: React.FC<MedicationsViewProps> = ({
  medications,
  onMarkTaken,
  onAddMedication,
}) => {
  const [activeFilterTime, setActiveFilterTime] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New medication form state
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTimeOfDay, setNewTimeOfDay] = useState<MedicationTimeOfDay>('Morning');
  const [newScheduleTime, setNewScheduleTime] = useState('08:00 AM');
  const [newPurpose, setNewPurpose] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newDoctor, setNewDoctor] = useState('');

  const timeFilterOptions = ['All', 'Morning', 'Afternoon', 'Evening', 'Bedtime'];

  const filteredMeds = medications.filter((med) => {
    const matchesTime = activeFilterTime === 'All' || med.timeOfDay === activeFilterTime;
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          med.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTime && matchesSearch;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDosage.trim()) return;

    onAddMedication({
      name: newName,
      dosage: newDosage,
      timeOfDay: newTimeOfDay,
      scheduleTime: newScheduleTime,
      purpose: newPurpose || 'Daily Health Maintenance',
      instructions: newInstructions || 'Take with water as directed',
      status: 'pending',
      pillColor: 'bg-brand-100 text-brand-700 border-brand-300',
      remainingCount: 30,
      refillNeeded: false,
      prescribingDoctor: newDoctor || 'Primary Care Physician',
    });

    // Reset and close
    setNewName('');
    setNewDosage('');
    setNewPurpose('');
    setNewInstructions('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Medication Management
          </h1>
          <p className="text-base text-slate-500 font-normal">
            Clear daily prescription schedules, doses, and refill monitoring.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
          className="shadow-sm"
        >
          Add New Medication
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Time of Day Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">
            Time:
          </span>
          {timeFilterOptions.map((time) => (
            <button
              key={time}
              onClick={() => setActiveFilterTime(time)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                activeFilterTime === time
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {time}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full md:w-72">
          <Input
            placeholder="Search pill name or condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="text-sm py-2"
          />
        </div>

      </div>

      {/* Medication Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredMeds.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No medications match your search</h3>
            <p className="text-sm text-slate-500 mt-1">Try selecting "All" or adjusting the search term.</p>
          </div>
        ) : (
          filteredMeds.map((med) => {
            const isTaken = med.status === 'taken';
            return (
              <Card
                key={med.id}
                className={`p-6 flex flex-col justify-between transition-all ${
                  isTaken ? 'bg-white border-slate-200' : 'bg-white border-brand-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  
                  {/* Header: Name, Dosage and Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200 shrink-0 mt-0.5">
                        <Pill className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900">{med.name}</h3>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                            {med.dosage}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 font-medium mt-0.5">{med.purpose}</p>
                      </div>
                    </div>

                    <Badge variant={isTaken ? 'green' : 'amber'} size="md">
                      {isTaken ? 'Taken ✓' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Instructions Callout */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <span>{med.instructions}</span>
                  </div>

                  {/* Metadata: Schedule & Refill alerts */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{med.timeOfDay} at {med.scheduleTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {med.refillNeeded ? (
                        <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Refill soon ({med.remainingCount} left)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {med.remainingCount} doses remaining
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Prescribed by {med.prescribingDoctor}</span>
                  </div>

                </div>

                {/* Bottom Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {isTaken ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-sage-50 text-sage-800 rounded-xl border border-sage-200 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-sage-600" />
                      <span>Dose Confirmed for Today</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      onClick={() => onMarkTaken(med.id)}
                      className="bg-brand-600 hover:bg-brand-700 font-bold"
                    >
                      Confirm I Took This Pill
                    </Button>
                  )}
                </div>

              </Card>
            );
          })
        )}
      </div>

      {/* Add Medication Accessible Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Add New Medication</h3>
                  <p className="text-xs text-slate-500">Add a prescription to daily schedules</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <Input
                label="Medication Name"
                placeholder="e.g. Amlodipine"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Dosage"
                  placeholder="e.g. 5mg Tablet"
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-base font-semibold text-slate-800 mb-2">
                    Time of Day
                  </label>
                  <select
                    value={newTimeOfDay}
                    onChange={(e) => setNewTimeOfDay(e.target.value as MedicationTimeOfDay)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 text-base min-h-[50px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Bedtime">Bedtime</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Schedule Time"
                  placeholder="e.g. 08:30 AM"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                />

                <Input
                  label="Health Purpose"
                  placeholder="e.g. Blood pressure"
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                />
              </div>

              <Input
                label="Specific Instructions"
                placeholder="e.g. Take with food or full glass of water"
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
              />

              <Input
                label="Prescribing Doctor"
                placeholder="e.g. Dr. Sarah Mitchell"
                value={newDoctor}
                onChange={(e) => setNewDoctor(e.target.value)}
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
                  Save Medication
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
