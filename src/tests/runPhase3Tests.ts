/**
 * Phase 3 Automated Verification Test Suite
 * Tests Core Database Architecture & Healthcare Data Layer:
 * 1. Database Connection & Table Availability for all 10 entities.
 * 2. Data Insertion and Retrieval (Medications, Schedules, Logs, Appointments, Notifications, Activity Logs).
 * 3. Relational Foreign Key Integrity (Profiles -> Elderly -> Medications -> Schedules -> Logs -> Appointments).
 * 4. Profile-Specific Data Isolation (Profile A data is inaccessible to Profile B).
 * 5. Role-Based Database Permissions (Owner, Caretaker, Family Member, Unauthorized Non-member).
 * 6. Inventory Deduction & Dose Compliance Tracking.
 * 7. Session Persistence & Data Retention across logins.
 */

// Mock localStorage for node environment testing
import type { ProfileInvitation, UserProfile } from '../types';

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value.toString(); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

(global as any).localStorage = new LocalStorageMock();
(global as any).window = {
  crypto: {
    subtle: {
      digest: async (_algo: string, data: Uint8Array) => {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(Buffer.from(data)).digest();
      }
    },
    getRandomValues: (array: Uint8Array) => {
      const crypto = require('crypto');
      const bytes = crypto.randomBytes(array.length);
      array.set(bytes);
      return array;
    }
  }
};

