
-- Remove privilege escalation: badges/challenges must be server-awarded
DROP POLICY IF EXISTS "Users can claim own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users update own challenge joins" ON public.user_challenges;

-- Harden has_role: ignore caller-supplied id to prevent enumeration.
-- Always check against auth.uid(); all existing policy usages pass auth.uid().
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND user_id = _user_id
      AND role = _role
  )
$$;
