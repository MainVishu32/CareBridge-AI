/**
 * Phase 3 Database Service Layer
 * Scalable PostgreSQL & Supabase database integration for:
 * - Medications & Medication Schedules
 * - Medication Compliance Logs
 * - Doctor Appointments
 * - Notifications
 * - Activity Logs & Healthcare Audit Trails
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { 
  DbMedication, 
  DbMedicationSchedule, 
  DbMedicationLog, 
  DbAppointment, 
  DbNotification, 
  DbActivityLog,
  CreateMedicationInput,
  CreateAppointmentInput,
  LogMedicationDoseInput,
  CreateNotificationInput,
  CreateActivityLogInput,
  Medication,
  Appointment,
  ElderlyProfile,
  ProfileMember
} from '../types';

// Persistent storage keys
const STORAGE_MEDICATIONS_KEY = 'carebridge_db_medications';
const STORAGE_SCHEDULES_KEY = 'carebridge_db_medication_schedules';
const STORAGE_MED_LOGS_KEY = 'carebridge_db_medication_logs';
const STORAGE_APPOINTMENTS_KEY = 'carebridge_db_appointments';
const STORAGE_NOTIFICATIONS_KEY = 'carebridge_db_notifications';
const STORAGE_ACTIVITY_LOGS_KEY = 'carebridge_db_activity_logs';
const STORAGE_ELDERLY_PROFILES_KEY = 'carebridge_db_elderly_profiles';
const STORAGE_MEMBERS_KEY = 'carebridge_db_members';

// Safe helper to read from persistent storage
function getStoredItems<T>(key: string): T[] {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Safe helper to save to persistent storage
function setStoredItems<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error(`Storage error for key ${key}:`, err);
  }
}

/**
 * Verify authorization for the given profile and user
 */
function verifyProfileAuthorization(elderlyProfileId: string, currentUserId?: string): boolean {
  if (!currentUserId) return true; // Internal service or authenticated supabase session

  const elderlyProfiles: ElderlyProfile[] = getStoredItems(STORAGE_ELDERLY_PROFILES_KEY);
  const profile = elderlyProfiles.find(p => p.id === elderlyProfileId);
  if (profile && profile.owner_id === currentUserId) return true;

  const members: ProfileMember[] = getStoredItems(STORAGE_MEMBERS_KEY);
  return members.some(m => 
    m.elderly_profile_id === elderlyProfileId && 
    m.user_id === currentUserId && 
    m.status === 'active'
  );
}

/**
 * Verify caregiver or owner management privileges
 */
function verifyManagementAuthorization(elderlyProfileId: string, currentUserId?: string): boolean {
  if (!currentUserId) return true;

  const elderlyProfiles: ElderlyProfile[] = getStoredItems(STORAGE_ELDERLY_PROFILES_KEY);
  const profile = elderlyProfiles.find(p => p.id === elderlyProfileId);
  if (profile && profile.owner_id === currentUserId) return true;

  const members: ProfileMember[] = getStoredItems(STORAGE_MEMBERS_KEY);
  return members.some(m => 
    m.elderly_profile_id === elderlyProfileId && 
    m.user_id === currentUserId && 
    m.status === 'active' &&
    m.role === 'caretaker'
  );
}

/**
 * Seeds initial clinical records for an elderly profile if empty
 */
