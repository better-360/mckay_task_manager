import * as React from 'react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  options: Option[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  isMulti?: boolean;
  isClearable?: boolean;
}

export function Select({
  className,
  label,
  error,
  options,
  value,
  onChange,
  isMulti,
  isClearable,
  ...props
}: SelectProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMulti) {
      const values = Array.from(event.target.selectedOptions).map(option => option.value);
      onChange?.(values);
    } else {
      onChange?.(event.target.value);
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        value={value}
        onChange={handleChange}
        multiple={isMulti}
        {...props}
      >
        {isClearable && !isMulti && (
          <option value="">Select...</option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 