-- The client subscribes to postgres_changes on public.profiles for live credit
-- updates (useAuth.ts), but the supabase_realtime publication contained no
-- tables at all — the subscription never fired and the credits display stayed
-- stale until a full reload. Users kept seeing an old balance (e.g. 7,50 €)
-- while the server had already deducted generation costs.
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
