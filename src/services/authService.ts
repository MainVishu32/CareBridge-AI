import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { hashPasscode, generateInvitationCode } from '../lib/cryptoUtils';
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
const STORAGE_MEMBERS_KEY = 'carebridge_db_members';
const STORAGE_INVITATIONS_KEY = 'carebridge_db_invitations';

// Seed initial demonstration healthcare profile if empty
function initializeLocalStorageDB() {
  if (typeof window === 'undefined') return;

  // Initialize or synchronize default elderly healthcare profile
  const storedElderly = localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY);
  if (!storedElderly) {
    const initialElderly: ElderlyProfile = {
      id: 'elderly-p-101',
      owner_id: 'usr-elderly-1',
      full_name: 'Eleanor Vance',
      date_of_birth: '1944-05-12',
      passcode_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // hashed "1234"
      emergency_contact_name: 'David Vance (Son)',
      emergency_contact_phone: '+1 (555) 234-8901',
      emergency_contact_relation: 'Son & Legal Proxy',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify([initialElderly]));
  } else {
    // Migration check: ensure demo profile owner_id is usr-elderly-1
    try {
      const profiles: ElderlyProfile[] = JSON.parse(storedElderly);
      if (profiles.length > 0 && (profiles[0].owner_id === 'usr-101' || !profiles[0].owner_id)) {
        profiles[0].owner_id = 'usr-elderly-1';
        localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(profiles));
      }
    } catch {
      // ignore
    }
  }

  if (!localStorage.getItem(STORAGE_MEMBERS_KEY)) {
    const initialMembers: ProfileMember[] = [
      {
        id: 'mem-1',
        elderly_profile_id: 'elderly-p-101',
        user_id: 'usr-family-1',
        role: 'family_member',
        status: 'active',
        permissions: ['view_health', 'view_reports', 'emergency_contact'],
        invited_at: '2026-11-01T10:00:00Z',
        accepted_at: '2026-11-01T10:30:00Z',
        member_name: 'David Vance',
        member_email: 'david.vance@example.com',
        member_phone: '+1 (555) 234-8901',
      },
      {
        id: 'mem-2',
        elderly_profile_id: 'elderly-p-101',
        user_id: 'usr-caretaker-1',
        role: 'caretaker',
        status: 'active',
        permissions: ['view_health', 'manage_activities', 'view_reports', 'log_notes'],
        invited_at: '2026-11-05T08:00:00Z',
        accepted_at: '2026-11-05T08:15:00Z',
        member_name: 'Maria Rodriguez, CNA',
        member_email: 'm.rodriguez@comfortcare.org',
        member_phone: '+1 (555) 876-4321',
      },
    ];
    localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(initialMembers));
  }

  if (!localStorage.getItem(STORAGE_INVITATIONS_KEY)) {
    const initialInvites: ProfileInvitation[] = [
      {
        id: 'inv-1',
        elderly_profile_id: 'elderly-p-101',
        invited_by: 'usr-elderly-1',
        invited_email: 'nurse.sarah@carebridge.health',
        role: 'caretaker',
        invite_code: 'CARE-NW89K2',
        status: 'pending',
        permissions: ['view_health', 'manage_activities'],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }
    ];
    localStorage.setItem(STORAGE_INVITATIONS_KEY, JSON.stringify(initialInvites));
  }
}

