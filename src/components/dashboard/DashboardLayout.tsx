import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { OverviewView } from './views/OverviewView';
import { MedicationsView } from './views/MedicationsView';
import { AppointmentsView } from './views/AppointmentsView';
import { CareCircleView } from './views/CareCircleView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { CreateElderlyProfileModal } from './CreateElderlyProfileModal';
import { 
  NavigationTab, 
  Medication, 
  Appointment, 
  HealthMetric, 
  AccessibilitySettings 
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Ticket, PlusCircle, AlertCircle, HeartPulse, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface DashboardLayoutProps {
  medications: Medication[];
  appointments: Appointment[];
  vitals: HealthMetric[];
  accessibility: AccessibilitySettings;
  onUpdateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  onMarkMedTaken: (id: string) => void;
  onAddMedication: (med: Omit<Medication, 'id'>) => void;
  onAddAppointment: (apt: Omit<Appointment, 'id'>) => void;
  onUpdateEmergencyContact: (name: string, phone: string, relation: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  medications,
  appointments,
  vitals,
  accessibility,
  onUpdateAccessibility,
  onMarkMedTaken,
  onAddMedication,
  onAddAppointment,
  onUpdateEmergencyContact,
}) => {
  const { user, elderlyProfile, signOut, acceptInvitation, isOwner, isCaretaker, isFamilyMember } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Invite code input state for caretakers/family members without profile
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const pendingMedsCount = medications.filter(m => m.status === 'pending').length;
  const upcomingAptsCount = appointments.filter(a => a.status === 'upcoming').length;

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    setInviteError(null);
    setIsRedeeming(true);
    const res = await acceptInvitation(inviteCodeInput.trim());
    setIsRedeeming(false);

    if (!res.success) {
      setInviteError(res.error || 'Failed to accept invitation.');
    } else {
      setInviteCodeInput('');
    }
  };

  // Safe fallback user if null
  const activeUser = user || {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@carebridge.health',
    role: 'elderly' as const,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <TopBar
        user={activeUser}
        elderlyProfile={elderlyProfile}
        accessibility={accessibility}
        onUpdateAccessibility={onUpdateAccessibility}
        onSignOut={signOut}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex">
        {/* Responsive Sidebar with User Role */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingMedsCount={pendingMedsCount}
          upcomingAptsCount={upcomingAptsCount}
          role={activeUser.role}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onSignOut={signOut}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          
          {/* PROFILE SETUP PROMPT: For Elderly Owners who haven't set up profile */}
          {isOwner && !elderlyProfile && (
            <div className="mb-6 p-6 rounded-3xl bg-brand-50 border-2 border-brand-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-brand-600 text-white shrink-0">
                  <HeartPulse className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Complete Your Healthcare Profile Setup</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Configure your name, 4-digit senior passcode, and emergency proxy to start coordinating with your family and caregivers.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<PlusCircle className="w-5 h-5" />}
                onClick={() => setShowCreateModal(true)}
                className="font-bold shrink-0"
              >
                Set Up Profile Now
              </Button>
            </div>
          )}

          {/* JOIN CARE CIRCLE PROMPT: For Caretakers & Family without connected profile */}
          {!isOwner && !elderlyProfile && (
            <div className="mb-6 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-brand-100 text-brand-700">
                  <Ticket className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Join an Elderly Care Circle</h3>
                  <p className="text-sm text-slate-500">
                    You are signed in as a <strong>{isCaretaker ? 'Caretaker' : 'Family Member'}</strong>. Enter an invitation code to connect to an elderly healthcare profile.
                  </p>
                </div>
              </div>

              {inviteError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <form onSubmit={handleRedeemInvite} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="e.g. CARE-NW89K2"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isRedeeming}
                  className="font-bold"
                >
                  {isRedeeming ? 'Connecting...' : 'Redeem Code'}
                </Button>
              </form>
            </div>
          )}

          {/* ROLE ACCESS BANNER */}
          {isFamilyMember && (
            <div className="mb-5 p-3.5 rounded-2xl bg-sage-50 border border-sage-200 text-xs text-sage-900 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
              <span>
                <strong>Family Member Access:</strong> You have viewing permissions for medications, vitals, and appointments. Caregiver dose changes and member management are administered by the Profile Owner.
              </span>
            </div>
          )}

          {currentTab === 'overview' && (
            <OverviewView
              medications={medications}
              appointments={appointments}
              vitals={vitals}
              onMarkMedTaken={onMarkMedTaken}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'medications' && (
            <MedicationsView
              medications={medications}
              onMarkTaken={onMarkMedTaken}
              onAddMedication={onAddMedication}
            />
          )}

          {currentTab === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              onAddAppointment={onAddAppointment}
            />
          )}

          {currentTab === 'care-circle' && (
            <CareCircleView />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              vitals={vitals}
              patientName={elderlyProfile?.full_name || activeUser.name}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              user={activeUser}
              accessibility={accessibility}
              onUpdateAccessibility={onUpdateAccessibility}
              onUpdateEmergencyContact={onUpdateEmergencyContact}
            />
          )}
        </main>
      </div>

      {/* Profile Creation Modal */}
      <CreateElderlyProfileModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCompleted={() => setShowCreateModal(false)}
      />
    </div>
  );
};
