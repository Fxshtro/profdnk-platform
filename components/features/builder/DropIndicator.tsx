'use client';

import { cn } from '@/lib/utils';

interface DropIndicatorProps {
  position: 'top' | 'bottom';
}

export function DropIndicator({ position }: DropIndicatorProps) {
  return (
    <div
      className={cn(
        'absolute left-0 right-0 h-1 bg-primary rounded-full z-20 transition-all',
        position === 'top' ? '-top-2' : '-bottom-2'
      )}
    />
  );
}
