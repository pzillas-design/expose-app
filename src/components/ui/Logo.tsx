
import React from 'react';

export const Logo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = "", style }) => (
  <img
    src="/logo.png"
    alt="Exposé"
    className={`object-contain ${className}`}
    style={style}
  />
);
