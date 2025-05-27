import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Input } from './Input';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  label?: string;
  error?: string;
  isClearable?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  isClearable,
  className
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState(() => 
    value ? format(value, 'yyyy-MM-dd') : ''
  );

  React.useEffect(() => {
    setInputValue(value ? format(value, 'yyyy-MM-dd') : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (!newValue && isClearable) {
      onChange?.(null);
      return;
    }

    const date = new Date(newValue);
    if (!isNaN(date.getTime())) {
      onChange?.(date);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          type="date"
          value={inputValue}
          onChange={handleChange}
          error={error}
          className="pr-10"
        />
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
} 