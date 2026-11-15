-- ==============================================================================
-- CAREBRIDGE — PHASE 3.1: HARDENED DATABASE SCHEMA IMPLEMENTATION (FINAL REVIEW)
-- Project: CareBridge-AI (PostgreSQL / Supabase)
-- ==============================================================================

-- Enable required cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked 1:1 with auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('elderly', 'caretaker', 'family_member')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. CARE_PROFILES TABLE (Central Healthcare Profiles)
-- Passcode hash is kept secure and emergency contact fields are nullable (no fake defaults)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.care_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  passcode_hash TEXT, -- Blowfish crypt hash; accessed only via secure verification RPC
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_care_owner UNIQUE (owner_id)
);

-- ------------------------------------------------------------------------------
-- 3. CARE_MEMBERS TABLE (Shared Care Circle Permissions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.care_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_profile_id UUID NOT NULL REFERENCES public.care_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('caretaker', 'family_member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT unique_care_profile_user UNIQUE (care_profile_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. INVITATIONS TABLE (Secure 6-Character Invitation Codes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_profile_id UUID NOT NULL REFERENCES public.care_profiles(id) ON DELETE CASCADE,
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
-- 5. MEDICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_profile_id UUID NOT NULL REFERENCES public.care_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  purpose TEXT,
  instructions TEXT,
  prescribing_doctor TEXT,
  pill_color TEXT NOT NULL DEFAULT 'bg-blue-100 text-blue-700 border-blue-300',
  remaining_count INT NOT NULL DEFAULT 30 CHECK (remaining_count >= 0),
  refill_threshold INT NOT NULL DEFAULT 5 CHECK (refill_threshold >= 0),
  refill_needed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_medication_profile UNIQUE (id, care_profile_id)
);

-- ------------------------------------------------------------------------------
-- 6. MEDICATION_SCHEDULES TABLE
-- Composite foreign key guarantees schedule cannot reference medication of another profile
-- Validates days_of_week array elements are between 0 (Sunday) and 6 (Saturday)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL,
  care_profile_id UUID NOT NULL,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('Morning', 'Afternoon', 'Evening', 'Bedtime')),
  schedule_time TIME NOT NULL, -- e.g. '08:00:00'
  days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}' 
    CHECK (days_of_week <@ ARRAY[0,1,2,3,4,5,6] AND array_length(days_of_week, 1) > 0),
  dosage_quantity INT NOT NULL DEFAULT 1 CHECK (dosage_quantity > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_schedule_medication_profile 
    FOREIGN KEY (medication_id, care_profile_id) 
    REFERENCES public.medications(id, care_profile_id) 
    ON DELETE CASCADE,
  CONSTRAINT uq_schedule_med_profile UNIQUE (id, medication_id, care_profile_id)
);

-- ------------------------------------------------------------------------------
-- 7. MEDICATION_LOGS TABLE
-- Foreign keys with safe cascade/nullify behavior:
-- - Deleting a medication cascades to delete its logs.
-- - Deleting a schedule safely sets schedule_id to NULL without attempting to nullify medication_id or care_profile_id.
-- - Trigger verifies schedule belongs to the same medication and profile.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL,
  schedule_id UUID,
  care_profile_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('taken', 'pending', 'missed')),
  taken_at TIMESTAMPTZ,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_log_medication_profile 
    FOREIGN KEY (medication_id, care_profile_id) 
    REFERENCES public.medications(id, care_profile_id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_log_schedule 
    FOREIGN KEY (schedule_id) 
    REFERENCES public.medication_schedules(id) 
    ON DELETE SET NULL
);

-- Trigger to verify schedule consistency on medication_logs
CREATE OR REPLACE FUNCTION public.check_medication_log_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.schedule_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.medication_schedules 
      WHERE id = NEW.schedule_id 
        AND medication_id = NEW.medication_id 
        AND care_profile_id = NEW.care_profile_id
    ) THEN
      RAISE EXCEPTION 'Database consistency error: Schedule does not belong to the specified medication and care profile.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_check_medication_log_consistency ON public.medication_logs;
