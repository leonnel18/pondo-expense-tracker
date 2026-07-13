import React from 'react';

const Select = ({ 
  label, 
  error, 
  required = false, 
  children, 
  className = '', 
  ...props 
}) => {
  const selectClasses = [
    'block w-full px-4 py-2.5 border rounded-md shadow-sm bg-white',
    error 
      ? 'border-negative focus:ring-negative focus:border-negative' 
      : 'border-neutral-200 focus:ring-brand-500 focus:border-brand-500',
    'transition-colors'
  ].join(' ');
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label} {required && <span className="text-negative">*</span>}
        </label>
      )}
      <select
        className={selectClasses}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-negative">{error}</p>
      )}
    </div>
  );
};

export default Select;