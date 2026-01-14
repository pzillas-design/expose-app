-- Update default credits for new profiles to 20.00 EUR
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 20.0;
