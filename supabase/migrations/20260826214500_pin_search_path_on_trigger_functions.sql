-- Pin `search_path` on the two remaining trigger functions.
--
-- Why now: `update_updated_at_column()` was attached to nothing until the previous migration, so its
-- mutable search_path was inert. It now fires on seven tables, including `users`, `managers` and
-- `admins`, which makes it worth the same hardening every other function in this schema already has.
-- `set_news_posts_updated_at()` has been live on `news_posts` since the baseline.
--
-- Neither is SECURITY DEFINER, so this is defence in depth rather than a privilege fix — but a
-- trigger function that resolves unqualified names against a caller-controlled path is a footgun,
-- and both bodies are single-statement and fully qualifiable.
--
-- Note on the remaining advisor warnings, deliberately NOT changed:
--   * `is_admin()` / `is_manager()` stay executable by `anon`. RLS policy expressions are evaluated
--     as the calling role, so revoking EXECUTE would break every policy that calls them. They return
--     a boolean about the caller and an anonymous caller always gets `false`, so they leak nothing.
--   * `update_comment_score()` stays executable. It is a trigger function; calling it directly over
--     RPC raises "trigger functions can only be called as triggers" before any statement runs.
--   * `is_email_registered` / `is_username_taken` are documented signup-UX affordances, and
--     `users_select_all_public` already exposes `email` to `anon`, so they add no capability.

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_news_posts_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
