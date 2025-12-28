
-- Migration: Add RLS policy to allow Admins to manage all user profiles
-- This fixes the issue where giving credits or changing roles via Admin Board fails.

DO $$
BEGIN
    -- 1. Ensure Admins can SELECT all profiles (if not already allowed)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON public.profiles
        FOR SELECT TO authenticated
        USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
    END IF;

    -- 2. Ensure Admins can UPDATE all profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" ON public.profiles
        FOR UPDATE TO authenticated
        USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        )
        WITH CHECK (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        );
    END IF;
END
$$;
