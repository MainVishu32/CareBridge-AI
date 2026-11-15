-- ==============================================================================
-- CAREBRIDGE — PHASE 4: SECURE CARE CIRCLE INVITATIONS AND MEMBERS
-- Uses the existing care_profiles, care_members, and invitations tables.
-- ==============================================================================

-- Invalidate pending codes created before Phase 4's high-entropy format.
UPDATE public.invitations
SET status = 'revoked'
WHERE status = 'pending'
  AND invite_code !~ '^CARE-[A-F0-9]{32}$';

CREATE OR REPLACE FUNCTION public.create_profile_invitation(
  p_care_profile_id UUID,
  p_invited_email TEXT,
  p_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_email TEXT;
  v_invitation public.invitations%ROWTYPE;
  v_permissions JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  IF NOT public.is_care_profile_owner(p_care_profile_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only the profile owner can invite members.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.care_profiles cp
    JOIN auth.users u ON u.id = cp.owner_id
    WHERE cp.id = p_care_profile_id
      AND LOWER(u.email) = LOWER(TRIM(COALESCE(p_invited_email, '')))
  ) THEN
    RAISE EXCEPTION 'The profile owner cannot be invited as a care circle member.';
  END IF;

  v_email := LOWER(TRIM(COALESCE(p_invited_email, '')));
  IF v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;

  IF p_role NOT IN ('caretaker', 'family_member') THEN
    RAISE EXCEPTION 'Invalid care circle role.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_care_profile_id::TEXT || ':' || v_email, 0)
  );

  UPDATE public.invitations
  SET status = 'expired'
  WHERE care_profile_id = p_care_profile_id
    AND LOWER(invited_email) = v_email
    AND status = 'pending'
    AND expires_at <= now();

  IF EXISTS (
    SELECT 1
    FROM public.invitations
    WHERE care_profile_id = p_care_profile_id
      AND LOWER(invited_email) = v_email
      AND status = 'pending'
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email address.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.care_members cm
    JOIN auth.users u ON u.id = cm.user_id
    WHERE cm.care_profile_id = p_care_profile_id
      AND LOWER(u.email) = v_email
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'This person is already an active care circle member.';
  END IF;

  v_permissions := CASE p_role
    WHEN 'caretaker' THEN '["view_health","manage_activities","view_reports","log_notes"]'::JSONB
    ELSE '["view_health","view_reports","emergency_contact"]'::JSONB
  END;

  INSERT INTO public.invitations (
    care_profile_id,
    invited_by,
    invited_email,
    role,
    invite_code,
    permissions,
    expires_at
  )
  VALUES (
    p_care_profile_id,
    auth.uid(),
    v_email,
    p_role,
    'CARE-' || UPPER(REPLACE(gen_random_uuid()::TEXT, '-', '')),
    v_permissions,
    now() + INTERVAL '7 days'
  )
  RETURNING * INTO v_invitation;

  RETURN jsonb_build_object(
    'id', v_invitation.id,
    'elderly_profile_id', v_invitation.care_profile_id,
    'invited_by', v_invitation.invited_by,
    'invited_email', v_invitation.invited_email,
    'role', v_invitation.role,
    'invite_code', v_invitation.invite_code,
    'status', v_invitation.status,
    'permissions', v_invitation.permissions,
    'created_at', v_invitation.created_at,
    'expires_at', v_invitation.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.verify_profile_invitation(
  p_invite_code TEXT,
  p_invited_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_role TEXT;
  v_code TEXT;
  v_email TEXT;
BEGIN
  v_code := UPPER(TRIM(COALESCE(p_invite_code, '')));
  v_email := LOWER(TRIM(COALESCE(p_invited_email, '')));

  IF v_code !~ '^CARE-[A-F0-9]{32}$' THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT role INTO v_role
  FROM public.invitations
  WHERE invite_code = v_code
    AND LOWER(invited_email) = v_email
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'role', v_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.accept_care_invitation(
  p_invite_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_invite public.invitations%ROWTYPE;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required to accept an invitation.';
  END IF;

  SELECT LOWER(email) INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  SELECT * INTO v_invite
  FROM public.invitations
  WHERE invite_code = UPPER(TRIM(COALESCE(p_invite_code, '')))
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND OR LOWER(v_invite.invited_email) IS DISTINCT FROM v_user_email THEN
    RAISE EXCEPTION 'Invalid, expired, or unauthorized invitation.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.care_profiles WHERE owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'A profile owner cannot redeem a care circle invitation.';
  END IF;

  INSERT INTO public.care_members (
    care_profile_id,
    user_id,
    role,
    status,
    permissions,
    invited_at,
    accepted_at,
    revoked_at
  )
  VALUES (
    v_invite.care_profile_id,
    v_user_id,
    v_invite.role,
    'active',
    v_invite.permissions,
    v_invite.created_at,
    now(),
    NULL
  )
  ON CONFLICT (care_profile_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      permissions = EXCLUDED.permissions,
      accepted_at = now(),
      revoked_at = NULL;

  UPDATE public.invitations
  SET status = 'accepted'
  WHERE id = v_invite.id;

  UPDATE public.profiles
  SET role = v_invite.role,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'elderly_profile_id', v_invite.care_profile_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.revoke_care_member(
  p_member_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.care_members cm
    JOIN public.care_profiles cp ON cp.id = cm.care_profile_id
    WHERE cm.id = p_member_id
      AND cp.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the profile owner can revoke member access.';
  END IF;

  UPDATE public.care_members
  SET status = 'revoked',
      revoked_at = COALESCE(revoked_at, now())
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

REVOKE ALL ON FUNCTION public.create_profile_invitation(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_profile_invitation(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_profile_invitation(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_profile_invitation(TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.accept_care_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_care_invitation(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_profile_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_profile_invitation(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_invitation_code(TEXT) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.revoke_care_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_care_member(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_profile_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_profile_member(UUID) TO authenticated;

DROP POLICY IF EXISTS "Invited recipient can view their invitation" ON public.invitations;
DROP POLICY IF EXISTS "Owner can manage invitations" ON public.invitations;
CREATE POLICY "Owners can view invitations"
  ON public.invitations FOR SELECT
  USING (public.is_care_profile_owner(care_profile_id));

DROP POLICY IF EXISTS "Owner can manage members of their profile" ON public.care_members;
CREATE POLICY "Owners can view members of their profile"
  ON public.care_members FOR SELECT
  USING (public.is_care_profile_owner(care_profile_id));

DROP POLICY IF EXISTS "Members can view care circle membership" ON public.care_members;
CREATE POLICY "Active members can view active care circle membership"
  ON public.care_members FOR SELECT
  USING (
    status = 'active'
    AND public.is_care_profile_authorized(care_profile_id)
  );

CREATE POLICY "Users can view their own membership status"
  ON public.care_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Active care circle members can view co-members" ON public.profiles;
CREATE POLICY "Care circle users can view authorized member profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.care_profiles cp
        JOIN public.care_members cm ON cm.care_profile_id = cp.id
        WHERE cp.owner_id = auth.uid()
          AND cm.user_id = public.profiles.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.care_members mine
        JOIN public.care_members other
          ON other.care_profile_id = mine.care_profile_id
        WHERE mine.user_id = auth.uid()
          AND mine.status = 'active'
          AND other.user_id = public.profiles.id
          AND other.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.care_profiles cp
        JOIN public.care_members cm ON cm.care_profile_id = cp.id
        WHERE cp.owner_id = public.profiles.id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
    )
  );

REVOKE ALL ON TABLE public.care_members, public.invitations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.care_members, public.invitations
  FROM authenticated;
GRANT SELECT ON TABLE public.care_members, public.invitations TO authenticated;

REVOKE ALL ON TABLE public.profile_members, public.profile_invitations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profile_members, public.profile_invitations
  FROM authenticated;
GRANT SELECT ON TABLE public.profile_members, public.profile_invitations TO authenticated;

DROP POLICY IF EXISTS "Authorized members can record medication doses" ON public.medication_logs;
CREATE POLICY "Owners and caretakers can record medication doses"
  ON public.medication_logs FOR INSERT
  WITH CHECK (public.can_manage_care_activities(care_profile_id));

DROP POLICY IF EXISTS "Authorized members can record activity logs" ON public.activity_logs;
CREATE POLICY "Owners and caretakers can record activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (public.can_manage_care_activities(care_profile_id));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'care_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_members;
  END IF;
END;
$$;
