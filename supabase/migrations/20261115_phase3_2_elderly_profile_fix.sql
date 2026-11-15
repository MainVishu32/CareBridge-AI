-- ==============================================================================
-- CAREBRIDGE — PHASE 3.2: ELDERLY PROFILE PASSCODE & VIEW FIX
-- Project: CareBridge-AI (PostgreSQL / Supabase)
-- ==============================================================================

-- 1. Instead-of trigger on elderly_profiles view:
-- Routes any accidental INSERT or UPDATE from elderly_profiles view to the real care_profiles table
-- Prevents "cannot insert into column passcode_hash of view elderly_profiles"
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
