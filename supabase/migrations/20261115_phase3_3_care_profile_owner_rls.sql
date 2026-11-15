-- Keep care profile writes tied to the caller's Supabase Auth identity.
-- A cached application user or passcode-only login cannot satisfy auth.uid().
DROP POLICY IF EXISTS "Owner full control over their care profile" ON public.care_profiles;
DROP POLICY IF EXISTS "Care profile owner can insert own profile" ON public.care_profiles;
DROP POLICY IF EXISTS "Care profile owner can select own profile" ON public.care_profiles;
DROP POLICY IF EXISTS "Care profile owner can update own profile" ON public.care_profiles;

CREATE POLICY "Care profile owner can insert own profile"
  ON public.care_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Care profile owner can select own profile"
  ON public.care_profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Care profile owner can update own profile"
  ON public.care_profiles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Authorized active members retain the existing read-only access policy.
