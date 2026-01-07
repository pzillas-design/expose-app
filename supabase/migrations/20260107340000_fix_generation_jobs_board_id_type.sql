-- Migration: Fix generation_jobs board_id type
-- Change board_id from UUID to TEXT to match boards table

ALTER TABLE public.generation_jobs 
ALTER COLUMN board_id TYPE TEXT USING board_id::text;
