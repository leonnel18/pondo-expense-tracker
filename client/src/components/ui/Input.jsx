import React from 'react';

const Input = ({ 
  label, 
  error, 
  required = false, 
  prefix, 
  className = '', 
  type = 'text',
  ...props 
}) => {
  const inputClasses = [
    'block w-full px-4 py-2.5 border rounded-md shadow-sm',
    error 
      ? 'border-negative focus:ring-negative focus:border-negative' 
      : 'border-neutral-200 focus:ring-brand-500 focus:border-brand-500',
    prefix ? 'pl-10' : '',
    'transition-colors'
  ].join(' ');
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label} {required && <span className="text-negative">*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-neutral-500 sm:text-sm">{prefix}</span>
          </div>
        )}
        <input
          type={type}
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-negative">{error}</p>
      )}
    </div>
  );
};

export default Input;