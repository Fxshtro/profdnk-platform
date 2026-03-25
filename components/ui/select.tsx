import { cn } from '@/lib/utils';
import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroupProps {
  label?: string;
  children: React.ReactNode;
}

export const SelectGroup: React.FC<SelectGroupProps> = ({ label, children }) => {
  return (
    <>
      {label && (
        <optgroup label={label}>
          {children}
        </optgroup>
      )}
      {!label && children}
    </>
  );
};

export interface SelectItemProps {
  value: string;
  label: string;
  disabled?: boolean;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, label, disabled }) => {
  return (
    <option value={value} disabled={disabled}>
      {label}
    </option>
  );
};
