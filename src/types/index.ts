export type NavigationTab = 
  | 'overview' 
  | 'medications' 
  | 'appointments' 
  | 'care-circle' 
  | 'reports' 
  | 'settings';

// Exact Phase 2 required user roles
export type UserRole = 'elderly' | 'caretaker' | 'family_member';

export type AuthMode = 'login' | 'register' | 'passcode' | 'invitation';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface ElderlyProfile {
  id: string;
  owner_id: string;
  full_name: string;
  date_of_birth?: string;
  passcode_hash?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  created_at: string;
  updated_at?: string;
}

export type ProfileMemberRole = 'caretaker' | 'family_member';
export type MemberStatus = 'active' | 'revoked';

export interface ProfileMember {
  id: string;
  elderly_profile_id: string;
  user_id: string;
  role: ProfileMemberRole;
  status: MemberStatus;
  permissions: string[];
  invited_at: string;
  accepted_at?: string;
  revoked_at?: string;
  // Joined details for UI rendering
  member_name?: string;
  member_email?: string;
  member_phone?: string;
}

export interface ProfileInvitation {
  id: string;
  elderly_profile_id: string;
  invited_by: string;
  invited_email: string;
  role: ProfileMemberRole;
  invite_code: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  permissions: string[];
  created_at: string;
  expires_at: string;
}

export type MedicationTimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Bedtime';

// ==============================================================================
// PHASE 3 DATABASE ARCHITECTURE ENTITY TYPES (PostgreSQL & Supabase)
// ==============================================================================

/**
 * PostgreSQL Database entity: medications
 */
export interface DbMedication {
  id: string;
  elderly_profile_id: string;
  name: string;
  dosage: string;
  purpose?: string;
  instructions?: string;
  prescribing_doctor?: string;
  pill_color: string;
  remaining_count: number;
  refill_threshold: number;
  refill_needed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Joined relation: schedules
  schedules?: DbMedicationSchedule[];
  // Joined relation: latest log
  latest_log?: DbMedicationLog;
}

/**
 * PostgreSQL Database entity: medication_schedules
 */
export interface DbMedicationSchedule {
  id: string;
  medication_id: string;
  elderly_profile_id: string;
  time_of_day: MedicationTimeOfDay;
  schedule_time: string; // e.g. "08:00:00"
  days_of_week: number[]; // 0=Sun..6=Sat
  dosage_quantity: number;
  is_active: boolean;
  created_at: string;
}

/**
 * PostgreSQL Database entity: medication_logs
 */
export interface DbMedicationLog {
  id: string;
  medication_id: string;
  schedule_id?: string;
  elderly_profile_id: string;
  scheduled_for: string; // ISO timestamptz
  status: 'taken' | 'pending' | 'missed';
  taken_at?: string;
  logged_by?: string;
  notes?: string;
  created_at: string;
}

/**
 * PostgreSQL Database entity: appointments
 */
export interface DbAppointment {
  id: string;
  elderly_profile_id: string;
  title: string;
  doctor_name: string;
  specialty: string;
  clinic_name: string;
  address?: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS or HH:MM
  appointment_type: 'In-person' | 'Telehealth';
  transport_arranged: boolean;
  notes?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * PostgreSQL Database entity: notifications
 */
export interface DbNotification {
  id: string;
  elderly_profile_id: string;
  recipient_user_id: string;
  title: string;
  message: string;
  type: 'medication_reminder' | 'appointment_reminder' | 'care_circle_update' | 'emergency_alert' | 'system';
  is_read: boolean;
  read_at?: string;
  link_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * PostgreSQL Database entity: activity_logs
 */
export interface DbActivityLog {
  id: string;
  elderly_profile_id: string;
  actor_user_id?: string;
  action_type: 
    | 'medication_logged'
    | 'medication_created'
    | 'medication_updated'
    | 'appointment_scheduled'
    | 'appointment_updated'
    | 'appointment_cancelled'
    | 'member_invited'
    | 'member_joined'
    | 'member_revoked'
    | 'profile_updated'
    | 'emergency_contact_updated';
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Joined relation: actor details
  actor_name?: string;
}

// ==============================================================================
// SERVICE INPUT DTOs (Data Transfer Objects)
// ==============================================================================

export interface CreateMedicationInput {
  elderlyProfileId: string;
  name: string;
  dosage: string;
  purpose?: string;
  instructions?: string;
  prescribingDoctor?: string;
  pillColor?: string;
  remainingCount?: number;
  refillThreshold?: number;
  scheduleTime: string; // e.g. "08:00 AM" or "08:00"
  timeOfDay: MedicationTimeOfDay;
}

export interface CreateAppointmentInput {
  elderlyProfileId: string;
  title: string;
  doctorName: string;
  specialty: string;
  clinicName: string;
  address?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  appointmentType: 'In-person' | 'Telehealth';
  transportArranged?: boolean;
  notes?: string;
  createdBy?: string;
}

export interface LogMedicationDoseInput {
  medicationId: string;
  scheduleId?: string;
  elderlyProfileId: string;
  scheduledFor?: string;
  status: 'taken' | 'pending' | 'missed';
  notes?: string;
  loggedBy?: string;
}

export interface CreateNotificationInput {
  elderlyProfileId: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: DbNotification['type'];
  linkUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreateActivityLogInput {
  elderlyProfileId: string;
  actorUserId?: string;
  actionType: DbActivityLog['action_type'];
  description: string;
  metadata?: Record<string, any>;
}

// ==============================================================================
// COMPONENT-COMPATIBLE FRONTEND INTERFACES (Mapped from Database Entities)
// ==============================================================================

export interface Medication {
  id: string;
  elderlyProfileId?: string;
  name: string;
  dosage: string;
  scheduleTime: string; // e.g., "08:00 AM"
  timeOfDay: MedicationTimeOfDay;
  purpose: string;
  instructions: string;
  status: 'taken' | 'pending' | 'missed';
  pillColor: string;
  remainingCount: number;
  refillNeeded: boolean;
  prescribingDoctor: string;
}

export interface Appointment {
  id: string;
  elderlyProfileId?: string;
  title: string;
  doctorName: string;
  specialty: string;
  clinicName: string;
  address: string;
  date: string; // e.g. "Tomorrow, Nov 16" or "2026-11-16"
  time: string; // e.g. "10:30 AM"
  type: 'In-person' | 'Telehealth';
  transportArranged: boolean;
  notes: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface CareCircleMember {
  id: string;
  name: string;
  role: 'Primary Family' | 'Daily Caregiver' | 'Visiting Nurse' | 'Primary Physician' | 'Neighbor';
  relation: string;
  phone: string;
  email: string;
  isEmergencyContact: boolean;
  lastActive: string;
  avatarUrl?: string;
}

export interface HealthMetric {
  id: string;
  type: 'Blood Pressure' | 'Blood Sugar' | 'Heart Rate' | 'Weight';
  value: string;
  unit: string;
  status: 'Normal' | 'Attention' | 'Optimal';
  recordedAt: string;
  note?: string;
}

export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  audioVoiceAssistance: boolean;
  simplifiedCards: boolean;
}
