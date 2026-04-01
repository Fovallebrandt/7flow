import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

export default function LoadingSpinner({ size = 'md', light = false }: LoadingSpinnerProps) {
  const dimensions = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  };

  return (
    <div
      className={`${dimensions[size]} ${light ? 'border-[var(--accent-foreground)]' : 'border-[var(--accent)]'} border-t-transparent rounded-full animate-spin`}
    />
  );
}