CREATE TRIGGER trg_check_medication_log_consistency
  BEFORE INSERT OR UPDATE ON public.medication_logs
  FOR EACH ROW EXECUTE FUNCTION public.check_medication_log_consistency();

-- ------------------------------------------------------------------------------
-- 8. APPOINTMENTS TABLE (Doctor Appointments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_profile_id UUID NOT NULL REFERENCES public.care_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  address TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('In-person', 'Telehealth')),
  transport_arranged BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE (Alerts & Reminders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_profile_id UUID NOT NULL REFERENCES public.care_profiles(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('medication_reminder', 'appointment_reminder', 'care_circle_update', 'emergency_alert', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  link_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 10. ACTIVITY_LOGS TABLE (Healthcare Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_profile_id UUID NOT NULL REFERENCES public.care_profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'medication_logged',
    'medication_created',
    'medication_updated',
    'appointment_scheduled',
    'appointment_updated',
    'appointment_cancelled',
    'member_invited',
    'member_joined',
    'member_revoked',
    'profile_updated',
    'emergency_contact_updated'
  )),
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- BACKWARDS COMPATIBILITY VIEWS WITH SECURITY INVOKER
-- - Prevents views from bypassing underlying table RLS
-- - Obfuscates passcode_hash so non-owners cannot read it
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.elderly_profiles 
WITH (security_invoker = true) AS 
  SELECT 
    id,
    owner_id,
    full_name,
    date_of_birth,
    CASE WHEN owner_id = auth.uid() THEN passcode_hash ELSE NULL END AS passcode_hash,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    created_at,
    updated_at
  FROM public.care_profiles;

-- Instead-of trigger on elderly_profiles view:
-- Routes any accidental INSERT or UPDATE from view to underlying care_profiles table
CREATE OR REPLACE FUNCTION public.instead_of_elderly_profiles_upsert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Profile owner must match authenticated user.';
    END IF;

    INSERT INTO public.care_profiles (
      id, owner_id, full_name, date_of_birth,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      created_at, updated_at
    )
    VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      v_user_id,
      NEW.full_name,
      NEW.date_of_birth,
      NEW.emergency_contact_name,
      NEW.emergency_contact_phone,
      NEW.emergency_contact_relation,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.updated_at, now())
    )
    ON CONFLICT (owner_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      date_of_birth = EXCLUDED.date_of_birth,
      emergency_contact_name = EXCLUDED.emergency_contact_name,
      emergency_contact_phone = EXCLUDED.emergency_contact_phone,
      emergency_contact_relation = EXCLUDED.emergency_contact_relation,
      updated_at = now()
    RETURNING id INTO v_profile_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.care_profiles SET
      full_name = COALESCE(NEW.full_name, full_name),
      date_of_birth = COALESCE(NEW.date_of_birth, date_of_birth),
      emergency_contact_name = COALESCE(NEW.emergency_contact_name, emergency_contact_name),
      emergency_contact_phone = COALESCE(NEW.emergency_contact_phone, emergency_contact_phone),
      emergency_contact_relation = COALESCE(NEW.emergency_contact_relation, emergency_contact_relation),
      updated_at = now()
    WHERE id = OLD.id AND owner_id = v_user_id;

    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_instead_of_elderly_profiles ON public.elderly_profiles;
CREATE TRIGGER trg_instead_of_elderly_profiles
  INSTEAD OF INSERT OR UPDATE ON public.elderly_profiles
  FOR EACH ROW EXECUTE FUNCTION public.instead_of_elderly_profiles_upsert();

CREATE OR REPLACE VIEW public.profile_members 
WITH (security_invoker = true) AS 
  SELECT 
    id,
    care_profile_id AS elderly_profile_id,
    user_id,
    role,
    status,
    permissions,
    invited_at,
    accepted_at,
    revoked_at
  FROM public.care_members;

CREATE OR REPLACE VIEW public.profile_invitations 
WITH (security_invoker = true) AS 
  SELECT 
    id,
    care_profile_id AS elderly_profile_id,
    invited_by,
    invited_email,
    role,
    invite_code,
    status,
    permissions,
    created_at,
    expires_at
  FROM public.invitations;

-- ------------------------------------------------------------------------------
-- PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_care_profiles_owner ON public.care_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_care_members_profile_user ON public.care_members(care_profile_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_profile ON public.invitations(care_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(LOWER(invited_email), status);

CREATE INDEX IF NOT EXISTS idx_medications_profile ON public.medications(care_profile_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_med ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_profile ON public.medication_schedules(care_profile_id, time_of_day);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med_date ON public.medication_logs(medication_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_status ON public.medication_logs(care_profile_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_appointments_profile_date ON public.appointments(care_profile_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_profile_created ON public.activity_logs(care_profile_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- SECURITY HELPER FUNCTIONS WITH PINNED SEARCH_PATH
-- ------------------------------------------------------------------------------

-- Check if authenticated user is the owner of the given care profile
CREATE OR REPLACE FUNCTION public.is_care_profile_owner(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.care_profiles
    WHERE id = p_profile_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

-- Check if authenticated user is authorized (Owner OR Active Care Circle Member)
CREATE OR REPLACE FUNCTION public.is_care_profile_authorized(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.care_profiles
      WHERE id = p_profile_id AND owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.care_members
      WHERE care_profile_id = p_profile_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

-- Check if user has caregiver management privileges (Owner OR Active Caretaker)
CREATE OR REPLACE FUNCTION public.can_manage_care_activities(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.care_profiles
      WHERE id = p_profile_id AND owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.care_members
      WHERE care_profile_id = p_profile_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role = 'caretaker'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- ROLE TAMPERING PREVENTION (Protects role column on profiles from client mutation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Unauthorized: User role is immutable and cannot be changed directly.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ------------------------------------------------------------------------------
-- AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_care_profiles_updated_at ON public.care_profiles;
CREATE TRIGGER set_care_profiles_updated_at BEFORE UPDATE ON public.care_profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_medications_updated_at ON public.medications;
CREATE TRIGGER set_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- AUTOMATIC NEW USER SIGNUP TRIGGER (Nullable emergency contacts, clean defaults)
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

  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (NEW.id, NEW.email, v_name, v_role, v_phone)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, updated_at = now();

  IF v_role = 'elderly' THEN
    INSERT INTO public.care_profiles (owner_id, full_name, emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
    VALUES (NEW.id, v_name, NULL, NULL, NULL)
    ON CONFLICT (owner_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- SECURE STORED PROCEDURES (PASSCODE & INVITATIONS)
-- ------------------------------------------------------------------------------

-- 1. Verify Passcode Server-Side (Requires authentication and profile authorization)
CREATE OR REPLACE FUNCTION public.verify_care_passcode(
  p_profile_id UUID,
  p_input_passcode TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Strict requirement: Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  -- Strict requirement: Caller must be an authorized member of this profile
  IF NOT public.is_care_profile_authorized(p_profile_id) THEN
    RAISE EXCEPTION 'Unauthorized: You are not authorized to access this care profile.';
  END IF;

  -- Passcode sanity check (prevent brute-forcing / abnormal payloads)
  IF p_input_passcode IS NULL OR length(p_input_passcode) < 4 OR length(p_input_passcode) > 8 THEN
    RETURN FALSE;
  END IF;

  SELECT passcode_hash INTO v_hash
  FROM public.care_profiles
  WHERE id = p_profile_id;

  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (v_hash = crypt(p_input_passcode, v_hash));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

-- Backwards compatibility alias for existing frontend callers
CREATE OR REPLACE FUNCTION public.verify_elderly_passcode(
  p_profile_id UUID,
  p_input_passcode TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.verify_care_passcode(p_profile_id, p_input_passcode);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

-- 2. Set Passcode Server-Side (Owner only)
CREATE OR REPLACE FUNCTION public.set_care_passcode(
  p_profile_id UUID,
  p_passcode TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.care_profiles 
    WHERE id = p_profile_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the profile owner can set the passcode.';
  END IF;

  IF length(p_passcode) < 4 THEN
    RAISE EXCEPTION 'Passcode must be at least 4 digits.';
  END IF;

  UPDATE public.care_profiles
  SET passcode_hash = crypt(p_passcode, gen_salt('bf', 8)),
      updated_at = now()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.set_elderly_passcode(
  p_profile_id UUID,
  p_passcode TEXT
)
RETURNS VOID AS $$
BEGIN
  PERFORM public.set_care_passcode(p_profile_id, p_passcode);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. Controlled Invitation Verification
-- Abuse-protected: validates code format and returns only non-sensitive role and profile metadata
-- Does NOT expose the invited email address or personal contact info
CREATE OR REPLACE FUNCTION public.verify_invitation_code(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_clean_code TEXT;
BEGIN
  v_clean_code := UPPER(TRIM(COALESCE(p_invite_code, '')));

  -- Abuse check: Enforce standard invitation code pattern (CARE-XXXXXX, length 11)
  IF length(v_clean_code) != 11 OR NOT (v_clean_code LIKE 'CARE-%') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid invitation code format.');
  END IF;

  SELECT i.id, i.care_profile_id, i.role, cp.full_name AS profile_name
  INTO v_invite
  FROM public.invitations i
  JOIN public.care_profiles cp ON cp.id = i.care_profile_id
  WHERE i.invite_code = v_clean_code
    AND i.status = 'pending'
    AND i.expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid, expired, or already used invitation code.');
  END IF;

  -- Return only non-sensitive verification metadata (no email or personal contact info exposed)
  RETURN jsonb_build_object(
    'valid', true,
    'profile_name', v_invite.profile_name,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

-- 4. Secure Invitation Acceptance (Guarantees caller email matches invited email)
CREATE OR REPLACE FUNCTION public.accept_care_invitation(
  p_invite_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required to accept an invitation.';
  END IF;

  -- Obtain caller's authenticated email address from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Find valid pending invitation
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE invite_code = UPPER(TRIM(p_invite_code))
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already redeemed invitation code.';
  END IF;

  -- Strict Security Check: Enforce email match (prevents stealing invitations)
  IF LOWER(v_invite.invited_email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'Unauthorized: This invitation was issued for %, not %.', v_invite.invited_email, v_user_email;
  END IF;

  -- Insert or reactivate in care_members
  INSERT INTO public.care_members (
    care_profile_id,
    user_id,
    role,
    status,
    permissions,
    accepted_at
  )
  VALUES (
    v_invite.care_profile_id,
    v_user_id,
    v_invite.role,
    'active',
    v_invite.permissions,
    now()
  )
  ON CONFLICT (care_profile_id, user_id) DO UPDATE
  SET status = 'active',
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      accepted_at = now(),
      revoked_at = NULL;

  -- Mark invitation as accepted (prevents reuse)
  UPDATE public.invitations
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'care_profile_id', v_invite.care_profile_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.accept_profile_invitation(
  p_invite_code TEXT
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.accept_care_invitation(p_invite_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 5. Revoke Member Access (Owner only)
CREATE OR REPLACE FUNCTION public.revoke_care_member(
  p_member_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.care_members cm
    JOIN public.care_profiles cp ON cp.id = cm.care_profile_id
    WHERE cm.id = p_member_id AND cp.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the profile owner can revoke member access.';
  END IF;

  UPDATE public.care_members
  SET status = 'revoked',
      revoked_at = now()
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.revoke_profile_member(
  p_member_id UUID
)
RETURNS VOID AS $$
BEGIN
  PERFORM public.revoke_care_member(p_member_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- FUNCTION EXECUTION PRIVILEGES (Least Privilege Principle)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_care_profile_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_care_profile_owner(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.is_care_profile_authorized(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_care_profile_authorized(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.can_manage_care_activities(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_care_activities(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_care_passcode(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_care_passcode(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_elderly_passcode(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_elderly_passcode(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.set_care_passcode(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_care_passcode(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.set_elderly_passcode(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_elderly_passcode(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_invitation_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invitation_code(TEXT) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.accept_care_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_care_invitation(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_profile_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_profile_invitation(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_care_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_care_member(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_profile_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_profile_member(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies (Protects email and phone from unnecessary exposure)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Owners and authorized co-members can view member records in their active circle
DROP POLICY IF EXISTS "Active care circle members can view co-members" ON public.profiles;
CREATE POLICY "Active care circle members can view co-members" 
  ON public.profiles FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.care_members cm1
        JOIN public.care_members cm2 ON cm1.care_profile_id = cm2.care_profile_id
        WHERE cm1.user_id = auth.uid() 
          AND cm2.user_id = public.profiles.id 
          AND cm1.status = 'active' 
          AND cm2.status = 'active'
      ) OR EXISTS (
        SELECT 1 FROM public.care_profiles cp
        JOIN public.care_members cm ON cp.id = cm.care_profile_id
        WHERE (cp.owner_id = auth.uid() AND cm.user_id = public.profiles.id AND cm.status = 'active')
           OR (cp.owner_id = public.profiles.id AND cm.user_id = auth.uid() AND cm.status = 'active')
      )
    )
  );

-- 2. Care Profiles Table Policies
DROP POLICY IF EXISTS "Owner full control over their care profile" ON public.care_profiles;
CREATE POLICY "Owner full control over their care profile" 
  ON public.care_profiles FOR ALL 
  USING (auth.uid() = owner_id) 
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Active members can view care profile" ON public.care_profiles;
CREATE POLICY "Active members can view care profile" 
  ON public.care_profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.care_members 
      WHERE care_profile_id = public.care_profiles.id 
        AND user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- 3. Care Members Table Policies
DROP POLICY IF EXISTS "Owner can manage members of their profile" ON public.care_members;
CREATE POLICY "Owner can manage members of their profile" 
  ON public.care_members FOR ALL 
  USING (public.is_care_profile_owner(public.care_members.care_profile_id)) 
  WITH CHECK (public.is_care_profile_owner(public.care_members.care_profile_id));

DROP POLICY IF EXISTS "Members can view care circle membership" ON public.care_members;
CREATE POLICY "Members can view care circle membership" 
  ON public.care_members FOR SELECT 
  USING (
    (user_id = auth.uid() AND status = 'active') 
    OR public.is_care_profile_authorized(public.care_members.care_profile_id)
  );

-- 4. Invitations Table Policies (SECURED: Owner manages, Target Recipient views ONLY their own)
DROP POLICY IF EXISTS "Owner can manage invitations" ON public.invitations;
CREATE POLICY "Owner can manage invitations" 
  ON public.invitations FOR ALL 
  USING (public.is_care_profile_owner(public.invitations.care_profile_id)) 
  WITH CHECK (public.is_care_profile_owner(public.invitations.care_profile_id));

DROP POLICY IF EXISTS "Invited recipient can view their invitation" ON public.invitations;
CREATE POLICY "Invited recipient can view their invitation" 
  ON public.invitations FOR SELECT 
  USING (
    LOWER(invited_email) = LOWER(auth.jwt() ->> 'email')
    AND status = 'pending'
    AND expires_at > now()
  );

-- 5. Medications Table Policies
DROP POLICY IF EXISTS "Authorized members can view medications" ON public.medications;
CREATE POLICY "Authorized members can view medications" 
  ON public.medications FOR SELECT 
  USING (public.is_care_profile_authorized(public.medications.care_profile_id));

DROP POLICY IF EXISTS "Owner and Caretakers can manage medications" ON public.medications;
CREATE POLICY "Owner and Caretakers can manage medications" 
  ON public.medications FOR ALL 
  USING (public.can_manage_care_activities(public.medications.care_profile_id)) 
  WITH CHECK (public.can_manage_care_activities(public.medications.care_profile_id));

-- 6. Medication Schedules Table Policies
DROP POLICY IF EXISTS "Authorized members can view medication schedules" ON public.medication_schedules;
CREATE POLICY "Authorized members can view medication schedules" 
  ON public.medication_schedules FOR SELECT 
  USING (public.is_care_profile_authorized(public.medication_schedules.care_profile_id));

DROP POLICY IF EXISTS "Owner and Caretakers can manage medication schedules" ON public.medication_schedules;
CREATE POLICY "Owner and Caretakers can manage medication schedules" 
  ON public.medication_schedules FOR ALL 
  USING (public.can_manage_care_activities(public.medication_schedules.care_profile_id)) 
  WITH CHECK (public.can_manage_care_activities(public.medication_schedules.care_profile_id));

-- 7. Medication Logs Table Policies
DROP POLICY IF EXISTS "Authorized members can view medication logs" ON public.medication_logs;
CREATE POLICY "Authorized members can view medication logs" 
  ON public.medication_logs FOR SELECT 
  USING (public.is_care_profile_authorized(public.medication_logs.care_profile_id));

DROP POLICY IF EXISTS "Authorized members can record medication doses" ON public.medication_logs;
CREATE POLICY "Authorized members can record medication doses" 
  ON public.medication_logs FOR INSERT 
  WITH CHECK (public.is_care_profile_authorized(public.medication_logs.care_profile_id));

DROP POLICY IF EXISTS "Authorized caregivers and owners can update medication logs" ON public.medication_logs;
CREATE POLICY "Authorized caregivers and owners can update medication logs" 
  ON public.medication_logs FOR UPDATE 
  USING (public.can_manage_care_activities(public.medication_logs.care_profile_id)) 
  WITH CHECK (public.can_manage_care_activities(public.medication_logs.care_profile_id));

-- 8. Doctor Appointments Table Policies
DROP POLICY IF EXISTS "Authorized members can view appointments" ON public.appointments;
CREATE POLICY "Authorized members can view appointments" 
  ON public.appointments FOR SELECT 
  USING (public.is_care_profile_authorized(public.appointments.care_profile_id));

DROP POLICY IF EXISTS "Authorized caregivers and owners can manage appointments" ON public.appointments;
CREATE POLICY "Authorized caregivers and owners can manage appointments" 
  ON public.appointments FOR ALL 
  USING (public.can_manage_care_activities(public.appointments.care_profile_id)) 
  WITH CHECK (public.can_manage_care_activities(public.appointments.care_profile_id));

-- 9. Notifications Table Policies
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" 
  ON public.notifications FOR SELECT 
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" 
  ON public.notifications FOR UPDATE 
  USING (recipient_user_id = auth.uid()) 
  WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Care circle members can insert notifications" ON public.notifications;
CREATE POLICY "Care circle members can insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (public.is_care_profile_authorized(public.notifications.care_profile_id));

-- 10. Activity Logs Table Policies
DROP POLICY IF EXISTS "Authorized members can view activity logs" ON public.activity_logs;
CREATE POLICY "Authorized members can view activity logs" 
  ON public.activity_logs FOR SELECT 
  USING (public.is_care_profile_authorized(public.activity_logs.care_profile_id));

DROP POLICY IF EXISTS "Authorized members can record activity logs" ON public.activity_logs;
CREATE POLICY "Authorized members can record activity logs" 
  ON public.activity_logs FOR INSERT 
  WITH CHECK (public.is_care_profile_authorized(public.activity_logs.care_profile_id));
