import * as React from 'react';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  avatar?: React.ReactNode;
  title: string;
  description: string;
  time: string;
}

function TimelineItem({
  avatar,
  title,
  description,
  time
}: TimelineItemProps) {
  return (
    <div className="flex gap-4">
      {avatar && (
        <div className="flex-shrink-0">
          {avatar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {title}
          </p>
          <p className="text-sm text-gray-500">
            {time}
          </p>
        </div>
        <p className="text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

function Timeline({
  children,
  className
}: TimelineProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {children}
    </div>
  );
}

Timeline.Item = TimelineItem;

export { Timeline }; 