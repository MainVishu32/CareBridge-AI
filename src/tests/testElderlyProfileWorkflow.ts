// Mock localStorage for node environment testing
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

import { authService } from '../services/authService';
import { ElderlyProfile } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✓ [PASS] ${message}`);
}

async function testElderlyProfileCreationWorkflow() {
  console.log('================================================================');
  console.log('--- TESTING COMPLETE ELDERLY PROFILE CREATION & PASSCODE FLOW ---');
  console.log('================================================================\n');

  // 1. Register a fresh elderly profile owner
  const testOwnerEmail = `elizabeth.vance.${Date.now()}@carebridge.health`;
  const signUpRes = await authService.signUp({
    email: testOwnerEmail,
    password: 'SecurePassword123!',
    fullName: 'Elizabeth Vance',
    role: 'elderly',
    phone: '+1 (555) 345-6789',
  });

  assert(Boolean(signUpRes.user && signUpRes.user.id), 'Elderly Profile Owner account registered successfully');
  if (!signUpRes.user) throw new Error('Elderly Profile Owner registration did not return a user');
  const ownerId = signUpRes.user.id;

  // 2. Submit new elderly profile via createElderlyProfile
  console.log('\n--- Step 1: Submitting new elderly profile with 4-digit passcode ---');
  const testPasscode = '7391';
  const createRes = await authService.createElderlyProfile({
    ownerId,
    fullName: 'Elizabeth Vance',
    dateOfBirth: '1942-08-25',
    passcode: testPasscode,
    emergencyContactName: 'Robert Vance',
    emergencyContactPhone: '+1 (555) 987-6543',
    emergencyContactRelation: 'Son & Legal Healthcare Proxy',
  });

  assert(Boolean(createRes.profile), 'Profile created successfully without database/view errors');
  assert(!createRes.error, 'No error returned during profile creation');
  if (!createRes.profile) throw new Error('Elderly profile creation did not return a profile');

  const createdProfile: ElderlyProfile = createRes.profile;

  // 3. Verify record fields & owner assignment
  console.log('\n--- Step 2: Verifying profile ownership & preserved fields ---');
  assert(createdProfile.owner_id === ownerId, 'Profile owner_id is correctly assigned to authenticated user');
  assert(createdProfile.full_name === 'Elizabeth Vance', 'Full name preserved accurately');
  assert(createdProfile.date_of_birth === '1942-08-25', 'Date of birth preserved accurately');
  assert(createdProfile.emergency_contact_name === 'Robert Vance', 'Emergency contact name preserved accurately');
  assert(createdProfile.emergency_contact_phone === '+1 (555) 987-6543', 'Emergency contact phone preserved accurately');
  assert(createdProfile.emergency_contact_relation === 'Son & Legal Healthcare Proxy', 'Emergency contact relationship preserved accurately');

  // 4. Verify passcode security
  console.log('\n--- Step 3: Verifying passcode security & encryption ---');
  // Plaintext passcode must never be in the returned object
  const profileJson = JSON.stringify(createdProfile);
  assert(!profileJson.includes(testPasscode), 'Plaintext passcode is NOT stored in the profile object');

  // Passcode hash must not be exposed to frontend
  assert(createdProfile.passcode_hash === undefined, 'Passcode hash is NOT returned to the frontend');

  // Verify internal storage has populated passcode_hash
  const rawStorage = localStorage.getItem('carebridge_db_elderly_profiles');
  const storedProfiles = rawStorage ? JSON.parse(rawStorage) : [];
  const storedProfile = storedProfiles.find((p: any) => p.owner_id === ownerId);

  assert(Boolean(storedProfile), 'Profile record is stored in database storage');
  assert(Boolean(storedProfile.passcode_hash), 'passcode_hash is populated and non-empty in storage');
  assert(storedProfile.passcode_hash !== testPasscode, 'Stored passcode_hash is cryptographically hashed, not plaintext');
  assert(!JSON.stringify(storedProfile).includes(`"passcode":"${testPasscode}"`), 'Plaintext passcode is never stored in database');

  // 5. Verify dashboard appearance
  console.log('\n--- Step 4: Verifying profile retrieval for dashboard ---');
  const retrievedProfile = await authService.getElderlyProfile(ownerId, 'elderly');
  assert(Boolean(retrievedProfile), 'Profile appears and is retrieved for dashboard display');
  assert(retrievedProfile?.full_name === 'Elizabeth Vance', 'Dashboard displays active profile name');
  assert(retrievedProfile?.emergency_contact_name === 'Robert Vance', 'Dashboard displays emergency contact proxy');
  assert(retrievedProfile?.passcode_hash === undefined, 'Retrieved dashboard profile does not expose passcode_hash');

  // 6. Verify Senior Keypad / Passcode Login
  console.log('\n--- Step 5: Testing Senior Keypad authentication with passcode ---');
  const authSuccess = await authService.signInWithPasscode(testPasscode);
  assert(Boolean(authSuccess.user), 'Passcode login succeeds with correct 4-digit passcode');
  assert(authSuccess.user?.name === 'Elizabeth Vance', 'Passcode login authenticates the correct elderly owner');

  // 7. Verify Wrong Passcode Rejection
  const authFail = await authService.signInWithPasscode('0000');
  assert(Boolean(authFail.error), 'Incorrect passcode is properly rejected');
  assert(!authFail.user, 'No session granted for incorrect passcode');

  console.log('\n================================================================');
  console.log('ALL WORKFLOW VERIFICATIONS PASSED: Elderly profile creation & passcode verified!');
  console.log('================================================================\n');
}

testElderlyProfileCreationWorkflow().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
