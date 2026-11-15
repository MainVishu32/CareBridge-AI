-- ==============================================================================
-- PHASE 3 MIGRATION: CORE DATABASE ARCHITECTURE & HEALTHCARE DATA LAYER
-- CareBridge – Elderly Care & Medication Management Platform
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USER PROFILES TABLE (Linked 1:1 with auth.users)
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
-- 2. ELDERLY HEALTHCARE PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.elderly_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  passcode_hash TEXT, -- Stored as bcrypt / pgcrypto blowfish hash; NEVER plain text
  emergency_contact_name TEXT NOT NULL DEFAULT 'Primary Emergency Contact',
  emergency_contact_phone TEXT NOT NULL DEFAULT '+1 (555) 000-0000',
  emergency_contact_relation TEXT NOT NULL DEFAULT 'Emergency Proxy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_elderly_owner UNIQUE (owner_id)
);

-- ------------------------------------------------------------------------------
-- 3. PROFILE MEMBERS TABLE (Shared Healthcare Profile Permissions)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. PROFILE INVITATIONS TABLE (Secure 6-Character Invitation Codes)
-- ------------------------------------------------------------------------------
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
-- 5. MEDICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. MEDICATION SCHEDULES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('Morning', 'Afternoon', 'Evening', 'Bedtime')),
  schedule_time TIME NOT NULL, -- e.g. '08:00:00'
  days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sunday, 1=Monday... 6=Saturday
  dosage_quantity INT NOT NULL DEFAULT 1 CHECK (dosage_quantity > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. MEDICATION LOGS TABLE (Dose Events & Compliance Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('taken', 'pending', 'missed')),
  taken_at TIMESTAMPTZ,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8. DOCTOR APPOINTMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
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
-- 9. NOTIFICATIONS TABLE (In-App Alerts & Escalations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
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
-- 10. ACTIVITY LOGS TABLE (Comprehensive Healthcare Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
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
-- DATABASE INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_elderly_profiles_owner ON public.elderly_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_profile_members_elderly_user ON public.profile_members(elderly_profile_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_profile_invitations_code ON public.profile_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_profile_invitations_profile ON public.profile_invitations(elderly_profile_id, status);

CREATE INDEX IF NOT EXISTS idx_medications_profile ON public.medications(elderly_profile_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_med ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_profile ON public.medication_schedules(elderly_profile_id, time_of_day);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med_date ON public.medication_logs(medication_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_status ON public.medication_logs(elderly_profile_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_appointments_profile_date ON public.appointments(elderly_profile_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_profile_created ON public.activity_logs(elderly_profile_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- HELPER SECURITY FUNCTIONS FOR RLS POLICIES
-- ------------------------------------------------------------------------------

-- Check if authenticated user is the owner of the given elderly profile
CREATE OR REPLACE FUNCTION public.is_profile_owner(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.elderly_profiles
    WHERE id = p_profile_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if authenticated user is authorized (Owner OR Active Care Circle Member)
CREATE OR REPLACE FUNCTION public.is_profile_authorized(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.elderly_profiles
      WHERE id = p_profile_id AND owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profile_members
      WHERE elderly_profile_id = p_profile_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has caregiver management privileges
CREATE OR REPLACE FUNCTION public.can_manage_healthcare_activities(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.elderly_profiles
      WHERE id = p_profile_id AND owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profile_members
      WHERE elderly_profile_id = p_profile_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role = 'caretaker'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_elderly_profiles_updated_at ON public.elderly_profiles;
CREATE TRIGGER set_elderly_profiles_updated_at
  BEFORE UPDATE ON public.elderly_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_medications_updated_at ON public.medications;
CREATE TRIGGER set_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elderly_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Members in same care circle can view co-member names" ON public.profiles;
CREATE POLICY "Members in same care circle can view co-member names"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_members pm1
      JOIN public.profile_members pm2 ON pm1.elderly_profile_id = pm2.elderly_profile_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = public.profiles.id AND pm1.status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM public.elderly_profiles ep
      JOIN public.profile_members pm ON ep.id = pm.elderly_profile_id
      WHERE (ep.owner_id = auth.uid() AND pm.user_id = public.profiles.id)
         OR (ep.owner_id = public.profiles.id AND pm.user_id = auth.uid() AND pm.status = 'active')
    )
  );

-- 2. Elderly Profiles Table RLS
DROP POLICY IF EXISTS "Owner full control over their elderly profile" ON public.elderly_profiles;
CREATE POLICY "Owner full control over their elderly profile"
  ON public.elderly_profiles FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Active members can view elderly profile" ON public.elderly_profiles;
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

-- 3. Profile Members Table RLS
DROP POLICY IF EXISTS "Owner can manage members of their profile" ON public.profile_members;
CREATE POLICY "Owner can manage members of their profile"
  ON public.profile_members FOR ALL
  USING (public.is_profile_owner(public.profile_members.elderly_profile_id))
  WITH CHECK (public.is_profile_owner(public.profile_members.elderly_profile_id));

DROP POLICY IF EXISTS "Members can view care circle membership" ON public.profile_members;
CREATE POLICY "Members can view care circle membership"
  ON public.profile_members FOR SELECT
  USING (
    (user_id = auth.uid() AND status = 'active')
    OR public.is_profile_authorized(public.profile_members.elderly_profile_id)
  );

-- 4. Profile Invitations Table RLS
DROP POLICY IF EXISTS "Owner can manage invitations" ON public.profile_invitations;
CREATE POLICY "Owner can manage invitations"
  ON public.profile_invitations FOR ALL
  USING (public.is_profile_owner(public.profile_invitations.elderly_profile_id))
  WITH CHECK (public.is_profile_owner(public.profile_invitations.elderly_profile_id));

DROP POLICY IF EXISTS "Authenticated users can verify invite codes" ON public.profile_invitations;
CREATE POLICY "Authenticated users can verify invite codes"
  ON public.profile_invitations FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'pending');

-- 5. Medications Table RLS
DROP POLICY IF EXISTS "Authorized members can view medications" ON public.medications;
CREATE POLICY "Authorized members can view medications"
  ON public.medications FOR SELECT
  USING (public.is_profile_authorized(public.medications.elderly_profile_id));

DROP POLICY IF EXISTS "Owner and Caretakers can manage medications" ON public.medications;
CREATE POLICY "Owner and Caretakers can manage medications"
  ON public.medications FOR ALL
  USING (public.can_manage_healthcare_activities(public.medications.elderly_profile_id))
  WITH CHECK (public.can_manage_healthcare_activities(public.medications.elderly_profile_id));

-- 6. Medication Schedules Table RLS
DROP POLICY IF EXISTS "Authorized members can view medication schedules" ON public.medication_schedules;
CREATE POLICY "Authorized members can view medication schedules"
  ON public.medication_schedules FOR SELECT
  USING (public.is_profile_authorized(public.medication_schedules.elderly_profile_id));

DROP POLICY IF EXISTS "Owner and Caretakers can manage medication schedules" ON public.medication_schedules;
CREATE POLICY "Owner and Caretakers can manage medication schedules"
  ON public.medication_schedules FOR ALL
  USING (public.can_manage_healthcare_activities(public.medication_schedules.elderly_profile_id))
  WITH CHECK (public.can_manage_healthcare_activities(public.medication_schedules.elderly_profile_id));

-- 7. Medication Logs Table RLS
DROP POLICY IF EXISTS "Authorized members can view medication logs" ON public.medication_logs;
CREATE POLICY "Authorized members can view medication logs"
  ON public.medication_logs FOR SELECT
  USING (public.is_profile_authorized(public.medication_logs.elderly_profile_id));

DROP POLICY IF EXISTS "Authorized members can record medication doses" ON public.medication_logs;
CREATE POLICY "Authorized members can record medication doses"
  ON public.medication_logs FOR INSERT
  WITH CHECK (public.is_profile_authorized(public.medication_logs.elderly_profile_id));

DROP POLICY IF EXISTS "Authorized caregivers and owners can update medication logs" ON public.medication_logs;
CREATE POLICY "Authorized caregivers and owners can update medication logs"
  ON public.medication_logs FOR UPDATE
  USING (public.can_manage_healthcare_activities(public.medication_logs.elderly_profile_id))
  WITH CHECK (public.can_manage_healthcare_activities(public.medication_logs.elderly_profile_id));

-- 8. Doctor Appointments Table RLS
DROP POLICY IF EXISTS "Authorized members can view appointments" ON public.appointments;
CREATE POLICY "Authorized members can view appointments"
  ON public.appointments FOR SELECT
  USING (public.is_profile_authorized(public.appointments.elderly_profile_id));

DROP POLICY IF EXISTS "Authorized caregivers and owners can manage appointments" ON public.appointments;
CREATE POLICY "Authorized caregivers and owners can manage appointments"
  ON public.appointments FOR ALL
  USING (public.can_manage_healthcare_activities(public.appointments.elderly_profile_id))
  WITH CHECK (public.can_manage_healthcare_activities(public.appointments.elderly_profile_id));

-- 9. Notifications Table RLS
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
  WITH CHECK (public.is_profile_authorized(public.notifications.elderly_profile_id));

-- 10. Activity Logs Table RLS
DROP POLICY IF EXISTS "Authorized members can view activity logs" ON public.activity_logs;
CREATE POLICY "Authorized members can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_profile_authorized(public.activity_logs.elderly_profile_id));

DROP POLICY IF EXISTS "Authorized members can record activity logs" ON public.activity_logs;
CREATE POLICY "Authorized members can record activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (public.is_profile_authorized(public.activity_logs.elderly_profile_id));
