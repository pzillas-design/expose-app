-- Custom presets of other users were visible to everyone via "Anyone can view presets".
-- System presets stay public (also for anon landing pages); custom presets only for their owner.
DROP POLICY "Anyone can view presets" ON public.global_presets;
CREATE POLICY "Users see system presets and own custom presets"
    ON public.global_presets FOR SELECT
    USING (COALESCE(is_custom, false) = false OR auth.uid() = user_id);
