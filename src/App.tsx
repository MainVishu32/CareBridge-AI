import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingHeader } from './components/landing/Header';
import { HeroSection } from './components/landing/HeroSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { AudienceSection } from './components/landing/AudienceSection';
import { TestimonialSection } from './components/landing/TestimonialSection';
import { Footer } from './components/landing/Footer';
import { AuthView } from './components/auth/AuthView';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { 
  Medication, 
  Appointment, 
  HealthMetric, 
  AccessibilitySettings,
  AuthMode 
} from './types';
import { 
  initialMedications, 
  initialAppointments, 
  initialVitals 
} from './data/mockData';

const AppContent: React.FC = () => {
  const { 
    user, 
    isLoading,
    medications: dbMedications,
    appointments: dbAppointments,
    markMedicationTaken,
    addMedication,
    addAppointment
  } = useAuth();

  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  
  // Dynamic medications & appointments linked to Supabase/Database service
  // If user is logged in, use live database data; if guest preview, fallback to initial
  const activeMedications = user && dbMedications.length > 0 ? dbMedications : initialMedications;
  const activeAppointments = user && dbAppointments.length > 0 ? dbAppointments : initialAppointments;
  const [vitals] = useState<HealthMetric[]>(initialVitals);

  // Accessibility State
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    fontSize: 'normal',
    highContrast: false,
    audioVoiceAssistance: false,
    simplifiedCards: false,
  });

  // Apply Accessibility Classes to <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-normal', 'font-large', 'font-xlarge', 'high-contrast');

    root.classList.add(`font-${accessibility.fontSize}`);
    if (accessibility.highContrast) {
      root.classList.add('high-contrast');
    }
  }, [accessibility.fontSize, accessibility.highContrast]);

  // Session persistence route check: if user is logged in and was on auth, move to dashboard
  useEffect(() => {
    if (user && view === 'auth') {
      setView('dashboard');
    }
  }, [user, view]);

  // Route protection: If user is on dashboard and logs out, redirect to landing
  useEffect(() => {
    if (!user && !isLoading && view === 'dashboard') {
      setView('landing');
    }
  }, [user, isLoading, view]);

  // Navigation handlers
  const handleOpenAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setView('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDashboard = () => {
    if (user) {
      setView('dashboard');
    } else {
      // Protected route: Prompt login if not authenticated
      setAuthMode('login');
      setView('auth');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkMedTaken = async (id: string) => {
    if (user) {
      await markMedicationTaken(id);
    }
  };

  const handleAddMedication = async (newMed: Omit<Medication, 'id'>) => {
    if (user) {
      await addMedication(newMed);
    }
  };

  const handleAddAppointment = async (newApt: Omit<Appointment, 'id'>) => {
    if (user) {
      await addAppointment(newApt);
    }
  };

  const handleUpdateEmergencyContact = (name: string, phone: string, relation: string) => {
    console.log('Emergency contact updated:', { name, phone, relation });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      
      {/* 1. LANDING PAGE VIEW */}
      {view === 'landing' && (
        <div className="flex flex-col min-h-screen">
          <LandingHeader
            onOpenAuth={handleOpenAuth}
            onNavigateToDemo={handleOpenDashboard}
            fontSize={accessibility.fontSize}
            onSetFontSize={(size) => setAccessibility(prev => ({ ...prev, fontSize: size }))}
          />
          <main className="flex-1">
            <HeroSection
              onGetStarted={handleOpenDashboard}
              onOpenPasscode={() => handleOpenAuth('passcode')}
            />
            <FeaturesSection />
            <AudienceSection />
            <TestimonialSection />
          </main>
          <Footer
            onOpenAuth={handleOpenAuth}
            onNavigateToDemo={handleOpenDashboard}
          />
        </div>
      )}

      {/* 2. AUTHENTICATION VIEW (Passcode / Login / Register / Invite) */}
      {view === 'auth' && (
        <AuthView
          initialMode={authMode}
          onSuccess={handleAuthSuccess}
          onBackToLanding={() => setView('landing')}
        />
      )}

      {/* 3. DASHBOARD VIEW (Protected by Authentication & Roles) */}
      {view === 'dashboard' && (
        <DashboardLayout
          medications={activeMedications}
          appointments={activeAppointments}
          vitals={vitals}
          accessibility={accessibility}
          onUpdateAccessibility={(updates) => setAccessibility(prev => ({ ...prev, ...updates }))}
          onMarkMedTaken={handleMarkMedTaken}
          onAddMedication={handleAddMedication}
          onAddAppointment={handleAddAppointment}
          onUpdateEmergencyContact={handleUpdateEmergencyContact}
        />
      )}

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