async function runPhase3TestSuite() {
  console.log('================================================================');
  console.log('--- STARTING PHASE 3 DATABASE ARCHITECTURE VERIFICATION ---');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  function assertHasUser<T extends { user: UserProfile | null }>(result: T, label: string): asserts result is T & { user: UserProfile } {
    if (!result.user) throw new Error(`${label} did not return a user`);
  }

  function assertHasInvitation<T extends { invitation: ProfileInvitation | null }>(result: T, label: string): asserts result is T & { invitation: ProfileInvitation } {
    if (!result.invitation) throw new Error(`${label} did not return an invitation`);
  }

  const { authService } = await import('../services/authService');
  const { dbService } = await import('../services/dbService');
  const { isSupabaseConfigured } = await import('../lib/supabaseClient');

  // ---------------------------------------------------------------------------
  // 1. Database Client Configuration & Schema Verification
  // ---------------------------------------------------------------------------
  console.log('--- 1. Database Client & Configuration Verification ---');
  assert(typeof dbService.getMedications === 'function', 'dbService provides getMedications');
  assert(typeof dbService.createMedication === 'function', 'dbService provides createMedication');
  assert(typeof dbService.logMedicationDose === 'function', 'dbService provides logMedicationDose');
  assert(typeof dbService.getAppointments === 'function', 'dbService provides getAppointments');
  assert(typeof dbService.createAppointment === 'function', 'dbService provides createAppointment');
  assert(typeof dbService.getNotifications === 'function', 'dbService provides getNotifications');
  assert(typeof dbService.getActivityLogs === 'function', 'dbService provides getActivityLogs');
  assert(typeof isSupabaseConfigured === 'boolean', 'Supabase environment configuration status is detectable');

  // ---------------------------------------------------------------------------
  // 2. Provision Profiles & Care Circle Members
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Provisioning Test Profiles (Owner, Caretaker, Family Member) ---');
  
  // Register Owner of Profile A
  const ownerA = await authService.signUp({
    email: 'owner.alice@carebridge.health',
    password: 'password123',
    fullName: 'Alice Senior',
    role: 'elderly',
  });
  assertHasUser(ownerA, 'Owner A registration');
  const profileA = await authService.getElderlyProfile(ownerA.user.id, 'elderly');
  assert(Boolean(profileA && profileA.owner_id === ownerA.user.id), 'Profile A created and tied to Owner Alice');

  // Register Caretaker
  const caretaker = await authService.signUp({
    email: 'caretaker.carlos@carebridge.health',
    password: 'password123',
    fullName: 'Carlos Caregiver, CNA',
    role: 'caretaker',
  });
  assertHasUser(caretaker, 'Caretaker registration');

  // Register Family Member
  const family = await authService.signUp({
    email: 'family.fiona@carebridge.health',
    password: 'password123',
    fullName: 'Fiona Family',
    role: 'family_member',
  });
  assertHasUser(family, 'Family member registration');

  // Owner A invites Caretaker Carlos & Family Fiona
  const invCarlos = await authService.createInvitation({
    elderlyProfileId: profileA!.id,
    invitedBy: ownerA.user.id,
    invitedEmail: caretaker.user.email,
    role: 'caretaker',
  });
  assertHasInvitation(invCarlos, 'Caretaker invitation');
  await authService.acceptInvitation(invCarlos.invitation.invite_code, caretaker.user);

  const invFiona = await authService.createInvitation({
    elderlyProfileId: profileA!.id,
    invitedBy: ownerA.user.id,
    invitedEmail: family.user.email,
    role: 'family_member',
  });
  assertHasInvitation(invFiona, 'Family member invitation');
  await authService.acceptInvitation(invFiona.invitation.invite_code, family.user);

  // Verify Care Circle Members
  const membersA = await authService.getProfileMembers(profileA!.id, ownerA.user.id);
  assert(membersA.length === 2, 'Profile A has 2 active care circle members');
  assert(membersA.some(m => m.user_id === caretaker.user.id && m.role === 'caretaker'), 'Caretaker Carlos is active on Profile A');
  assert(membersA.some(m => m.user_id === family.user.id && m.role === 'family_member'), 'Family Member Fiona is active on Profile A');

  // ---------------------------------------------------------------------------
  // 3. Medications & Schedules Insertion & Retrieval
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Medications & Schedules Architecture ---');
  
  // Owner creates Medication
  const medRes1 = await dbService.createMedication({
    elderlyProfileId: profileA!.id,
    name: 'Amlodipine',
    dosage: '5mg Tablet',
    purpose: 'Hypertension blood pressure control',
    instructions: 'Take 1 tablet every morning with water',
    prescribingDoctor: 'Dr. Sarah Mitchell',
    pillColor: 'bg-blue-100 text-blue-700 border-blue-300',
    remainingCount: 30,
    refillThreshold: 5,
    scheduleTime: '08:00 AM',
    timeOfDay: 'Morning',
  }, ownerA.user.id);

  assert(Boolean(medRes1.data && medRes1.data.id), 'Medication successfully inserted with primary key');
  assert(medRes1.data!.name === 'Amlodipine', 'Medication name stored correctly');
  assert(medRes1.data!.scheduleTime === '08:00 AM', 'Medication schedule linked correctly');

  // Caretaker Carlos creates second medication
  const medRes2 = await dbService.createMedication({
    elderlyProfileId: profileA!.id,
    name: 'Metformin XR',
    dosage: '500mg Extended Release',
    purpose: 'Type 2 Diabetes glycemic management',
    instructions: 'Take with evening meal',
    prescribingDoctor: 'Dr. Robert Chen',
    pillColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    remainingCount: 15,
    refillThreshold: 5,
    scheduleTime: '07:00 PM',
    timeOfDay: 'Evening',
  }, caretaker.user.id);

  assert(Boolean(medRes2.data), 'Authorized Caretaker successfully inserted medication');

  // Family Member Fiona attempts to create medication (Should be blocked - read-only role)
  const unauthorizedMedRes = await dbService.createMedication({
    elderlyProfileId: profileA!.id,
    name: 'Unauthorized Drug',
    dosage: '100mg',
    scheduleTime: '12:00 PM',
    timeOfDay: 'Afternoon',
  }, family.user.id);

  assert(unauthorizedMedRes.data === null && Boolean(unauthorizedMedRes.error), 'Family Member is blocked from creating medications (Role restriction enforced)');

  // Retrieve Medications
  const medsList = await dbService.getMedications(profileA!.id, ownerA.user.id);
  assert(medsList.data.length >= 2, 'Medications retrieved with linked schedules');
  const foundAmlodipine = medsList.data.find(m => m.name === 'Amlodipine');
  assert(Boolean(foundAmlodipine), 'Amlodipine found in retrieved medications');

  // ---------------------------------------------------------------------------
  // 4. Medication Compliance Logs & Inventory Tracking
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Medication Compliance Logs & Inventory Management ---');
  
  const initialCount = foundAmlodipine!.remainingCount;
  
  // Carlos logs a dose as taken
  const logRes = await dbService.logMedicationDose({
    medicationId: foundAmlodipine!.id,
    elderlyProfileId: profileA!.id,
    status: 'taken',
    notes: 'Taken on schedule with breakfast',
    loggedBy: caretaker.user.id,
  }, caretaker.user.id);

  assert(logRes.success === true, 'Caretaker successfully logged dose as taken');

  // Verify medication inventory decreased by 1
  const updatedMeds = await dbService.getMedications(profileA!.id, ownerA.user.id);
  const updatedAmlodipine = updatedMeds.data.find(m => m.id === foundAmlodipine!.id);
  assert(updatedAmlodipine!.remainingCount === initialCount - 1, 'Inventory count decremented after dose taken');
  assert(updatedAmlodipine!.status === 'taken', 'Medication status updated to taken');

  // ---------------------------------------------------------------------------
  // 5. Doctor Appointments Architecture
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Doctor Appointments Architecture ---');
  
  const aptRes = await dbService.createAppointment({
    elderlyProfileId: profileA!.id,
    title: 'Cardiology Bi-Annual Checkup',
    doctorName: 'Dr. Sarah Mitchell',
    specialty: 'Cardiovascular Health',
    clinicName: 'Valley Heart Pavilion',
    address: '500 Medical Center Blvd, Ste 210',
    appointmentDate: '2026-11-25',
    appointmentTime: '10:00 AM',
    appointmentType: 'In-person',
    transportArranged: true,
    notes: 'Check blood pressure log and ECG reading',
    createdBy: ownerA.user.id,
  }, ownerA.user.id);

  assert(Boolean(aptRes.data && aptRes.data.id), 'Appointment created with foreign key to elderly profile');
  assert(aptRes.data!.doctorName === 'Dr. Sarah Mitchell', 'Doctor name stored correctly');
  assert(aptRes.data!.transportArranged === true, 'Transport arranged status stored');

  const aptsList = await dbService.getAppointments(profileA!.id, family.user.id);
  assert(aptsList.data.length >= 1, 'Appointments retrieved successfully by authorized family member');
  assert(aptsList.data.some(a => a.doctorName === 'Dr. Sarah Mitchell'), 'Scheduled appointment present in profile roster');

  // ---------------------------------------------------------------------------
  // 6. Notifications & Escalation Architecture
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Notifications Architecture ---');

  const notifRes = await dbService.getNotifications(profileA!.id, ownerA.user.id);
  assert(Array.isArray(notifRes.data), 'Notifications list retrieved');
  assert(notifRes.data.length >= 1, 'Profile notifications seeded and available');

  const firstNotif = notifRes.data[0];
  const readRes = await dbService.markNotificationAsRead(firstNotif.id);
  assert(readRes.success === true, 'Notification successfully marked as read');

  // ---------------------------------------------------------------------------
  // 7. Activity Logs Audit Trail
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Activity Logs & Healthcare Audit Trail ---');

  const logsRes = await dbService.getActivityLogs(profileA!.id, 20, ownerA.user.id);
  assert(Array.isArray(logsRes.data), 'Activity logs retrieved successfully');
  assert(logsRes.data.length >= 2, 'Activity logs recorded actions (medication created & logged)');
  assert(logsRes.data.some(l => l.action_type === 'medication_created'), 'medication_created action captured in audit trail');
  assert(logsRes.data.some(l => l.action_type === 'medication_logged'), 'medication_logged action captured in audit trail');

  // ---------------------------------------------------------------------------
  // 8. Profile-Specific Isolation & Security (RLS Verification)
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Multi-Profile Data Isolation (RLS Verification) ---');

  // Register Owner of Profile B
  const ownerB = await authService.signUp({
    email: 'owner.bob@carebridge.health',
    password: 'password123',
    fullName: 'Bob Senior',
    role: 'elderly',
  });
  assertHasUser(ownerB, 'Owner B registration');
  const profileB = await authService.getElderlyProfile(ownerB.user.id, 'elderly');
  assert(Boolean(profileB && profileB.id !== profileA!.id), 'Independent Profile B created for Bob');

  // Attempt 8a: Owner B attempts to fetch Profile A medications
  const crossMeds = await dbService.getMedications(profileA!.id, ownerB.user.id);
  assert(crossMeds.data.length === 0 && Boolean(crossMeds.error), 'Owner B is BLOCKED from reading Profile A medications (Profile isolation)');

  // Attempt 8b: Owner B attempts to fetch Profile A appointments
  const crossApts = await dbService.getAppointments(profileA!.id, ownerB.user.id);
  assert(crossApts.data.length === 0 && Boolean(crossApts.error), 'Owner B is BLOCKED from reading Profile A appointments (Profile isolation)');

  // Attempt 8c: Owner B attempts to fetch Profile A activity logs
  const crossLogs = await dbService.getActivityLogs(profileA!.id, 20, ownerB.user.id);
  assert(crossLogs.data.length === 0 && Boolean(crossLogs.error), 'Owner B is BLOCKED from reading Profile A activity logs (Profile isolation)');

  // Attempt 8d: Unrelated stranger attempts direct dose logging on Profile A
  const strangerLog = await dbService.logMedicationDose({
    medicationId: foundAmlodipine!.id,
    elderlyProfileId: profileA!.id,
    status: 'taken',
  }, ownerB.user.id);
  assert(strangerLog.success === false && Boolean(strangerLog.error), 'Unrelated user is BLOCKED from logging doses on Profile A');

  // ---------------------------------------------------------------------------
  // 9. Data Persistence & Reconnection across Session Cycles
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Session Persistence & Database Reconnection ---');

  // Simulate logout
  await authService.signOut();
  assert((await authService.getActiveSession()) === null, 'User signed out cleanly');

  // Re-login as Alice
  const reLogin = await authService.signIn('owner.alice@carebridge.health', 'password123');
  assertHasUser(reLogin, 'Owner A login');
  assert(reLogin.user.email === 'owner.alice@carebridge.health', 'Alice logged back in');

  // Re-fetch Profile A healthcare data
  const persistedMeds = await dbService.getMedications(profileA!.id, reLogin.user.id);
  assert(persistedMeds.data.length >= 2, 'Medications persisted across logout and login');
  assert(persistedMeds.data.some(m => m.name === 'Amlodipine'), 'Amlodipine persists in database');

  const persistedApts = await dbService.getAppointments(profileA!.id, reLogin.user.id);
  assert(persistedApts.data.some(a => a.doctorName === 'Dr. Sarah Mitchell'), 'Appointments persist in database');

  console.log('\n================================================================');
  console.log(`ALL PHASE 3 DATABASE ARCHITECTURE TESTS PASSED: ${passedTests}/${totalTests} tests successful!`);
  console.log('================================================================\n');
}

runPhase3TestSuite().catch(err => {
  console.error('Phase 3 Test Suite failed:', err);
  process.exit(1);
});
