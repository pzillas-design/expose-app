import React from 'react';

export const TwoDotsVertical: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="8.1" r="1.8" />
        <circle cx="12" cy="15.9" r="1.8" />
    </svg>
);

export const InfoFilled: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10.7 17V11H13.3V17H10.7ZM10.7 9V7H13.3V9H10.7Z" />
    </svg>
);
