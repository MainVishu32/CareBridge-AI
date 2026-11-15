-- ==============================================================================
-- PHASE 2 MIGRATION: AUTHENTICATION, USER ROLES & SHARED HEALTHCARE PROFILES
-- ==============================================================================

-- Enable pgcrypto for secure server-side passcode hashing & verification
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PUBLIC PROFILES TABLE (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('elderly', 'caretaker', 'family_member')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ELDERLY HEALTHCARE PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.elderly_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  passcode_hash TEXT, -- Stored as bcrypt / crypt hash with salt; NEVER plain text
  emergency_contact_name TEXT NOT NULL DEFAULT 'Primary Emergency Contact',
  emergency_contact_phone TEXT NOT NULL DEFAULT '+1 (555) 000-0000',
  emergency_contact_relation TEXT NOT NULL DEFAULT 'Emergency Proxy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_elderly_owner UNIQUE (owner_id)
);

-- 3. PROFILE MEMBERS TABLE (Shared Healthcare Profile Permissions)
CREATE TABLE IF NOT EXISTS public.profile_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('caretaker', 'family_member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT unique_profile_user UNIQUE (elderly_profile_id, user_id)
);

-- 4. PROFILE INVITATIONS TABLE (Secure Invitation Codes)
CREATE TABLE IF NOT EXISTS public.profile_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('caretaker', 'family_member')),
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- ------------------------------------------------------------------------------
-- AUTOMATIC NEW USER TRIGGER: Create public.profiles upon auth.users signup
-- Auto-provisions elderly_profiles for Elderly Individual (Profile Owner)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'family_member');
  v_phone := NEW.raw_user_meta_data->>'phone';

  -- 1. Insert or update public.profiles
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_phone
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      phone = EXCLUDED.phone,
      updated_at = now();

  -- 2. If registered as an elderly individual, provision their primary healthcare profile
  IF v_role = 'elderly' THEN
    INSERT INTO public.elderly_profiles (
      owner_id,
      full_name,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation
    )
    VALUES (
      NEW.id,
      v_name,
      'Family Emergency Proxy',
      COALESCE(v_phone, '+1 (555) 000-0000'),
      'Primary Emergency Contact'
    )
    ON CONFLICT (owner_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- SECURE DATABASE FUNCTIONS FOR PASSCODES & INVITATIONS
-- ------------------------------------------------------------------------------

-- Set or update elderly profile passcode (Never stored plain text)
CREATE OR REPLACE FUNCTION public.set_elderly_passcode(
  p_profile_id UUID,
  p_passcode TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Verify caller is the owner
  IF NOT EXISTS (
    SELECT 1 FROM public.elderly_profiles 
    WHERE id = p_profile_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only profile owner can set the passcode.';
  END IF;

  -- Hash using pgcrypto blowfish crypt
  UPDATE public.elderly_profiles
  SET passcode_hash = crypt(p_passcode, gen_salt('bf', 8)),
      updated_at = now()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify passcode securely without exposing the hash to clients
CREATE OR REPLACE FUNCTION public.verify_elderly_passcode(
  p_profile_id UUID,
  p_input_passcode TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT passcode_hash INTO v_hash
  FROM public.elderly_profiles
  WHERE id = p_profile_id;

  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (v_hash = crypt(p_input_passcode, v_hash));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept an invitation code securely
CREATE OR REPLACE FUNCTION public.accept_profile_invitation(
  p_invite_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required to accept an invitation.';
  END IF;

  -- Find valid pending invitation
  SELECT * INTO v_invite
  FROM public.profile_invitations
  WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already redeemed invitation code.';
  END IF;

  -- Insert or reactivate in profile_members
  INSERT INTO public.profile_members (
    elderly_profile_id,
    user_id,
    role,
    status,
    permissions,
    accepted_at
  )
  VALUES (
    v_invite.elderly_profile_id,
    v_user_id,
    v_invite.role,
    'active',
    v_invite.permissions,
    now()
  )
  ON CONFLICT (elderly_profile_id, user_id) DO UPDATE
  SET status = 'active',
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      accepted_at = now(),
      revoked_at = NULL;

  -- Mark invitation as accepted
  UPDATE public.profile_invitations
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'elderly_profile_id', v_invite.elderly_profile_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke a member access (Owner only)
CREATE OR REPLACE FUNCTION public.revoke_profile_member(
  p_member_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Ensure caller owns the elderly profile linked to this membership
  IF NOT EXISTS (
    SELECT 1 FROM public.profile_members pm
    JOIN public.elderly_profiles ep ON ep.id = pm.elderly_profile_id
    WHERE pm.id = p_member_id AND ep.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the profile owner can revoke member access.';
  END IF;

  UPDATE public.profile_members
  SET status = 'revoked',
      revoked_at = now()
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elderly_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_invitations ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profile owners and members can see profile basic info of co-members
CREATE POLICY "Members in same care circle can view co-member names"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_members pm1
      JOIN public.profile_members pm2 ON pm1.elderly_profile_id = pm2.elderly_profile_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = public.profiles.id AND pm1.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.elderly_profiles ep
      JOIN public.profile_members pm ON ep.id = pm.elderly_profile_id
      WHERE (ep.owner_id = auth.uid() AND pm.user_id = public.profiles.id)
         OR (ep.owner_id = public.profiles.id AND pm.user_id = auth.uid() AND pm.status = 'active')
    )
  );

-- 2. Elderly Profiles Table Policies
-- Owner has full CRUD control
CREATE POLICY "Owner full control over their elderly profile"
  ON public.elderly_profiles FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Authorized active members can view elderly profile (Revoked members denied)
CREATE POLICY "Active members can view elderly profile"
  ON public.elderly_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_members
      WHERE elderly_profile_id = public.elderly_profiles.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- 3. Profile Members Table Policies
-- Profile owner can manage all members of their profile
CREATE POLICY "Owner can manage members of their profile"
  ON public.profile_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.elderly_profiles
      WHERE id = public.profile_members.elderly_profile_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elderly_profiles
      WHERE id = public.profile_members.elderly_profile_id
        AND owner_id = auth.uid()
    )
  );

-- Active members can see co-members of the same care circle
CREATE POLICY "Members can view care circle membership"
  ON public.profile_members FOR SELECT
  USING (
    (user_id = auth.uid() AND status = 'active')
    OR EXISTS (
      SELECT 1 FROM public.profile_members my_m
      WHERE my_m.elderly_profile_id = public.profile_members.elderly_profile_id
        AND my_m.user_id = auth.uid()
        AND my_m.status = 'active'
    )
  );

-- 4. Profile Invitations Table Policies
-- Owner has full control over invitations
CREATE POLICY "Owner can manage invitations"
  ON public.profile_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.elderly_profiles
      WHERE id = public.profile_invitations.elderly_profile_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elderly_profiles
      WHERE id = public.profile_invitations.elderly_profile_id
        AND owner_id = auth.uid()
    )
  );

-- Any authenticated user can read an invitation by code (for redemption)
CREATE POLICY "Authenticated users can verify invite codes"
  ON public.profile_invitations FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'pending');
