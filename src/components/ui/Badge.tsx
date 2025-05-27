import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
}

export function Badge({
  className,
  color,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        color ? `bg-${color}-100 text-${color}-800` : 'bg-gray-100 text-gray-800',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
} 