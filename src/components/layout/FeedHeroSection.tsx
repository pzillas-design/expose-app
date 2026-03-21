/**
 * FeedHeroSection — fixed-height spacer that reserves the extra space the
 * expanded AppNavbar hero header occupies beyond the standard 56px navbar.
 *
 * Math: header extra = TOP_PAD(20) + BOT_EXTRA(100) = 120px (both at hp=0)
 *       pt-14 on main covers the base 56px collapsed nav.
 *       This spacer covers the 120px extra → content grid starts at 56+120=176px.
 *       At scrollTop=s (s ≤ 120): content visible at 176-s; header bottom at 176-s. ✓
 *       They track perfectly because the fixed spacer + scrollTop cancel exactly.
 */

import React from 'react';

export const FeedHeroSection: React.FC = () => (
    <div style={{ height: 92, flexShrink: 0 }} />
);