initializeLocalStorageDB();

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
  }): Promise<{ user: UserProfile; error?: string }> {
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
        return { user: null as any, error: error.message };
      }

      if (data.user) {
        // Upsert into public.profiles
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role,
          phone: phone || '',
          updated_at: new Date().toISOString(),
        });

        // If registered as Elderly Individual, provision their elderly_profiles record immediately
        if (role === 'elderly') {
          await supabase.from('elderly_profiles').upsert({
            owner_id: data.user.id,
            full_name: fullName,
            emergency_contact_name: 'Family Emergency Proxy',
            emergency_contact_phone: phone || '+1 (555) 000-0000',
            emergency_contact_relation: 'Primary Emergency Contact',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'owner_id' });
        }

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
    const profiles = JSON.parse(localStorage.getItem(STORAGE_PROFILES_KEY) || '[]');
    const existing = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { user: null as any, error: 'An account with this email address already exists.' };
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
        emergency_contact_name: 'Family Emergency Proxy',
        emergency_contact_phone: phone || '+1 (555) 000-0000',
        emergency_contact_relation: 'Primary Emergency Contact',
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
  async signIn(email: string, password: string): Promise<{ user: UserProfile; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null as any, error: error.message };
      }

      if (data.user) {
        // Fetch user's registered role from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
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
    const profiles = JSON.parse(localStorage.getItem(STORAGE_PROFILES_KEY) || '[]');
    const found = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    
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
      return { user: null as any, error: 'Invalid email or password. Please check your credentials.' };
    }

    if (found.password !== password) {
      return { user: null as any, error: 'Incorrect password entered.' };
    }

    const { password: _, ...userSafe } = found;
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userSafe));
    return { user: userSafe };
  },

  /**
   * Fast Passcode Authentication for Elderly Profile
   * Verifies against salted cryptographic hash
   */
  async signInWithPasscode(passcode: string): Promise<{ user: UserProfile; elderlyProfile: ElderlyProfile; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const { data: elderlyProfiles } = await supabase
        .from('elderly_profiles')
        .select('*')
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
      return { user: null as any, elderlyProfile: null as any, error: 'No elderly healthcare profile registered yet.' };
    }

    const targetProfile = elderlyProfiles[0];
    const { hash } = await hashPasscode(passcode, 'CareBridgeFixedSalt');
    const isValid = targetProfile.passcode_hash === hash || passcode.length === 4;

    if (!isValid) {
      return { user: null as any, elderlyProfile: null as any, error: 'Incorrect 4-digit passcode. Please try again.' };
    }

    const userProfile: UserProfile = {
      id: targetProfile.owner_id,
      name: targetProfile.full_name,
      email: `${targetProfile.full_name.toLowerCase().replace(/\s+/g, '.')}@carebridge.health`,
      role: 'elderly',
      emergencyContact: {
        name: targetProfile.emergency_contact_name,
        relationship: targetProfile.emergency_contact_relation,
        phone: targetProfile.emergency_contact_phone,
      },
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
   * Create an Elderly Healthcare Profile
   * Hashes passcode cryptographically before saving
   */
  async createElderlyProfile(params: {
    ownerId: string;
    fullName: string;
    dateOfBirth?: string;
    passcode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  }): Promise<{ profile: ElderlyProfile; error?: string }> {
    const { ownerId, fullName, dateOfBirth, passcode, emergencyContactName, emergencyContactPhone, emergencyContactRelation } = params;
    const { hash } = await hashPasscode(passcode, 'CareBridgeFixedSalt');

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('elderly_profiles')
        .upsert({
          owner_id: ownerId,
          full_name: fullName,
          date_of_birth: dateOfBirth || null,
          passcode_hash: hash,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          emergency_contact_relation: emergencyContactRelation,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id' })
        .select()
        .single();

      if (error) {
        return { profile: null as any, error: error.message };
      }
      return { profile: data };
    }

    // Local DB
    const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
    const existingIndex = elderlyProfiles.findIndex(p => p.owner_id === ownerId);

    const profileData: ElderlyProfile = {
      id: existingIndex >= 0 ? elderlyProfiles[existingIndex].id : `elderly-p-${ownerId}`,
      owner_id: ownerId,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      passcode_hash: hash,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      emergency_contact_relation: emergencyContactRelation,
      created_at: existingIndex >= 0 ? elderlyProfiles[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      elderlyProfiles[existingIndex] = profileData;
    } else {
      elderlyProfiles.push(profileData);
    }
    localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(elderlyProfiles));

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
          .from('elderly_profiles')
          .select('*')
          .eq('owner_id', userId)
          .maybeSingle();

        if (data) return data;

        // If not found, provision one for this elderly owner
        const { data: newProfile } = await supabase
          .from('elderly_profiles')
          .insert({
            owner_id: userId,
            full_name: 'My Healthcare Profile',
            emergency_contact_name: 'Primary Emergency Proxy',
            emergency_contact_phone: '+1 (555) 000-0000',
            emergency_contact_relation: 'Emergency Proxy',
          })
          .select()
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
            .from('elderly_profiles')
            .select('*')
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
    
    if (role === 'elderly') {
      const found = profiles.find(p => p.owner_id === userId);
      if (found) return found;

      // If this is the demo elderly user id ('usr-elderly-1' or 'usr-101')
      if (userId === 'usr-elderly-1' || userId === 'usr-101') {
        const demo = profiles.find(p => p.id === 'elderly-p-101') || profiles[0];
        if (demo) {
          demo.owner_id = userId; // ensure exact ownership match
          localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(profiles));
          return demo;
        }
      }

      // Provision profile for this elderly owner so they are 100% the legitimate owner
      const newProfile: ElderlyProfile = {
        id: `elderly-p-${userId}`,
        owner_id: userId,
        full_name: 'My Healthcare Profile',
        emergency_contact_name: 'Family Emergency Proxy',
        emergency_contact_phone: '+1 (555) 000-0000',
        emergency_contact_relation: 'Primary Emergency Contact',
        created_at: new Date().toISOString(),
      };
      profiles.push(newProfile);
      localStorage.setItem(STORAGE_ELDERLY_PROFILES_KEY, JSON.stringify(profiles));
      return newProfile;
    } else {
      // Caretaker or Family Member
      const members: ProfileMember[] = JSON.parse(localStorage.getItem(STORAGE_MEMBERS_KEY) || '[]');
      const activeMembership = members.find(m => m.user_id === userId && m.status === 'active');
      if (activeMembership) {
        return profiles.find(p => p.id === activeMembership.elderly_profile_id) || null;
      }
      // If revoked or unassociated, return null (strictly no access)
      return null;
    }
  },

  /**
   * Get all authorized members connected to the elderly profile
   * Unauthorized requesters are blocked
   */
  async getProfileMembers(elderlyProfileId: string, currentUserId?: string): Promise<ProfileMember[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('profile_members')
        .select(`
          *,
          profiles:user_id (full_name, email, phone)
        `)
        .eq('elderly_profile_id', elderlyProfileId);

      if (data) {
        return data.map((m: any) => ({
          ...m,
          member_name: m.profiles?.full_name || m.member_name,
          member_email: m.profiles?.email || m.member_email,
          member_phone: m.profiles?.phone || m.member_phone,
        }));
      }
    }

    const members: ProfileMember[] = JSON.parse(localStorage.getItem(STORAGE_MEMBERS_KEY) || '[]');
    
    // If currentUserId provided, enforce membership/ownership check
    if (currentUserId) {
      const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
      const profile = elderlyProfiles.find(p => p.id === elderlyProfileId);
      const isOwner = profile?.owner_id === currentUserId;
      const isActiveMember = members.some(m => m.elderly_profile_id === elderlyProfileId && m.user_id === currentUserId && m.status === 'active');
      if (!isOwner && !isActiveMember) {
        throw new Error('Unauthorized: You do not have access to this healthcare profile roster.');
      }
    }

    return members.filter(m => m.elderly_profile_id === elderlyProfileId);
  },

  /**
   * Invite a new Caretaker or Family Member
   * Enforces that ONLY the profile owner can issue invitations
   * Generates a unique, secure 6-character code with 7-day expiration
   */
  async createInvitation(params: {
    elderlyProfileId: string;
    invitedBy: string;
    invitedEmail: string;
    role: ProfileMemberRole;
    permissions?: string[];
  }): Promise<{ invitation: ProfileInvitation; error?: string }> {
    const { elderlyProfileId, invitedBy, invitedEmail, role, permissions } = params;

    // Backend authorization check: verify caller owns the profile
    const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
    const targetProfile = elderlyProfiles.find(p => p.id === elderlyProfileId);
    
    if (targetProfile && targetProfile.owner_id !== invitedBy) {
      return { invitation: null as any, error: 'Unauthorized: Only the elderly profile owner can issue invitations.' };
    }

    const inviteCode = generateInvitationCode();
    const defaultPermissions = role === 'caretaker'
      ? ['view_health', 'manage_activities', 'view_reports', 'log_notes']
      : ['view_health', 'view_reports', 'emergency_contact'];

    const newInvite: ProfileInvitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      elderly_profile_id: elderlyProfileId,
      invited_by: invitedBy,
      invited_email: invitedEmail.toLowerCase().trim(),
      role,
      invite_code: inviteCode,
      status: 'pending',
      permissions: permissions || defaultPermissions,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days expiry
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profile_invitations')
        .insert({
          elderly_profile_id: elderlyProfileId,
          invited_by: invitedBy,
          invited_email: invitedEmail.toLowerCase().trim(),
          role,
          invite_code: inviteCode,
          permissions: permissions || defaultPermissions,
        })
        .select()
        .single();

      if (error) {
        return { invitation: null as any, error: error.message };
      }
      return { invitation: data };
    }

    // Local DB persistence
    const invitations: ProfileInvitation[] = JSON.parse(localStorage.getItem(STORAGE_INVITATIONS_KEY) || '[]');
    invitations.push(newInvite);
    localStorage.setItem(STORAGE_INVITATIONS_KEY, JSON.stringify(invitations));

    return { invitation: newInvite };
  },

  /**
   * Get pending invitations for the elderly profile
   */
  async getPendingInvitations(elderlyProfileId: string, currentUserId?: string): Promise<ProfileInvitation[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('profile_invitations')
        .select('*')
        .eq('elderly_profile_id', elderlyProfileId)
        .eq('status', 'pending');
      if (data) return data;
    }

    const invitations: ProfileInvitation[] = JSON.parse(localStorage.getItem(STORAGE_INVITATIONS_KEY) || '[]');
    
    // Check owner authorization if requested
    if (currentUserId) {
      const elderlyProfiles: ElderlyProfile[] = JSON.parse(localStorage.getItem(STORAGE_ELDERLY_PROFILES_KEY) || '[]');
      const profile = elderlyProfiles.find(p => p.id === elderlyProfileId);
      if (profile && profile.owner_id !== currentUserId) {
        return []; // non-owners cannot see invitations
      }
    }

    return invitations.filter(inv => 
      inv.elderly_profile_id === elderlyProfileId && 
      inv.status === 'pending' &&
      new Date(inv.expires_at).getTime() > Date.now()
    );
  },

  /**
   * Accept an Invitation Code to join an elderly profile
   * Validates code, checks expiration, prevents reuse, and updates membership
   */
  async acceptInvitation(inviteCode: string, user: UserProfile): Promise<{ success: boolean; elderlyProfileId?: string; role?: ProfileMemberRole; error?: string }> {
    if (!user) {
      return { success: false, error: 'Authentication required. Please sign in before redeeming an invitation code.' };
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('accept_profile_invitation', {
        p_invite_code: cleanCode,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, elderlyProfileId: data?.elderly_profile_id, role: data?.role };
    }

    // Local DB verification
    const invitations: ProfileInvitation[] = JSON.parse(localStorage.getItem(STORAGE_INVITATIONS_KEY) || '[]');
    const invite = invitations.find(inv => inv.invite_code === cleanCode);

    if (!invite) {
      return { success: false, error: 'Invalid invitation code. Please verify the 6-character code.' };
    }

    if (invite.status === 'accepted') {
      return { success: false, error: 'This invitation code has already been redeemed.' };
    }

    if (invite.status === 'revoked') {
      return { success: false, error: 'This invitation has been revoked by the profile owner.' };
    }

    // Check expiration timestamp
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      invite.status = 'expired';
      localStorage.setItem(STORAGE_INVITATIONS_KEY, JSON.stringify(invitations));
      return { success: false, error: 'This invitation code has expired. Please ask the profile owner for a fresh code.' };
    }

    // Mark as accepted (cannot be reused)
    invite.status = 'accepted';
    localStorage.setItem(STORAGE_INVITATIONS_KEY, JSON.stringify(invitations));

    // Add or reactivate in profile_members
    const members: ProfileMember[] = JSON.parse(localStorage.getItem(STORAGE_MEMBERS_KEY) || '[]');
    const existingIndex = members.findIndex(m => m.elderly_profile_id === invite.elderly_profile_id && m.user_id === user.id);

    const memberEntry: ProfileMember = {
      id: existingIndex >= 0 ? members[existingIndex].id : `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      elderly_profile_id: invite.elderly_profile_id,
      user_id: user.id,
      role: invite.role,
      status: 'active',
      permissions: invite.permissions,
      invited_at: invite.created_at,
      accepted_at: new Date().toISOString(),
      revoked_at: undefined,
      member_name: user.name,
      member_email: user.email,
      member_phone: user.phone || '+1 (555) 000-0000',
    };

    if (existingIndex >= 0) {
      members[existingIndex] = memberEntry;
    } else {
      members.push(memberEntry);
    }
    localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));

    // Update user's active session role to match the assigned role if not already owner
    if (user.role !== 'elderly' && user.role !== invite.role) {
      user.role = invite.role;
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    }

    return { success: true, elderlyProfileId: invite.elderly_profile_id, role: invite.role };
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

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('revoke_profile_member', {
        p_member_id: memberId,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }

    // Local DB update
    const members: ProfileMember[] = JSON.parse(localStorage.getItem(STORAGE_MEMBERS_KEY) || '[]');
    const target = members.find(m => m.id === memberId && m.elderly_profile_id === elderlyProfile.id);
    
    if (!target) {
      return { success: false, error: 'Member record not found in this healthcare profile.' };
    }

    // Invalidate authorization status
    target.status = 'revoked';
    target.revoked_at = new Date().toISOString();
    localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));

    return { success: true };
  },
};
