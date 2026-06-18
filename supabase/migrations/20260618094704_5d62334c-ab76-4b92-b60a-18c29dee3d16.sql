
DROP POLICY IF EXISTS "Admins manage badges" ON public.badges;
CREATE POLICY "Admins manage badges" ON public.badges
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "Admins manage challenges" ON public.challenges;
CREATE POLICY "Admins manage challenges" ON public.challenges
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "Users or admins delete posts" ON public.posts;
CREATE POLICY "Users or admins delete posts" ON public.posts
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
