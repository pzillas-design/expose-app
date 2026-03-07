-- Allow authenticated users to access storage paths rooted by their email.
-- Keeps compatibility with existing user-id-rooted paths via existing policies.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can access own email folder'
  ) THEN
    CREATE POLICY "Users can access own email folder"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (
        bucket_id = 'user-content'
        AND lower((storage.foldername(name))[1]) = lower(
          COALESCE(
            (SELECT p.email FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1),
            (SELECT auth.jwt() ->> 'email'),
            ''
          )
        )
      )
      WITH CHECK (
        bucket_id = 'user-content'
        AND lower((storage.foldername(name))[1]) = lower(
          COALESCE(
            (SELECT p.email FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1),
            (SELECT auth.jwt() ->> 'email'),
            ''
          )
        )
      );
  END IF;
END $$;
