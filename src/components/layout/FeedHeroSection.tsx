/**
 * FeedHeroSection — spacer that reserves the extra height the expanded hero
 * navbar occupies beyond the collapsed 56px navbar (covered by pt-14 on main).
 *
 * Height must equal how much the nav shrinks on scroll so content and header
 * track together as you scroll: mobile nav 88→56 (=32px), desktop 148→56 (=92px).
 * A fixed 92px left a big gap on mobile where the nav only shrinks by 32px.
 */

import React from 'react';

export const FeedHeroSection: React.FC = () => (
    <div className="h-8 sm:h-[92px] shrink-0" />
);
