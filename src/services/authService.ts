import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { hashPasscode } from '../lib/cryptoUtils';
import { 
  UserProfile, 
  ElderlyProfile, 
  ProfileMember, 
  ProfileInvitation, 
  UserRole,
  ProfileMemberRole 
} from '../types';

// Storage keys for session persistence
const STORAGE_SESSION_KEY = 'carebridge_auth_session';
const STORAGE_PROFILES_KEY = 'carebridge_db_profiles';
const STORAGE_ELDERLY_PROFILES_KEY = 'carebridge_db_elderly_profiles';

interface StoredUserProfile extends UserProfile {
  password: string;
}

interface UserAuthResult {
  user: UserProfile | null;
  error?: string;
  needsEmailConfirmation?: boolean;
}

interface PasscodeAuthResult {
  user: UserProfile | null;
  elderlyProfile: ElderlyProfile | null;
  error?: string;
}

interface ProfileResult {
  profile: ElderlyProfile | null;
  error?: string;
}

interface InvitationResult {
  invitation: ProfileInvitation | null;
  error?: string;
}

// ==============================================================================
// AUTHENTICATION & ROLE MANAGEMENT API
// ==============================================================================

export const authService = {
  /**
   * User Registration (Email + Password + Assigned Role)
   * Automatically provisions healthcare profile if role is 'elderly'
   */
  async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
  }): Promise<UserAuthResult> {
    const { email, password, fullName, role, phone } = params;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            phone: phone || '',
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user && !data.session) {
        return { user: null, needsEmailConfirmation: true };
      }

      if (data.user) {
        // The auth.users trigger provisions profiles and owner care profiles.
        const userProfile: UserProfile = {
          id: data.user.id,
          name: fullName,
          email,
          role,
          phone,
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userProfile));
        return { user: userProfile };
      }
    }

    // Local persistent mode fallback
    const profiles: StoredUserProfile[] = JSON.parse(localStorage.getItem(STORAGE_PROFILES_KEY) || '[]');
    const existing = profiles.find(profile => profile.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { user: null, error: 'An account with this email address already exists.' };
    }

    const newUserId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newProfile: UserProfile = {
      id: newUserId,
      name: fullName,
      email,
      role,
      phone,
    };

    profiles.push({ ...newProfile, password });
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newProfile));

    // If role is elderly, immediately create and store their elderly healthcare profile
    if (role === 'elderly') {
      const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
      const newElderlyProfile: ElderlyProfile = {
        id: `elderly-p-${newUserId}`,
        owner_id: newUserId,
        full_name: fullName,
        emergency_contact_name: undefined,
        emergency_contact_phone: phone || undefined,
        emergency_contact_relation: undefined,
        created_at: new Date().toISOString(),
      };
      elderlyProfiles.push(newElderlyProfile);
      localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(elderlyProfiles));
    }

    return { user: newProfile };
  },

  /**
   * User Sign In with Email & Password
   */
  async signIn(email: string, password: string): Promise<UserAuthResult> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Fetch user's registered role from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, phone')
          .eq('id', data.user.id)
          .single();

        const role = (profileData?.role as UserRole) || (data.user.user_metadata?.role as UserRole) || 'elderly';
        const fullName = profileData?.full_name || data.user.user_metadata?.full_name || email.split('@')[0];

        const userProfile: UserProfile = {
          id: data.user.id,
          name: fullName,
          email: data.user.email || email,
          role,
          phone: profileData?.phone,
        };

        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userProfile));
        return { user: userProfile };
      }
    }

    // Local fallback
    const profiles: StoredUserProfile[] = JSON.parse(localStorage.getItem(STORAGE_PROFILES_KEY) || '[]');
    const found = profiles.find(profile => profile.email.toLowerCase() === email.toLowerCase());
    
    // Check against demo accounts if not in custom profiles
    if (!found) {
      if (email.includes('eleanor') || email.includes('senior')) {
        const elderlyUser: UserProfile = {
          id: 'usr-elderly-1',
          name: 'Eleanor Vance',
          email,
          role: 'elderly',
          phone: '+1 (555) 234-8901',
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(elderlyUser));
        return { user: elderlyUser };
      } else if (email.includes('david') || email.includes('family')) {
        const familyUser: UserProfile = {
          id: 'usr-family-1',
          name: 'David Vance',
          email,
          role: 'family_member',
          phone: '+1 (555) 234-8901',
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(familyUser));
        return { user: familyUser };
      } else if (email.includes('maria') || email.includes('caretaker')) {
        const caretakerUser: UserProfile = {
          id: 'usr-caretaker-1',
          name: 'Maria Rodriguez, CNA',
          email,
          role: 'caretaker',
          phone: '+1 (555) 876-4321',
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(caretakerUser));
        return { user: caretakerUser };
      }
      return { user: null, error: 'Invalid email or password. Please check your credentials.' };
    }

    if (found.password !== password) {
      return { user: null, error: 'Incorrect password entered.' };
    }

    const { password: _, ...userSafe } = found;
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userSafe));
    return { user: userSafe };
  },

  /**
   * Fast Passcode Authentication for Elderly Profile
   * Verifies against salted cryptographic hash server-side
   */
  async signInWithPasscode(passcode: string): Promise<PasscodeAuthResult> {
    if (isSupabaseConfigured && supabase) {
      const { data: elderlyProfiles } = await supabase
        .from('care_profiles')
        .select('id, owner_id, full_name, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_at, updated_at')
        .limit(1);

      if (elderlyProfiles && elderlyProfiles.length > 0) {
        const ep = elderlyProfiles[0];
        const { data: isValid } = await supabase.rpc('verify_elderly_passcode', {
          p_profile_id: ep.id,
          p_input_passcode: passcode,
        });

        if (isValid) {
          const userProfile: UserProfile = {
            id: ep.owner_id,
            name: ep.full_name,
            email: 'eleanor.vance@carebridge.health',
            role: 'elderly',
          };
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userProfile));
          return { user: userProfile, elderlyProfile: ep };
        }
      }
    }

    // Local verification with cryptographic salted hash
    const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
    if (elderlyProfiles.length === 0) {
      return { user: null, elderlyProfile: null, error: 'No elderly healthcare profile registered yet.' };
    }

    const targetProfile = elderlyProfiles[0];
    const { hash } = await hashPasscode(passcode, 'CareBridgeFixedSalt');
    const isValid = Boolean(targetProfile.passcode_hash && targetProfile.passcode_hash === hash);

    if (!isValid) {
      return { user: null, elderlyProfile: null, error: 'Incorrect 4-digit passcode. Please try again.' };
    }

    const userProfile: UserProfile = {
      id: targetProfile.owner_id,
      name: targetProfile.full_name,
      email: `${targetProfile.full_name.toLowerCase().replace(/\s+/g, '.')}@carebridge.health`,
      role: 'elderly',
      emergencyContact: targetProfile.emergency_contact_name ? {
        name: targetProfile.emergency_contact_name,
        relationship: targetProfile.emergency_contact_relation || 'Emergency Contact',
        phone: targetProfile.emergency_contact_phone || '',
      } : undefined,
    };

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userProfile));
    return { user: userProfile, elderlyProfile: targetProfile };
  },

  /**
   * Sign Out and Clear Session
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout notice:', err);
      }
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },

  /**
   * Get Active Session from persistence
   */
  async getActiveSession(): Promise<UserProfile | null> {
    const cached = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!cached) return null;
    try {
      const user = JSON.parse(cached) as UserProfile;
      // Normalization check: if demo user had old id 'usr-101', normalize to 'usr-elderly-1'
      if (user.id === 'usr-101' && user.role === 'elderly') {
        user.id = 'usr-elderly-1';
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      }
      return user;
    } catch {
      return null;
    }
  },

  // ============================================================================
  // HEALTHCARE PROFILES & MULTI-USER ROLE MANAGEMENT
  // ============================================================================

  /**
   * Create or Update an Elderly Healthcare Profile
   * Writes directly to care_profiles table and hashes passcode server-side via RPC.
   * Never stores plaintext passcode or returns passcode_hash to client.
   */
  async createElderlyProfile(params: {
    ownerId: string;
    fullName: string;
    dateOfBirth?: string;
    passcode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  }): Promise<ProfileResult> {
    const { ownerId, fullName, dateOfBirth, passcode, emergencyContactName, emergencyContactPhone, emergencyContactRelation } = params;

    if (isSupabaseConfigured && supabase) {
      // The cached CareBridge user (including passcode login) is application state,
      // not a Supabase Auth identity. Only a real JWT session can satisfy RLS.
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return { profile: null, error: 'A Supabase account session is required to create or update a care profile. Sign in with your account first.' };
      }
      if (ownerId !== authUser.id) {
        return { profile: null, error: 'The active Supabase account does not own this care profile.' };
      }

      // 1. Write profile records to the actual care_profiles table (never the elderly_profiles view)
      const { data: profileRecord, error: profileError } = await supabase
        .from('care_profiles')
        .upsert({
          owner_id: authUser.id,
          full_name: fullName,
          date_of_birth: dateOfBirth || null,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          emergency_contact_relation: emergencyContactRelation,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id' })
        .select('id, owner_id, full_name, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_at, updated_at')
        .single();

      if (profileError) {
        return { profile: null, error: profileError.message };
      }

      // 2. Hash and store the 4-digit passcode securely server-side via set_care_passcode RPC
      if (passcode) {
        const { error: passcodeError } = await supabase.rpc('set_care_passcode', {
          p_profile_id: profileRecord.id,
          p_passcode: passcode,
        });

        if (passcodeError) {
          return { profile: null, error: `Profile created, but failed to set passcode: ${passcodeError.message}` };
        }
      }

      // Return clean profile without exposing passcode_hash to frontend
      const safeProfile: ElderlyProfile = { ...profileRecord };

      return { profile: safeProfile };
    }

    // Local DB (offline fallback)
    const { hash } = await hashPasscode(passcode, 'CareBridgeFixedSalt');
    const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
    const existingIndex = elderlyProfiles.findIndex(p => p.owner_id === ownerId);

    const profileData: ElderlyProfile = {
      id: existingIndex >= 0 ? elderlyProfiles[existingIndex].id : `elderly-p-${ownerId}`,
      owner_id: ownerId,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      emergency_contact_relation: emergencyContactRelation,
      created_at: existingIndex >= 0 ? elderlyProfiles[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      elderlyProfiles[existingIndex] = { ...profileData, passcode_hash: hash };
    } else {
      elderlyProfiles.push({ ...profileData, passcode_hash: hash });
    }
    localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(elderlyProfiles));

    // Guarantee passcode_hash is not returned in client response
    return { profile: profileData };
  },

  /**
   * Fetch connected elderly profile for the user
   * Guarantees profile ownership for elderly individuals
   * Enforces that revoked or non-members receive null
   */
  async getElderlyProfile(userId: string, role: UserRole): Promise<ElderlyProfile | null> {
    if (isSupabaseConfigured && supabase) {
      if (role === 'elderly') {
        const { data } = await supabase
          .from('care_profiles')
          .select('id, owner_id, full_name, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_at, updated_at')
          .eq('owner_id', userId)
          .maybeSingle();

        if (data) return data;

        // If not found, provision one for this elderly owner
        const { data: newProfile } = await supabase
          .from('care_profiles')
          .insert({
            owner_id: userId,
            full_name: 'My Healthcare Profile',
            emergency_contact_name: null,
            emergency_contact_phone: null,
            emergency_contact_relation: null,
          })
          .select('id, owner_id, full_name, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_at, updated_at')
          .single();

        return newProfile || null;
      } else {
        // Find joined profile where status is active
        const { data: memberData } = await supabase
          .from('profile_members')
          .select('elderly_profile_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (memberData?.elderly_profile_id) {
          const { data } = await supabase
            .from('care_profiles')
            .select('id, owner_id, full_name, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_at, updated_at')
            .eq('id', memberData.elderly_profile_id)
            .single();
          return data || null;
        }
        // If revoked or not joined, strictly return null (no access)
        return null;
      }
    }

    // Local fallback
    const profiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
    
    const stripPasscodeHash = (p: ElderlyProfile): ElderlyProfile => {
      const copy = { ...p };
      delete copy.passcode_hash;
      return copy;
    };

    if (role === 'elderly') {
      const found = profiles.find(p => p.owner_id === userId);
      if (found) return stripPasscodeHash(found);

      // If this is the demo elderly user id ('usr-elderly-1' or 'usr-101')
      if (userId === 'usr-elderly-1' || userId === 'usr-101') {
        const demo = profiles.find(p => p.id === 'elderly-p-101') || profiles[0];
        if (demo) {
          demo.owner_id = userId; // ensure exact ownership match
          localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(profiles));
          return stripPasscodeHash(demo);
        }
      }

      // Provision profile for this elderly owner so they are 100% the legitimate owner
      const newProfile: ElderlyProfile = {
        id: `elderly-p-${userId}`,
        owner_id: userId,
        full_name: 'My Healthcare Profile',
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relation: null,
        created_at: new Date().toISOString(),
      };
      profiles.push(newProfile);
      localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(profiles));
      return stripPasscodeHash(newProfile);
    } else {
      // Local mode has no trusted membership source; never infer profile access.
      return null;
    }
  },

  /**
   * Get all authorized members connected to the elderly profile
   * RLS limits the roster; member profile details are fetched through the
   * separately protected profiles table.
   */
  async getProfileMembers(elderlyProfileId: string, currentUserId?: string): Promise<ProfileMember[]> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Care Circle requires a configured Supabase connection.');
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user || (currentUserId && authData.user.id !== currentUserId)) {
      throw new Error('Unauthorized: Sign in to view the care circle.');
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('profile_members')
      .select('id, elderly_profile_id, user_id, role, status, permissions, invited_at, accepted_at, revoked_at')
      .eq('elderly_profile_id', elderlyProfileId)
      .order('invited_at', { ascending: false });

    if (membersError) throw membersError;
    if (!memberRows?.length) return [];

    const userIds = [...new Set(memberRows.map(member => member.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds);

    if (profilesError) throw profilesError;
    const profileById = new Map((profiles || []).map(profile => [profile.id, profile]));

    return memberRows.map(member => {
      const profile = profileById.get(member.user_id);
      return {
        ...member,
        permissions: Array.isArray(member.permissions) ? member.permissions : [],
        member_name: profile?.full_name,
        member_email: profile?.email,
        member_phone: profile?.phone,
      };
    });
  },

  /**
   * Invite a new Caretaker or Family Member
   * Invitation codes are generated server-side and only returned to the owner.
   */
  async createInvitation(params: {
    elderlyProfileId: string;
    invitedBy: string;
    invitedEmail: string;
    role: ProfileMemberRole;
  }): Promise<InvitationResult> {
    const { elderlyProfileId, invitedBy, invitedEmail, role } = params;

    if (!isSupabaseConfigured || !supabase) {
      return { invitation: null, error: 'Care Circle requires a configured Supabase connection.' };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) return { invitation: null, error: authError.message };
    if (!authData.user || authData.user.id !== invitedBy) {
      return { invitation: null, error: 'Unauthorized: Sign in as the profile owner to invite members.' };
    }

    const { data, error } = await supabase.rpc('create_profile_invitation', {
      p_care_profile_id: elderlyProfileId,
      p_invited_email: invitedEmail.trim().toLowerCase(),
      p_role: role,
    });

    if (error) return { invitation: null, error: error.message };
    return { invitation: data as ProfileInvitation };
  },

  async verifyInvitation(
    inviteCode: string,
    email: string,
  ): Promise<{ role?: ProfileMemberRole; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Care Circle requires a configured Supabase connection.' };
    }

    const { data, error } = await supabase.rpc('verify_profile_invitation', {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_invited_email: email.trim().toLowerCase(),
    });

    if (error) return { error: error.message };
    if (!data?.valid || !['caretaker', 'family_member'].includes(data.role)) {
      return { error: 'The invitation code is invalid, expired, or was issued to a different email address.' };
    }

    return { role: data.role as ProfileMemberRole };
  },

  /**
   * List owner-visible pending and expired invitations. RLS restricts access to
   * profile owners; invited users redeem only through the email-checking RPC.
   */
  async getPendingInvitations(elderlyProfileId: string, currentUserId?: string): Promise<ProfileInvitation[]> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Care Circle requires a configured Supabase connection.');
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user || (currentUserId && authData.user.id !== currentUserId)) {
      throw new Error('Unauthorized: Sign in as the profile owner to view invitations.');
    }

    const { data, error } = await supabase
      .from('profile_invitations')
      .select('*')
      .eq('elderly_profile_id', elderlyProfileId)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(invitation => ({
      ...invitation,
      status: invitation.status === 'pending' && Date.parse(invitation.expires_at) <= Date.now()
        ? 'expired'
        : invitation.status,
    }));
  },

  /**
   * Accept an invitation. The database atomically validates ownership,
   * authenticated email, expiration, and one-time redemption.
   */
  async acceptInvitation(inviteCode: string, user: UserProfile): Promise<{ success: boolean; elderlyProfileId?: string; role?: ProfileMemberRole; error?: string }> {
    if (!user) {
      return { success: false, error: 'Authentication required. Please sign in before redeeming an invitation code.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Care Circle requires a configured Supabase connection.' };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!authData.user || authData.user.id !== user.id) {
      return { success: false, error: 'Please sign in with the invited account before redeeming this code.' };
    }

    const { data, error } = await supabase.rpc('accept_profile_invitation', {
      p_invite_code: inviteCode.trim().toUpperCase(),
    });

    if (error) return { success: false, error: error.message };
    if (data?.role) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ ...user, role: data.role }));
    }
    return {
      success: true,
      elderlyProfileId: data?.elderly_profile_id,
      role: data?.role,
    };
  },

  /**
   * Revoke member access (Profile Owner only)
   * Immediately terminates member access to this specific healthcare profile
   */
  async revokeMember(memberId: string, currentUserId: string, elderlyProfile: ElderlyProfile): Promise<{ success: boolean; error?: string }> {
    // 1. Strict Owner Authorization Enforcement
    if (!elderlyProfile || elderlyProfile.owner_id !== currentUserId) {
      return { success: false, error: 'Unauthorized: Only the elderly profile owner can revoke member access.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Care Circle requires a configured Supabase connection.' };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!authData.user || authData.user.id !== currentUserId) {
      return { success: false, error: 'Unauthorized: Sign in as the profile owner to revoke access.' };
    }

    const { error } = await supabase.rpc('revoke_profile_member', {
      p_member_id: memberId,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
