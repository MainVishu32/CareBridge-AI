import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, 
  ElderlyProfile, 
  ProfileMember, 
  ProfileInvitation, 
  UserRole,
  ProfileMemberRole,
  Medication,
  Appointment,
  DbNotification
} from '../types';
import { authService } from '../services/authService';
import { dbService } from '../services/dbService';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  elderlyProfile: ElderlyProfile | null;
  role: UserRole | null;
  members: ProfileMember[];
  pendingInvitations: ProfileInvitation[];
  medications: Medication[];
  appointments: Appointment[];
  notifications: DbNotification[];
  isLoading: boolean;
  isCareCircleLoading: boolean;
  error: string | null;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: { email: string; password: string; fullName: string; role: UserRole; phone?: string }) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signInWithPasscode: (passcode: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;

  // Profile & Invitation methods
  createElderlyProfile: (params: {
    fullName: string;
    dateOfBirth?: string;
    passcode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  }) => Promise<{ success: boolean; error?: string }>;
  inviteMember: (email: string, role: ProfileMemberRole) => Promise<{ invitation: ProfileInvitation | null; error?: string }>;
  verifyInvitation: (inviteCode: string, email: string) => Promise<{ role?: ProfileMemberRole; error?: string }>;
  acceptInvitation: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  revokeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  refreshCareCircleData: () => Promise<void>;
  refreshProfileData: () => Promise<void>;

  // Healthcare Database Operations
  markMedicationTaken: (id: string) => Promise<{ success: boolean; error?: string }>;
  addMedication: (med: Omit<Medication, 'id'>) => Promise<{ success: boolean; error?: string }>;
  addAppointment: (apt: Omit<Appointment, 'id'>) => Promise<{ success: boolean; error?: string }>;
  markNotificationAsRead: (id: string) => Promise<void>;

  // Permission helpers
  isOwner: boolean;
  isCaretaker: boolean;
  isFamilyMember: boolean;
  canManageMembers: boolean;
  canManageActivities: boolean;
  canViewHealth: boolean;
  canRevokeMember: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [elderlyProfile, setElderlyProfile] = useState<ElderlyProfile | null>(null);
  const [members, setMembers] = useState<ProfileMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ProfileInvitation[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCareCircleLoading, setIsCareCircleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session on startup
  useEffect(() => {
    async function loadInitialSession() {
      setIsLoading(true);
      try {
        const sessionUser = await authService.getActiveSession();
        if (sessionUser) {
          setUser(sessionUser);
          await loadHealthcareData(sessionUser);
        }
      } catch (err: unknown) {
        console.error('Session load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialSession();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client || !user || !elderlyProfile) return;

    const channel = client
      .channel(`care-circle-access-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'care_members',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          const membership = payload.new as { care_profile_id?: string; status?: string };
          if (membership.care_profile_id !== elderlyProfile.id || membership.status !== 'revoked') return;

          setElderlyProfile(null);
          setMembers([]);
          setPendingInvitations([]);
          setIsCareCircleLoading(false);
          setMedications([]);
          setAppointments([]);
          setNotifications([]);
          setError('Your access to this care profile has been revoked.');
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user?.id, elderlyProfile?.id]);

  async function loadHealthcareData(currentUser: UserProfile) {
    setError(null);
    setMembers([]);
    setPendingInvitations([]);
    setIsCareCircleLoading(false);
    setMedications([]);
    setAppointments([]);
    setNotifications([]);
    try {
      const ep = await authService.getElderlyProfile(currentUser.id, currentUser.role);
      setElderlyProfile(ep);

      if (ep) {
        const [medsRes, aptsRes, notifsRes] = await Promise.all([
          dbService.getMedications(ep.id, currentUser.id),
          dbService.getAppointments(ep.id, currentUser.id),
          dbService.getNotifications(ep.id, currentUser.id),
        ]);

        const requestErrors = [medsRes.error, aptsRes.error, notifsRes.error].filter(
          (requestError): requestError is string => Boolean(requestError),
        );
        if (requestErrors.length > 0) {
          throw new Error(requestErrors.join(' '));
        }

        setMedications(medsRes.data);
        setAppointments(aptsRes.data);
        setNotifications(notifsRes.data);
      } else {
        setMembers([]);
        setPendingInvitations([]);
        setMedications([]);
        setAppointments([]);
        setNotifications([]);
      }
    } catch (err: unknown) {
      console.error('Error loading healthcare profile details from database:', err);
      setError('Unable to load secure care profile data. Please refresh and try again.');
    }
  }

  const refreshProfileData = async () => {
    if (user) {
      await loadHealthcareData(user);
    }
  };

  const refreshCareCircleData = useCallback(async () => {
    if (!user || !elderlyProfile) {
      setMembers([]);
      setPendingInvitations([]);
      return;
    }

    setIsCareCircleLoading(true);
    try {
      const isProfileOwner = user.role === 'elderly' && elderlyProfile.owner_id === user.id;
      const [profileMembers, invitations] = await Promise.all([
        authService.getProfileMembers(elderlyProfile.id, user.id),
        isProfileOwner
          ? authService.getPendingInvitations(elderlyProfile.id, user.id)
          : Promise.resolve([]),
      ]);
      setMembers(profileMembers);
      setPendingInvitations(invitations);
    } catch (err) {
      console.error('Error loading Care Circle data:', err);
      setError('Unable to load secure care circle data. Please try again.');
    } finally {
      setIsCareCircleLoading(false);
    }
  }, [user, elderlyProfile]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    const result = await authService.signIn(email, password);
    setIsLoading(false);

    if (result.error || !result.user) {
      setError(result.error || 'Login failed');
      return { success: false, error: result.error };
    }

    setUser(result.user);
    await loadHealthcareData(result.user);
    return { success: true };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
  }) => {
    setError(null);
    setIsLoading(true);
    const result = await authService.signUp(params);
    setIsLoading(false);

    if (result.needsEmailConfirmation) {
      return { success: false, needsEmailConfirmation: true };
    }

    if (result.error || !result.user) {
      setError(result.error || 'Registration failed');
      return {
        success: false,
        error: result.error,
        needsEmailConfirmation: result.needsEmailConfirmation,
      };
    }

    setUser(result.user);
    await loadHealthcareData(result.user);
    return { success: true };
  };

  const signInWithPasscode = async (passcode: string) => {
    setError(null);
    setIsLoading(true);
    const result = await authService.signInWithPasscode(passcode);
    setIsLoading(false);

    if (result.error || !result.user) {
      setError(result.error || 'Passcode authentication failed');
      return { success: false, error: result.error };
    }

    setUser(result.user);
    setElderlyProfile(result.elderlyProfile);
    await loadHealthcareData(result.user);
    return { success: true };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setElderlyProfile(null);
    setMembers([]);
    setPendingInvitations([]);
    setIsCareCircleLoading(false);
    setMedications([]);
    setAppointments([]);
    setNotifications([]);
    setError(null);
  };

  const createElderlyProfile = async (params: {
    fullName: string;
    dateOfBirth?: string;
    passcode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  }) => {
    if (!user) return { success: false, error: 'User must be authenticated' };

    setIsLoading(true);
    const result = await authService.createElderlyProfile({
      ownerId: user.id,
      ...params,
    });
    setIsLoading(false);

    if (result.error || !result.profile) {
      return { success: false, error: result.error };
    }

    setElderlyProfile(result.profile);
    await refreshProfileData();
    return { success: true };
  };

  const inviteMember = async (email: string, role: ProfileMemberRole) => {
    if (!user || !elderlyProfile) {
      return { invitation: null, error: 'No active profile found' };
    }

    // Enforce owner permission
    if (user.role !== 'elderly' || elderlyProfile.owner_id !== user.id) {
      return { invitation: null, error: 'Unauthorized: Only the elderly profile owner can issue invitations.' };
    }

    const result = await authService.createInvitation({
      elderlyProfileId: elderlyProfile.id,
      invitedBy: user.id,
      invitedEmail: email,
      role,
    });

    const invitation = result.invitation;
    if (result.error || !invitation) {
      return { invitation: null, error: result.error || 'Invitation was not created.' };
    }

    setPendingInvitations(prev => [invitation, ...prev]);
    return { invitation };
  };

  const acceptInvitation = async (inviteCode: string) => {
    if (!user) return { success: false, error: 'Please sign in first to redeem an invitation code.' };

    setIsLoading(true);
    try {
      const result = await authService.acceptInvitation(inviteCode, user);
      if (!result.success) return result;

      const updatedUser = result.role ? { ...user, role: result.role } : user;
      setUser(updatedUser);
      await loadHealthcareData(updatedUser);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redeem invitation.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const revokeMember = async (memberId: string) => {
    if (!user || !elderlyProfile) return { success: false, error: 'No active profile' };

    const result = await authService.revokeMember(memberId, user.id, elderlyProfile);
    if (result.success) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'revoked' } : m));
    }
    return result;
  };

  // --------------------------------------------------------------------------
  // HEALTHCARE DATA OPERATIONS
  // --------------------------------------------------------------------------

  const markMedicationTaken = async (id: string) => {
    if (!elderlyProfile) return { success: false, error: 'No active profile' };

    const res = await dbService.logMedicationDose({
      medicationId: id,
      elderlyProfileId: elderlyProfile.id,
      status: 'taken',
      loggedBy: user?.id,
    }, user?.id);

    if (res.success) {
      setMedications(prev =>
        prev.map(med =>
          med.id === id ? { ...med, status: 'taken' as const, remainingCount: Math.max(0, med.remainingCount - 1) } : med
        )
      );
    }
    return res;
  };

  const addMedication = async (med: Omit<Medication, 'id'>) => {
    if (!elderlyProfile) return { success: false, error: 'No active profile' };

    const res = await dbService.createMedication({
      elderlyProfileId: elderlyProfile.id,
      name: med.name,
      dosage: med.dosage,
      purpose: med.purpose,
      instructions: med.instructions,
      prescribingDoctor: med.prescribingDoctor,
      pillColor: med.pillColor,
      remainingCount: med.remainingCount,
      scheduleTime: med.scheduleTime,
      timeOfDay: med.timeOfDay,
    }, user?.id);

    if (res.data) {
      setMedications(prev => [res.data!, ...prev]);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const addAppointment = async (apt: Omit<Appointment, 'id'>) => {
    if (!elderlyProfile) return { success: false, error: 'No active profile' };

    const res = await dbService.createAppointment({
      elderlyProfileId: elderlyProfile.id,
      title: apt.title,
      doctorName: apt.doctorName,
      specialty: apt.specialty,
      clinicName: apt.clinicName,
      address: apt.address,
      appointmentDate: apt.date,
      appointmentTime: apt.time,
      appointmentType: apt.type,
      transportArranged: apt.transportArranged,
      notes: apt.notes,
      createdBy: user?.id,
    }, user?.id);

    if (res.data) {
      setAppointments(prev => [res.data!, ...prev]);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const markNotificationAsRead = async (id: string) => {
    const result = await dbService.markNotificationAsRead(id);
    if (!result.success) {
      setError(result.error || 'Unable to update notification.');
      return;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  // Permissions logic
  const isOwner = user?.role === 'elderly';
  const isCaretaker = user?.role === 'caretaker';
  const isFamilyMember = user?.role === 'family_member';

  const canManageMembers = isOwner;
  const canRevokeMember = isOwner;
  const canManageActivities = isOwner || isCaretaker;
  const canViewHealth = Boolean(user && elderlyProfile);

  return (
    <AuthContext.Provider
      value={{
        user,
        elderlyProfile,
        role: user?.role || null,
        members,
        pendingInvitations,
        medications,
        appointments,
        notifications,
        isLoading,
        isCareCircleLoading,
        error,
        signIn,
        signUp,
        signInWithPasscode,
        signOut,
        createElderlyProfile,
        inviteMember,
        verifyInvitation: authService.verifyInvitation,
        acceptInvitation,
        revokeMember,
        refreshCareCircleData,
        refreshProfileData,
        markMedicationTaken,
        addMedication,
        addAppointment,
        markNotificationAsRead,
        isOwner,
        isCaretaker,
        isFamilyMember,
        canManageMembers,
        canManageActivities,
        canViewHealth,
        canRevokeMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
