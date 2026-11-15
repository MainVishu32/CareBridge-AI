/**
 * Phase 2 & Care Circle Bug Fix Automated Verification Test Suite
 * Tests all 10 required workflow scenarios:
 * 1. Owner generates a Family Member invitation.
 * 2. Owner generates a Caretaker invitation.
 * 3. Invitation is saved with 7-day expiry and valid 6-char code.
 * 4. Invited user redeems valid invitation.
 * 5. Invalid, expired, and reused invitation codes are rejected.
 * 6. Owner successfully revokes Family Member.
 * 7. Owner successfully revokes Caretaker.
 * 8. Revoked users immediately lose access (getElderlyProfile returns null).
 * 9. Multiple profiles isolation (revoking on Profile A does not affect Profile B).
 * 10. Non-owner direct API calls to createInvitation, revokeMember, and getProfileMembers are blocked.
 */

import { hashPasscode, verifyPasscode, generateInvitationCode } from '../lib/cryptoUtils';
import type { ProfileInvitation, UserProfile } from '../types';

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

async function runTestSuite() {
  console.log('--- STARTING CARE CIRCLE & AUTH VERIFICATION SUITE ---');
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

  // --- Baseline Cryptography & Password Security ---
  const { hash, salt } = await hashPasscode('4321', 'test_salt_123');
  assert(hash !== '4321', 'Passcode is cryptographically hashed with salt and not stored in plain text');
  assert(hash.length === 64, 'SHA-256 produces valid 64-character hex digest');

  const isCorrect = await verifyPasscode('4321', hash, salt);
  assert(isCorrect === true, 'Verification succeeds with correct passcode and salt');

  const isIncorrect = await verifyPasscode('9999', hash, salt);
  assert(isIncorrect === false, 'Verification fails with wrong passcode');

  const inviteCodeFormat = generateInvitationCode();
  assert(inviteCodeFormat.startsWith('CARE-') && inviteCodeFormat.length === 11, 'Generated invite code has format CARE-XXXXXX');

  const { authService } = await import('../services/authService');

  // Register Elderly Owner A
  const ownerA = await authService.signUp({
    email: 'eleanor.owner@carebridge.health',
    password: 'password123',
    fullName: 'Eleanor Owner A',
    role: 'elderly',
    phone: '+1 555-111-2222',
  });
  assertHasUser(ownerA, 'Owner A registration');
  assert(ownerA.user.role === 'elderly', 'Elderly Profile Owner A registered successfully');

  // Verify Elderly Profile A is created
  const profileA = await authService.getElderlyProfile(ownerA.user.id, 'elderly');
  assert(Boolean(profileA && profileA.owner_id === ownerA.user.id), 'Elderly Profile A auto-provisioned with correct owner ID');

  // Register Caretaker User
  const caretakerUser = await authService.signUp({
    email: 'maria.caretaker@carebridge.health',
    password: 'password123',
    fullName: 'Maria Caretaker',
    role: 'caretaker',
  });
  assertHasUser(caretakerUser, 'Caretaker registration');
  assert(caretakerUser.user.role === 'caretaker', 'Caretaker registered successfully');

  // Register Family Member User
  const familyUser = await authService.signUp({
    email: 'david.family@carebridge.health',
    password: 'password123',
    fullName: 'David Family',
    role: 'family_member',
  });
  assertHasUser(familyUser, 'Family member registration');
  assert(familyUser.user.role === 'family_member', 'Family Member registered successfully');

  // =========================================================================
  // SCENARIO 1: Owner generates a Family Member invitation
  // =========================================================================
  console.log('\n--- Scenario 1: Owner generates Family Member invitation ---');
  const familyInviteRes = await authService.createInvitation({
    elderlyProfileId: profileA!.id,
    invitedBy: ownerA.user.id,
    invitedEmail: 'david.family@carebridge.health',
    role: 'family_member',
  });
  assertHasInvitation(familyInviteRes, 'Family invitation');
  assert(Boolean(familyInviteRes.invitation), 'Family member invitation object created');
  assert(familyInviteRes.invitation.role === 'family_member', 'Invitation assigned role is family_member');
  assert(familyInviteRes.invitation.elderly_profile_id === profileA!.id, 'Invitation associated with correct elderly profile ID');

  // =========================================================================
  // SCENARIO 2: Owner generates a Caretaker invitation
  // =========================================================================
  console.log('\n--- Scenario 2: Owner generates Caretaker invitation ---');
  const caretakerInviteRes = await authService.createInvitation({
    elderlyProfileId: profileA!.id,
    invitedBy: ownerA.user.id,
    invitedEmail: 'maria.caretaker@carebridge.health',
    role: 'caretaker',
  });
  assertHasInvitation(caretakerInviteRes, 'Caretaker invitation');
  assert(Boolean(caretakerInviteRes.invitation), 'Caretaker invitation object created');
  assert(caretakerInviteRes.invitation.role === 'caretaker', 'Invitation assigned role is caretaker');

  // =========================================================================
  // SCENARIO 3: Invitation is saved with 7-day expiry and displayed
  // =========================================================================
  console.log('\n--- Scenario 3: Invitation saved with 7-day expiry ---');
  const expiryTime = new Date(caretakerInviteRes.invitation.expires_at).getTime();
  const createdTime = new Date(caretakerInviteRes.invitation.created_at).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  assert(Math.abs((expiryTime - createdTime) - sevenDaysMs) < 5000, 'Invitation expiration is set to 7 days from creation');
  
  const pendingInvites = await authService.getPendingInvitations(profileA!.id, ownerA.user.id);
  assert(pendingInvites.length >= 2, 'Pending invitations saved and retrievable for profile owner');
  assert(pendingInvites.some(inv => inv.invite_code === familyInviteRes.invitation.invite_code), 'Family invitation code present in pending invitations list');
  assert(pendingInvites.some(inv => inv.invite_code === caretakerInviteRes.invitation.invite_code), 'Caretaker invitation code present in pending invitations list');

  // =========================================================================
  // SCENARIO 4: Invited user redeems valid invitation
  // =========================================================================
  console.log('\n--- Scenario 4: Invited user redeems valid invitation ---');
  const familyAcceptRes = await authService.acceptInvitation(familyInviteRes.invitation.invite_code, familyUser.user);
  assert(familyAcceptRes.success === true, 'Family member successfully redeems invitation');

  const caretakerAcceptRes = await authService.acceptInvitation(caretakerInviteRes.invitation.invite_code, caretakerUser.user);
  assert(caretakerAcceptRes.success === true, 'Caretaker successfully redeems invitation');

  // Verify both are now active members of profile A
  const membersA = await authService.getProfileMembers(profileA!.id);
  const activeFamily = membersA.find(m => m.user_id === familyUser.user.id);
  const activeCaretaker = membersA.find(m => m.user_id === caretakerUser.user.id);
  assert(activeFamily?.status === 'active', 'Family member is active member in Profile A');
  assert(activeCaretaker?.status === 'active', 'Caretaker is active member in Profile A');

  // And getElderlyProfile returns Profile A for both
  const familyProfile = await authService.getElderlyProfile(familyUser.user.id, 'family_member');
  assert(familyProfile?.id === profileA!.id, 'Family member can access Profile A');
  const caretakerProfile = await authService.getElderlyProfile(caretakerUser.user.id, 'caretaker');
  assert(caretakerProfile?.id === profileA!.id, 'Caretaker can access Profile A');

  // =========================================================================
  // SCENARIO 5: Invalid, expired, and reused invitation codes are rejected
  // =========================================================================
  console.log('\n--- Scenario 5: Rejection of invalid, expired, and reused codes ---');
  // 5a. Reused code
  const reusedRes = await authService.acceptInvitation(familyInviteRes.invitation.invite_code, familyUser.user);
  assert(reusedRes.success === false && Boolean(reusedRes.error), 'Already-used invitation code is rejected');

  // 5b. Invalid code
  const invalidRes = await authService.acceptInvitation('CARE-INVALID', familyUser.user);
  assert(invalidRes.success === false && Boolean(invalidRes.error), 'Non-existent / invalid invitation code is rejected');

  // 5c. Expired code
  const expiredInvite = await authService.createInvitation({
    elderlyProfileId: profileA!.id,
    invitedBy: ownerA.user.id,
    invitedEmail: 'expired.test@example.com',
    role: 'family_member',
  });
  assertHasInvitation(expiredInvite, 'Expired invitation fixture');
  // Manually backdate expiry to simulate expired code
  const allInvites = JSON.parse(localStorage.getItem('carebridge_db_invitations') || '[]');
  const expIdx = allInvites.findIndex((i: any) => i.id === expiredInvite.invitation.id);
  allInvites[expIdx].expires_at = new Date(Date.now() - 100000).toISOString();
  localStorage.setItem('carebridge_db_invitations', JSON.stringify(allInvites));

  const expiredRes = await authService.acceptInvitation(expiredInvite.invitation.invite_code, familyUser.user);
  assert(expiredRes.success === false && expiredRes.error!.includes('expired'), 'Expired invitation code is rejected');

  // =========================================================================
  // SCENARIO 6: Owner successfully revokes Family Member
  // =========================================================================
  console.log('\n--- Scenario 6: Owner successfully revokes Family Member ---');
  const revokeFamilyRes = await authService.revokeMember(activeFamily!.id, ownerA.user.id, profileA!);
  assert(revokeFamilyRes.success === true, 'Owner successfully revokes Family Member access');

  const membersAfterFamilyRevoke = await authService.getProfileMembers(profileA!.id);
  const revokedFamilyEntry = membersAfterFamilyRevoke.find(m => m.id === activeFamily!.id);
  assert(revokedFamilyEntry?.status === 'revoked', 'Family Member status updated to revoked in DB');
  assert(Boolean(revokedFamilyEntry?.revoked_at), 'Revocation timestamp recorded');

  // =========================================================================
  // SCENARIO 7: Owner successfully revokes Caretaker
  // =========================================================================
  console.log('\n--- Scenario 7: Owner successfully revokes Caretaker ---');
  const revokeCaretakerRes = await authService.revokeMember(activeCaretaker!.id, ownerA.user.id, profileA!);
  assert(revokeCaretakerRes.success === true, 'Owner successfully revokes Caretaker access');

  const membersAfterCaretakerRevoke = await authService.getProfileMembers(profileA!.id);
  const revokedCaretakerEntry = membersAfterCaretakerRevoke.find(m => m.id === activeCaretaker!.id);
  assert(revokedCaretakerEntry?.status === 'revoked', 'Caretaker status updated to revoked in DB');

  // =========================================================================
  // SCENARIO 8: Revoked users immediately lose access
  // =========================================================================
  console.log('\n--- Scenario 8: Revoked users immediately lose access ---');
  const familyProfileAfterRevoke = await authService.getElderlyProfile(familyUser.user.id, 'family_member');
  assert(familyProfileAfterRevoke === null, 'Revoked Family Member getElderlyProfile returns null (access denied)');

  const caretakerProfileAfterRevoke = await authService.getElderlyProfile(caretakerUser.user.id, 'caretaker');
  assert(caretakerProfileAfterRevoke === null, 'Revoked Caretaker getElderlyProfile returns null (access denied)');

  // Verify accounts still exist and can log in (user account is NOT deleted)
  const familyLogin = await authService.signIn('david.family@carebridge.health', 'password123');
  assert(Boolean(familyLogin.user), 'Revoked user account is still active and can log in');

  // =========================================================================
  // SCENARIO 9: Multiple profiles isolation
  // =========================================================================
  console.log('\n--- Scenario 9: Multiple profiles isolation ---');
  // Register Owner B and provision Profile B
  const ownerB = await authService.signUp({
    email: 'robert.owner@carebridge.health',
    password: 'password123',
    fullName: 'Robert Owner B',
    role: 'elderly',
  });
  assertHasUser(ownerB, 'Owner B registration');
  const profileB = await authService.getElderlyProfile(ownerB.user.id, 'elderly');
  assert(Boolean(profileB && profileB.id !== profileA!.id), 'Second Profile B created independently');

  // Register shared Caretaker User
  const sharedCaretaker = await authService.signUp({
    email: 'shared.nurse@carebridge.health',
    password: 'password123',
    fullName: 'Nurse Sarah',
    role: 'caretaker',
  });
  assertHasUser(sharedCaretaker, 'Shared caretaker registration');

  // Owner A invites shared caretaker to Profile A
  const inviteFromA = await authService.createInvitation({
    elderlyProfileId: profileA!.id,
    invitedBy: ownerA.user.id,
    invitedEmail: 'shared.nurse@carebridge.health',
    role: 'caretaker',
  });
  assertHasInvitation(inviteFromA, 'Profile A invitation');
  await authService.acceptInvitation(inviteFromA.invitation.invite_code, sharedCaretaker.user);

  // Owner B invites shared caretaker to Profile B
  const inviteFromB = await authService.createInvitation({
    elderlyProfileId: profileB!.id,
    invitedBy: ownerB.user.id,
    invitedEmail: 'shared.nurse@carebridge.health',
    role: 'caretaker',
  });
  assertHasInvitation(inviteFromB, 'Profile B invitation');
  await authService.acceptInvitation(inviteFromB.invitation.invite_code, sharedCaretaker.user);

  // Verify shared caretaker is in both profiles
  const membersOfA = await authService.getProfileMembers(profileA!.id);
  const membersOfB = await authService.getProfileMembers(profileB!.id);
  const nurseInA = membersOfA.find(m => m.user_id === sharedCaretaker.user.id);
  const nurseInB = membersOfB.find(m => m.user_id === sharedCaretaker.user.id);
  assert(nurseInA?.status === 'active' && nurseInB?.status === 'active', 'Caretaker is active in both Profile A and Profile B');

  // Now Owner A revokes Nurse from Profile A
  const revokeFromA = await authService.revokeMember(nurseInA!.id, ownerA.user.id, profileA!);
  assert(revokeFromA.success === true, 'Owner A revoked nurse from Profile A');

  // Verify: Nurse is revoked in Profile A, but STILL ACTIVE in Profile B!
  const updatedA = await authService.getProfileMembers(profileA!.id);
  const updatedB = await authService.getProfileMembers(profileB!.id);
  const nurseAfterA = updatedA.find(m => m.user_id === sharedCaretaker.user.id);
  const nurseAfterB = updatedB.find(m => m.user_id === sharedCaretaker.user.id);

  assert(nurseAfterA?.status === 'revoked', 'Nurse is revoked from Profile A');
  assert(nurseAfterB?.status === 'active', 'Nurse remains ACTIVE in Profile B (isolation preserved)');

  // getElderlyProfile still returns Profile B for Nurse
  const nurseProfile = await authService.getElderlyProfile(sharedCaretaker.user.id, 'caretaker');
  assert(nurseProfile?.id === profileB!.id, 'Nurse retains access to Profile B');

  // =========================================================================
  // SCENARIO 10: Non-owner direct API calls are blocked
  // =========================================================================
  console.log('\n--- Scenario 10: Non-owner direct API calls are blocked ---');
  // 10a. Non-owner trying to create invitation
  const unauthorizedInvite = await authService.createInvitation({
    elderlyProfileId: profileB!.id,
    invitedBy: sharedCaretaker.user.id, // Caretaker trying to issue invite on Profile B
    invitedEmail: 'hacker@example.com',
    role: 'family_member',
  });
  assert(Boolean(unauthorizedInvite.error) && unauthorizedInvite.error!.includes('Unauthorized'), 'Direct API call: Non-owner blocked from creating invitations');

  // 10b. Non-owner trying to revoke a member
  const unauthorizedRevoke = await authService.revokeMember(
    nurseInB!.id,
    sharedCaretaker.user.id, // Caretaker trying to revoke
    profileB!
  );
  assert(unauthorizedRevoke.success === false && unauthorizedRevoke.error!.includes('Unauthorized'), 'Direct API call: Non-owner blocked from revoking members');

  // 10c. Unauthorized user trying to list profile roster
  let blockedRoster = false;
  try {
    // Unrelated user David trying to inspect Profile B roster
    await authService.getProfileMembers(profileB!.id, familyUser.user.id);
  } catch (err: any) {
    blockedRoster = true;
    assert(err.message.includes('Unauthorized'), 'Direct API call: Unauthorized user blocked from fetching profile roster');
  }
  assert(blockedRoster, 'Roster API access properly guarded');

  console.log(`\n========================================`);
  console.log(`ALL 10 SCENARIOS PASSED: ${passedTests}/${totalTests} tests successful!`);
  console.log(`========================================\n`);
}

runTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