export function ensureInitialHealthcareData(elderlyProfileId: string): void {
  const existingMeds = getStoredItems<DbMedication>(STORAGE_MEDICATIONS_KEY);
  const profileMeds = existingMeds.filter(m => m.elderly_profile_id === elderlyProfileId);

  if (profileMeds.length === 0) {
    const initialMeds: DbMedication[] = [
      {
        id: `med-${elderlyProfileId}-1`,
        elderly_profile_id: elderlyProfileId,
        name: 'Lisinopril',
        dosage: '10mg Tablet',
        purpose: 'Blood Pressure regulation',
        instructions: 'Take 1 tablet with a full glass of water after breakfast',
        prescribing_doctor: 'Dr. Sarah Mitchell, Cardiology',
        pill_color: 'bg-blue-100 text-blue-700 border-blue-300',
        remaining_count: 24,
        refill_threshold: 5,
        refill_needed: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: `med-${elderlyProfileId}-2`,
        elderly_profile_id: elderlyProfileId,
        name: 'Metformin',
        dosage: '500mg Capsule',
        purpose: 'Glucose control',
        instructions: 'Take with food to minimize stomach discomfort',
        prescribing_doctor: 'Dr. Robert Chen, Endocrinology',
        pill_color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        remaining_count: 18,
        refill_threshold: 5,
        refill_needed: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: `med-${elderlyProfileId}-3`,
        elderly_profile_id: elderlyProfileId,
        name: 'Vitamin D3 & Calcium',
        dosage: '1000 IU Softgel',
        purpose: 'Bone density support',
        instructions: 'Take after lunch meal',
        prescribing_doctor: 'Dr. Emily Watson, Geriatrician',
        pill_color: 'bg-amber-100 text-amber-700 border-amber-300',
        remaining_count: 12,
        refill_threshold: 5,
        refill_needed: false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: `med-${elderlyProfileId}-4`,
        elderly_profile_id: elderlyProfileId,
        name: 'Atorvastatin',
        dosage: '20mg Tablet',
        purpose: 'Cholesterol management',
        instructions: 'Take once daily in the evening at bedtime',
        prescribing_doctor: 'Dr. Sarah Mitchell, Cardiology',
        pill_color: 'bg-purple-100 text-purple-700 border-purple-300',
        remaining_count: 4,
        refill_threshold: 7,
        refill_needed: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    const initialSchedules: DbMedicationSchedule[] = [
      {
        id: `sch-${elderlyProfileId}-1`,
        medication_id: `med-${elderlyProfileId}-1`,
        elderly_profile_id: elderlyProfileId,
        time_of_day: 'Morning',
        schedule_time: '08:00:00',
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        dosage_quantity: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: `sch-${elderlyProfileId}-2`,
        medication_id: `med-${elderlyProfileId}-2`,
        elderly_profile_id: elderlyProfileId,
        time_of_day: 'Morning',
        schedule_time: '08:00:00',
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        dosage_quantity: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: `sch-${elderlyProfileId}-3`,
        medication_id: `med-${elderlyProfileId}-3`,
        elderly_profile_id: elderlyProfileId,
        time_of_day: 'Afternoon',
        schedule_time: '13:00:00',
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        dosage_quantity: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: `sch-${elderlyProfileId}-4`,
        medication_id: `med-${elderlyProfileId}-4`,
        elderly_profile_id: elderlyProfileId,
        time_of_day: 'Evening',
        schedule_time: '20:00:00',
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        dosage_quantity: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    const initialLogs: DbMedicationLog[] = [
      {
        id: `log-${elderlyProfileId}-1`,
        medication_id: `med-${elderlyProfileId}-1`,
        schedule_id: `sch-${elderlyProfileId}-1`,
        elderly_profile_id: elderlyProfileId,
        scheduled_for: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
        status: 'taken',
        taken_at: new Date(new Date().setHours(8, 15, 0, 0)).toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: `log-${elderlyProfileId}-2`,
        medication_id: `med-${elderlyProfileId}-2`,
        schedule_id: `sch-${elderlyProfileId}-2`,
        elderly_profile_id: elderlyProfileId,
        scheduled_for: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
        status: 'taken',
        taken_at: new Date(new Date().setHours(8, 20, 0, 0)).toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: `log-${elderlyProfileId}-3`,
        medication_id: `med-${elderlyProfileId}-3`,
        schedule_id: `sch-${elderlyProfileId}-3`,
        elderly_profile_id: elderlyProfileId,
        scheduled_for: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      {
        id: `log-${elderlyProfileId}-4`,
        medication_id: `med-${elderlyProfileId}-4`,
        schedule_id: `sch-${elderlyProfileId}-4`,
        elderly_profile_id: elderlyProfileId,
        scheduled_for: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ];

    setStoredItems(STORAGE_MEDICATIONS_KEY, [...existingMeds, ...initialMeds]);
    const existingSchedules = getStoredItems<DbMedicationSchedule>(STORAGE_SCHEDULES_KEY);
    setStoredItems(STORAGE_SCHEDULES_KEY, [...existingSchedules, ...initialSchedules]);
    const existingLogs = getStoredItems<DbMedicationLog>(STORAGE_MED_LOGS_KEY);
    setStoredItems(STORAGE_MED_LOGS_KEY, [...existingLogs, ...initialLogs]);
  }

  // Ensure initial appointments
  const existingApts = getStoredItems<DbAppointment>(STORAGE_APPOINTMENTS_KEY);
  const profileApts = existingApts.filter(a => a.elderly_profile_id === elderlyProfileId);

  if (profileApts.length === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 5);

    const initialApts: DbAppointment[] = [
      {
        id: `apt-${elderlyProfileId}-1`,
        elderly_profile_id: elderlyProfileId,
        title: 'Comprehensive Geriatric Assessment & Review',
        doctor_name: 'Dr. Emily Watson, MD',
        specialty: 'Geriatric Medicine',
        clinic_name: 'Oakwood Senior Health Pavilion',
        address: '420 Meadowood Drive, Suite 300',
        appointment_date: tomorrow.toISOString().split('T')[0],
        appointment_time: '10:30:00',
        appointment_type: 'In-person',
        transport_arranged: true,
        notes: 'Bring current medication list and recent blood glucose logs. Wheelchair accessible transport confirmed.',
        status: 'upcoming',
        created_at: new Date().toISOString(),
      },
      {
        id: `apt-${elderlyProfileId}-2`,
        elderly_profile_id: elderlyProfileId,
        title: 'Routine Cardiology Follow-up & ECG',
        doctor_name: 'Dr. Sarah Mitchell, FACC',
        specialty: 'Cardiovascular Care',
        clinic_name: 'Bay Area Heart Institute',
        address: '1100 Medical Center Parkway, Bldg B',
        appointment_date: nextWeek.toISOString().split('T')[0],
        appointment_time: '02:00:00',
        appointment_type: 'In-person',
        transport_arranged: false,
        notes: 'Review 30-day blood pressure trend. Inquire about Lisinopril dosage adjustment.',
        status: 'upcoming',
        created_at: new Date().toISOString(),
      },
      {
        id: `apt-${elderlyProfileId}-3`,
        elderly_profile_id: elderlyProfileId,
        title: 'Endocrinology Video Consultation',
        doctor_name: 'Dr. Robert Chen, MD',
        specialty: 'Endocrinology & Diabetes Care',
        clinic_name: 'Telehealth Virtual Clinic',
        address: 'Secure Video Room (CareBridge App)',
        appointment_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
        appointment_time: '11:15:00',
        appointment_type: 'Telehealth',
        transport_arranged: false,
        notes: 'Review HbA1c lab results and fasting morning blood glucose readings.',
        status: 'upcoming',
        created_at: new Date().toISOString(),
      },
    ];

    setStoredItems(STORAGE_APPOINTMENTS_KEY, [...existingApts, ...initialApts]);
  }

  // Ensure initial notifications
  const existingNotifications = getStoredItems<DbNotification>(STORAGE_NOTIFICATIONS_KEY);
  const profileNotifications = existingNotifications.filter(n => n.elderly_profile_id === elderlyProfileId);

  if (profileNotifications.length === 0) {
    const initialNotes: DbNotification[] = [
      {
        id: `notif-${elderlyProfileId}-1`,
        elderly_profile_id: elderlyProfileId,
        recipient_user_id: 'all',
        title: 'Prescription Refill Reminder',
        message: 'Atorvastatin (20mg) has only 4 tablets remaining. Please coordinate with pharmacy for a refill.',
        type: 'medication_reminder',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: `notif-${elderlyProfileId}-2`,
        elderly_profile_id: elderlyProfileId,
        recipient_user_id: 'all',
        title: 'Upcoming Appointment Confirmed',
        message: 'Comprehensive Geriatric Review with Dr. Emily Watson tomorrow at 10:30 AM.',
        type: 'appointment_reminder',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];
    setStoredItems(STORAGE_NOTIFICATIONS_KEY, [...existingNotifications, ...initialNotes]);
  }
}

// ==============================================================================
// CORE HEALTHCARE DATABASE SERVICE
// ==============================================================================

export const dbService = {
  // ----------------------------------------------------------------------------
  // MEDICATIONS & SCHEDULES & LOGS
  // ----------------------------------------------------------------------------

  /**
   * Get all active medications for an elderly profile with schedules and today's status
   */
  async getMedications(elderlyProfileId: string, currentUserId?: string): Promise<{ data: Medication[]; error?: string }> {
    if (!elderlyProfileId) return { data: [] };

    // Security authorization check
    if (!verifyProfileAuthorization(elderlyProfileId, currentUserId)) {
      return { data: [], error: 'Unauthorized: You do not have access to this healthcare profile medications.' };
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('medications')
        .select(`
          id,
          elderly_profile_id,
          name,
          dosage,
          purpose,
          instructions,
          prescribing_doctor,
          pill_color,
          remaining_count,
          refill_threshold,
          refill_needed,
          medication_schedules (schedule_time, time_of_day, is_active),
          medication_logs (status, scheduled_for)
        `)
        .eq('elderly_profile_id', elderlyProfileId)
        .eq('is_active', true)
        .eq('medication_schedules.is_active', true)
        .order('created_at', { ascending: true })
        .order('scheduled_for', { referencedTable: 'medication_logs', ascending: false })
        .limit(1, { referencedTable: 'medication_logs' });

      if (error) {
        return { data: [], error: error.message };
      }

      const mapped = (data || []).map((item: any) => {
        const schedule = item.medication_schedules?.[0];
        const latestLog = item.medication_logs?.[0];
        return {
          id: item.id,
          elderlyProfileId: item.elderly_profile_id,
          name: item.name,
          dosage: item.dosage,
          scheduleTime: schedule ? schedule.schedule_time.slice(0, 5) : '08:00 AM',
          timeOfDay: schedule ? schedule.time_of_day : 'Morning',
          purpose: item.purpose || '',
          instructions: item.instructions || '',
          status: (latestLog?.status || 'pending') as 'taken' | 'pending' | 'missed',
          pillColor: item.pill_color || 'bg-blue-100 text-blue-700 border-blue-300',
          remainingCount: item.remaining_count ?? 30,
          refillNeeded: Boolean(item.refill_needed || (item.remaining_count <= item.refill_threshold)),
          prescribingDoctor: item.prescribing_doctor || 'Primary Care Physician',
        };
      });
      return { data: mapped };
    }

    // Local persistent database fallback
    ensureInitialHealthcareData(elderlyProfileId);

    const allMeds = getStoredItems<DbMedication>(STORAGE_MEDICATIONS_KEY);
    const allSchedules = getStoredItems<DbMedicationSchedule>(STORAGE_SCHEDULES_KEY);
    const allLogs = getStoredItems<DbMedicationLog>(STORAGE_MED_LOGS_KEY);

    const profileMeds = allMeds.filter(m => m.elderly_profile_id === elderlyProfileId && m.is_active);

    const mapped: Medication[] = profileMeds.map(m => {
      const schedule = allSchedules.find(s => s.medication_id === m.id && s.is_active);
      const logs = allLogs.filter(l => l.medication_id === m.id);
      const latestLog = logs[logs.length - 1];

      return {
        id: m.id,
        elderlyProfileId: m.elderly_profile_id,
        name: m.name,
        dosage: m.dosage,
        scheduleTime: schedule ? schedule.schedule_time.slice(0, 5) : '08:00 AM',
        timeOfDay: schedule ? schedule.time_of_day : 'Morning',
        purpose: m.purpose || '',
        instructions: m.instructions || '',
        status: (latestLog?.status || 'pending') as 'taken' | 'pending' | 'missed',
        pillColor: m.pill_color,
        remainingCount: m.remaining_count,
        refillNeeded: Boolean(m.refill_needed || (m.remaining_count <= m.refill_threshold)),
        prescribingDoctor: m.prescribing_doctor || 'Primary Care Physician',
      };
    });

    return { data: mapped };
  },

  /**
   * Create a new medication with schedule
   */
  async createMedication(input: CreateMedicationInput, currentUserId?: string): Promise<{ data: Medication | null; error?: string }> {
    if (!verifyManagementAuthorization(input.elderlyProfileId, currentUserId)) {
      return { data: null, error: 'Unauthorized: Only the profile owner or assigned caretakers can add medications.' };
    }

    const {
      elderlyProfileId,
      name,
      dosage,
      purpose,
      instructions,
      prescribingDoctor,
      pillColor = 'bg-blue-100 text-blue-700 border-blue-300',
      remainingCount = 30,
      refillThreshold = 5,
      scheduleTime,
      timeOfDay,
    } = input;

    if (isSupabaseConfigured && supabase) {
      // 1. Insert into medications
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert({
          elderly_profile_id: elderlyProfileId,
          name,
          dosage,
          purpose,
          instructions,
          prescribing_doctor: prescribingDoctor,
          pill_color: pillColor,
          remaining_count: remainingCount,
          refill_threshold: refillThreshold,
          refill_needed: remainingCount <= refillThreshold,
        })
        .select('id')
        .single();

      if (medError || !medData) {
        return { data: null, error: medError?.message || 'Failed to create medication' };
      }

      // 2. Insert schedule
      const cleanTime = scheduleTime.includes(':') ? scheduleTime : '08:00:00';
      await supabase.from('medication_schedules').insert({
        medication_id: medData.id,
        elderly_profile_id: elderlyProfileId,
        time_of_day: timeOfDay,
        schedule_time: cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime,
      });

      // 3. Log initial activity
      await this.logActivity({
        elderlyProfileId,
        actorUserId: currentUserId,
        actionType: 'medication_created',
        description: `Added new medication ${name} (${dosage})`,
      });

      return {
        data: {
          id: medData.id,
          elderlyProfileId,
          name,
          dosage,
          scheduleTime,
          timeOfDay,
          purpose: purpose || '',
          instructions: instructions || '',
          status: 'pending',
          pillColor,
          remainingCount,
          refillNeeded: remainingCount <= refillThreshold,
          prescribingDoctor: prescribingDoctor || '',
        }
      };
    }

    // Local persistent database fallback
    const newMedId = `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newScheduleId = `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newMed: DbMedication = {
      id: newMedId,
      elderly_profile_id: elderlyProfileId,
      name,
      dosage,
      purpose,
      instructions,
      prescribing_doctor: prescribingDoctor,
      pill_color: pillColor,
      remaining_count: remainingCount,
      refill_threshold: refillThreshold,
      refill_needed: remainingCount <= refillThreshold,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const newSchedule: DbMedicationSchedule = {
      id: newScheduleId,
      medication_id: newMedId,
      elderly_profile_id: elderlyProfileId,
      time_of_day: timeOfDay,
      schedule_time: scheduleTime,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      dosage_quantity: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const allMeds = getStoredItems<DbMedication>(STORAGE_MEDICATIONS_KEY);
    allMeds.push(newMed);
    setStoredItems(STORAGE_MEDICATIONS_KEY, allMeds);

    const allSchedules = getStoredItems<DbMedicationSchedule>(STORAGE_SCHEDULES_KEY);
    allSchedules.push(newSchedule);
    setStoredItems(STORAGE_SCHEDULES_KEY, allSchedules);

    await this.logActivity({
      elderlyProfileId,
      actorUserId: currentUserId,
      actionType: 'medication_created',
      description: `Added new medication ${name} (${dosage})`,
    });

    return {
      data: {
        id: newMedId,
        elderlyProfileId,
        name,
        dosage,
        scheduleTime,
        timeOfDay,
        purpose: purpose || '',
        instructions: instructions || '',
        status: 'pending',
        pillColor,
        remainingCount,
        refillNeeded: remainingCount <= refillThreshold,
        prescribingDoctor: prescribingDoctor || '',
      }
    };
  },

  /**
   * Log a medication dose (Mark as taken or missed)
   * Decrements remaining inventory count when taken
   */
  async logMedicationDose(input: LogMedicationDoseInput, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
    const { medicationId, scheduleId, elderlyProfileId, status, notes, loggedBy } = input;

    if (!verifyProfileAuthorization(elderlyProfileId, currentUserId)) {
      return { success: false, error: 'Unauthorized: You do not have permission to log doses for this profile.' };
    }

    if (isSupabaseConfigured && supabase) {
      const { error: logError } = await supabase.from('medication_logs').insert({
        medication_id: medicationId,
        schedule_id: scheduleId || null,
        elderly_profile_id: elderlyProfileId,
        scheduled_for: new Date().toISOString(),
        status,
        taken_at: status === 'taken' ? new Date().toISOString() : null,
        logged_by: loggedBy || currentUserId || null,
        notes,
      });

      if (logError) return { success: false, error: logError.message };

      if (status === 'taken') {
        // Decrement medication remaining count
        const { data: currentMed } = await supabase
          .from('medications')
          .select('remaining_count, refill_threshold')
          .eq('id', medicationId)
          .single();

        if (currentMed && currentMed.remaining_count > 0) {
          const newCount = currentMed.remaining_count - 1;
          await supabase
            .from('medications')
            .update({
              remaining_count: newCount,
              refill_needed: newCount <= currentMed.refill_threshold,
            })
            .eq('id', medicationId);
        }
      }

      await this.logActivity({
        elderlyProfileId,
        actorUserId: currentUserId,
        actionType: 'medication_logged',
        description: `Logged medication dose as ${status}`,
      });

      return { success: true };
    }

    // Local persistent database fallback
    const allLogs = getStoredItems<DbMedicationLog>(STORAGE_MED_LOGS_KEY);
    const newLog: DbMedicationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      medication_id: medicationId,
      schedule_id: scheduleId,
      elderly_profile_id: elderlyProfileId,
      scheduled_for: new Date().toISOString(),
      status,
      taken_at: status === 'taken' ? new Date().toISOString() : undefined,
      logged_by: loggedBy || currentUserId,
      notes,
      created_at: new Date().toISOString(),
    };
    allLogs.push(newLog);
    setStoredItems(STORAGE_MED_LOGS_KEY, allLogs);

    if (status === 'taken') {
      const allMeds = getStoredItems<DbMedication>(STORAGE_MEDICATIONS_KEY);
      const target = allMeds.find(m => m.id === medicationId);
      if (target && target.remaining_count > 0) {
        target.remaining_count -= 1;
        target.refill_needed = target.remaining_count <= target.refill_threshold;
        setStoredItems(STORAGE_MEDICATIONS_KEY, allMeds);
      }
    }

    await this.logActivity({
      elderlyProfileId,
      actorUserId: currentUserId,
      actionType: 'medication_logged',
      description: `Logged medication dose as ${status}`,
    });

    return { success: true };
  },

  // ----------------------------------------------------------------------------
  // DOCTOR APPOINTMENTS
  // ----------------------------------------------------------------------------

  /**
   * Get all doctor appointments for an elderly profile
   */
  async getAppointments(elderlyProfileId: string, currentUserId?: string): Promise<{ data: Appointment[]; error?: string }> {
    if (!elderlyProfileId) return { data: [] };

    if (!verifyProfileAuthorization(elderlyProfileId, currentUserId)) {
      return { data: [], error: 'Unauthorized: You do not have access to this healthcare profile appointments.' };
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, elderly_profile_id, title, doctor_name, specialty, clinic_name, address, appointment_date, appointment_time, appointment_type, transport_arranged, notes, status')
        .eq('elderly_profile_id', elderlyProfileId)
        .order('appointment_date', { ascending: true });

      if (error) {
        return { data: [], error: error.message };
      }

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        elderlyProfileId: item.elderly_profile_id,
        title: item.title,
        doctorName: item.doctor_name,
        specialty: item.specialty,
        clinicName: item.clinic_name,
        address: item.address || '',
        date: item.appointment_date,
        time: item.appointment_time ? item.appointment_time.slice(0, 5) : '10:00 AM',
        type: item.appointment_type,
        transportArranged: item.transport_arranged,
        notes: item.notes || '',
        status: item.status,
      }));
      return { data: mapped };
    }

    // Local persistent database fallback
    ensureInitialHealthcareData(elderlyProfileId);

    const allApts = getStoredItems<DbAppointment>(STORAGE_APPOINTMENTS_KEY);
    const profileApts = allApts.filter(a => a.elderly_profile_id === elderlyProfileId);

    const mapped: Appointment[] = profileApts.map(a => ({
      id: a.id,
      elderlyProfileId: a.elderly_profile_id,
      title: a.title,
      doctorName: a.doctor_name,
      specialty: a.specialty,
      clinicName: a.clinic_name,
      address: a.address || '',
      date: a.appointment_date,
      time: a.appointment_time,
      type: a.appointment_type,
      transportArranged: a.transport_arranged,
      notes: a.notes || '',
      status: a.status,
    }));

    return { data: mapped };
  },

  /**
   * Create a new appointment
   */
  async createAppointment(input: CreateAppointmentInput, currentUserId?: string): Promise<{ data: Appointment | null; error?: string }> {
    if (!verifyManagementAuthorization(input.elderlyProfileId, currentUserId)) {
      return { data: null, error: 'Unauthorized: Only the profile owner or assigned caretakers can schedule appointments.' };
    }

    const {
      elderlyProfileId,
      title,
      doctorName,
      specialty,
      clinicName,
      address = '',
      appointmentDate,
      appointmentTime,
      appointmentType,
      transportArranged = false,
      notes = '',
    } = input;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          elderly_profile_id: elderlyProfileId,
          title,
          doctor_name: doctorName,
          specialty,
          clinic_name: clinicName,
          address,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime.length === 5 ? `${appointmentTime}:00` : appointmentTime,
          appointment_type: appointmentType,
          transport_arranged: transportArranged,
          notes,
          status: 'upcoming',
          created_by: currentUserId || null,
        })
        .select('id')
        .single();

      if (error || !data) {
        return { data: null, error: error?.message || 'Failed to create appointment' };
      }

      await this.logActivity({
        elderlyProfileId,
        actorUserId: currentUserId,
        actionType: 'appointment_scheduled',
        description: `Scheduled appointment: ${title} with ${doctorName}`,
      });

      return {
        data: {
          id: data.id,
          elderlyProfileId,
          title,
          doctorName,
          specialty,
          clinicName,
          address,
          date: appointmentDate,
          time: appointmentTime,
          type: appointmentType,
          transportArranged,
          notes,
          status: 'upcoming',
        }
      };
    }

    // Local persistent database fallback
    const newAptId = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newApt: DbAppointment = {
      id: newAptId,
      elderly_profile_id: elderlyProfileId,
      title,
      doctor_name: doctorName,
      specialty,
      clinic_name: clinicName,
      address,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_type: appointmentType,
      transport_arranged: transportArranged,
      notes,
      status: 'upcoming',
      created_by: currentUserId,
      created_at: new Date().toISOString(),
    };

    const allApts = getStoredItems<DbAppointment>(STORAGE_APPOINTMENTS_KEY);
    allApts.push(newApt);
    setStoredItems(STORAGE_APPOINTMENTS_KEY, allApts);

    await this.logActivity({
      elderlyProfileId,
      actorUserId: currentUserId,
      actionType: 'appointment_scheduled',
      description: `Scheduled appointment: ${title} with ${doctorName}`,
    });

    return {
      data: {
        id: newAptId,
        elderlyProfileId,
        title,
        doctorName,
        specialty,
        clinicName,
        address,
        date: appointmentDate,
        time: appointmentTime,
        type: appointmentType,
        transportArranged,
        notes,
        status: 'upcoming',
      }
    };
  },

  // ----------------------------------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------------------------------

  /**
   * Get notifications for an elderly profile
   */
  async getNotifications(elderlyProfileId: string, currentUserId?: string): Promise<{ data: DbNotification[]; error?: string }> {
    if (!verifyProfileAuthorization(elderlyProfileId, currentUserId)) {
      return { data: [], error: 'Unauthorized to view notifications.' };
    }

    if (isSupabaseConfigured && supabase) {
      const query = supabase
        .from('notifications')
        .select('id, elderly_profile_id, recipient_user_id, title, message, type, is_read, read_at, link_url, metadata, created_at')
        .eq('elderly_profile_id', elderlyProfileId)
        .order('created_at', { ascending: false });

      if (currentUserId) {
        query.or(`recipient_user_id.eq.${currentUserId},recipient_user_id.eq.all`);
      }

      const { data, error } = await query;
      if (error) return { data: [], error: error.message };
      return { data: data || [] };
    }

    ensureInitialHealthcareData(elderlyProfileId);
    const allNotes = getStoredItems<DbNotification>(STORAGE_NOTIFICATIONS_KEY);
    const filtered = allNotes.filter(n => 
      n.elderly_profile_id === elderlyProfileId &&
      (!currentUserId || n.recipient_user_id === 'all' || n.recipient_user_id === currentUserId)
    );
    return { data: filtered };
  },

  /**
   * Create an in-app notification
   */
  async createNotification(input: CreateNotificationInput): Promise<{ data: DbNotification | null; error?: string }> {
    const { elderlyProfileId, recipientUserId, title, message, type, linkUrl, metadata } = input;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('notifications').insert({
        elderly_profile_id: elderlyProfileId,
        recipient_user_id: recipientUserId,
        title,
        message,
        type,
        link_url: linkUrl,
        metadata: metadata || {},
      }).select().single();
      if (error) return { data: null, error: error.message };
      return { data };
    }
    const allNotes = getStoredItems<DbNotification>(STORAGE_NOTIFICATIONS_KEY);
    const newNotif: DbNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      elderly_profile_id: elderlyProfileId,
      recipient_user_id: recipientUserId,
      title,
      message,
      type,
      is_read: false,
      link_url: linkUrl,
      metadata,
      created_at: new Date().toISOString(),
    };
    allNotes.unshift(newNotif);
    setStoredItems(STORAGE_NOTIFICATIONS_KEY, allNotes);
    return { data: newNotif };
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const allNotes = getStoredItems<DbNotification>(STORAGE_NOTIFICATIONS_KEY);
    const target = allNotes.find(n => n.id === notificationId);
    if (target) {
      target.is_read = true;
      target.read_at = new Date().toISOString();
      setStoredItems(STORAGE_NOTIFICATIONS_KEY, allNotes);
    }
    return { success: true };
  },

  // ----------------------------------------------------------------------------
  // ACTIVITY AUDIT LOGS
  // ----------------------------------------------------------------------------

  /**
   * Record an activity log
   */
  async logActivity(input: CreateActivityLogInput): Promise<void> {
    const { elderlyProfileId, actorUserId, actionType, description, metadata } = input;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activity_logs').insert({
          elderly_profile_id: elderlyProfileId,
          actor_user_id: actorUserId || null,
          action_type: actionType,
          description,
          metadata: metadata || {},
        });
      } catch (err) {
        console.error('Failed to record activity log in Supabase:', err);
      }
      return;
    }

    const allLogs = getStoredItems<DbActivityLog>(STORAGE_ACTIVITY_LOGS_KEY);
    allLogs.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      elderly_profile_id: elderlyProfileId,
      actor_user_id: actorUserId,
      action_type: actionType,
      description,
      metadata,
      created_at: new Date().toISOString(),
    });
    setStoredItems(STORAGE_ACTIVITY_LOGS_KEY, allLogs.slice(0, 100)); // retain latest 100
  },

  /**
   * Get activity logs for a profile
   */
  async getActivityLogs(elderlyProfileId: string, limit: number = 20, currentUserId?: string): Promise<{ data: DbActivityLog[]; error?: string }> {
    if (!verifyProfileAuthorization(elderlyProfileId, currentUserId)) {
      return { data: [], error: 'Unauthorized to view activity logs.' };
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('elderly_profile_id', elderlyProfileId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return { data: [], error: error.message };
      return { data: data || [] };
    }

    const allLogs = getStoredItems<DbActivityLog>(STORAGE_ACTIVITY_LOGS_KEY);
    const profileLogs = allLogs.filter(l => l.elderly_profile_id === elderlyProfileId).slice(0, limit);
    return { data: profileLogs };
  },
};
