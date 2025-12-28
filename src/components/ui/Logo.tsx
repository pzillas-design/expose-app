
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <img
    src="/logo.png"
    alt="Exposé"
    className={`object-contain ${className}`}
  />
);
