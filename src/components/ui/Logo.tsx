
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 1000 1000"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M813 522V136.5C661.729 183.099 597.886 215.866 502 280C419.17 221.621 370.705 189.041 190 137V522C313.475 566.83 382.038 601.164 502 696.5C604.794 611.442 668.991 569.691 813 522Z" fill="url(#paint0_linear_253_1024)" />
    <path fillRule="evenodd" clipRule="evenodd" d="M730.5 430V56C609.051 126.555 552.099 166.489 501 239.5L500 612C595.782 504.409 643.906 477.829 728.813 430.932L730.5 430Z" fill="url(#paint1_radial_253_1024)" />
    <path fillRule="evenodd" clipRule="evenodd" d="M275 429.5C405.041 501.341 445.124 541.178 500 612L501 239.5C434.715 156.93 383.246 117.956 274 56L275 429.5Z" fill="url(#paint2_radial_253_1024)" />
    <path fillRule="evenodd" clipRule="evenodd" d="M275 429.5C405.041 501.341 445.124 541.178 500 612L501 239.5C434.715 156.93 383.246 117.956 274 56L275 429.5Z" fill="url(#paint3_radial_253_1024)" fillOpacity="0.6" />
    <defs>
      <linearGradient id="paint0_linear_253_1024" x1="865.5" y1="94.5" x2="336" y2="593.5" gradientUnits="userSpaceOnUse">
        <stop offset="0.130625" stopColor="#FFD885" />
        <stop offset="0.39328" stopColor="#F66511" />
        <stop offset="0.853014" stopColor="#391512" />
      </linearGradient>
      <radialGradient id="paint1_radial_253_1024" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(500 632.5) rotate(-55.0703) scale(602.545 764.703)">
        <stop offset="0.0323755" stopColor="#230D0B" />
        <stop offset="0.543009" stopColor="#AC330C" />
        <stop offset="0.941245" stopColor="#FC780A" />
      </radialGradient>
      <radialGradient id="paint2_radial_253_1024" cx="0" cy="0" r="1" gradientTransform="matrix(-538.5 -390 506.926 -678.516 703.5 560.5)" gradientUnits="userSpaceOnUse">
        <stop offset="0.174777" stopColor="#1B1619" />
        <stop offset="0.410918" stopColor="#D24409" />
        <stop offset="0.922971" stopColor="#FFD17E" />
      </radialGradient>
      <radialGradient id="paint3_radial_253_1024" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(501 541.5) rotate(-178.831) scale(24.5051 415.345)">
        <stop stopColor="#36150F" />
        <stop offset="1" stopColor="#36150F" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);
