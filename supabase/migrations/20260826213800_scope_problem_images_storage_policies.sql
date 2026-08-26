-- Stop any signed-in user from deleting or overwriting every problem figure on the site.
--
-- Why: both the INSERT and DELETE policies on `storage.objects` for the `problem_images` bucket test
-- only `bucket_id`, with no owner and no role predicate. The baseline migration's own comment says
-- "additional admin/manager checks are enforced in the API route handler" — but the publishable key
-- ships to the browser, so `supabase.storage.from('problem_images')` is reachable directly and no
-- route handler is on that path. Any student who has signed up could list the bucket and remove
-- every statement figure, permanently and with no audit trail; upload was the mirror image.
--
-- The `avatars` policies immediately above these in the baseline already show the intended shape.
--
-- Note the platform trigger `protect_objects_delete` on `storage.objects` does NOT mitigate this: it
-- blocks direct SQL/PostgREST deletes only, while the Storage API path (`storage.from(...).remove()`)
-- — which is the exploit — sets the GUC it checks and is gated purely by the policy below.
--
-- This is also the mechanism that made the admin problem DELETE destructive: that handler deletes
-- zero rows under its own RLS, then unconditionally deletes the images anyway.

drop policy if exists "Authenticated delete problem_images" on storage.objects;
create policy "Staff delete problem_images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'problem_images'
    and (
      public.is_manager()
      or exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
    )
  );

drop policy if exists "Authenticated upload problem_images" on storage.objects;
create policy "Staff upload problem_images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'problem_images'
    and (
      public.is_manager()
      or exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
    )
  );

-- Public read stays: statement figures are rendered on public problem pages.

-- Tighten what may be stored in both buckets while we are here. `image/svg+xml` is served from the
-- Supabase storage origin rather than the app origin so it cannot touch an app session, but there is
-- no reason to accept active content in an image bucket.
update storage.buckets
   set allowed_mime_types = array['image/png','image/jpeg','image/gif','image/webp']
 where id in ('problem_images','avatars');
