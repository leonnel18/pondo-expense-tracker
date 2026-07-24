import React from 'react';
import Button from './Button';

// `variant`: 'footer' (default, unchanged) keeps the existing title-top /
// children-body / optional footer-button-row layout for every existing
// caller. 'compact' (US-34) is an ADDITIONAL layout for short single-field
// forms: dismiss "X" top-left, centered title, primary action inline
// top-right — via a new `primaryAction={{ label, onClick, disabled }}`
// prop — instead of a bottom footer row. `footer` is ignored when
// variant="compact" (there is no bottom footer in that layout).
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant = 'footer',
  primaryAction,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const isCompact = variant === 'compact';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-neutral-800 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {isCompact ? (
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
                <button
                  type="button"
                  className="text-neutral-400 hover:text-neutral-500 focus:outline-none"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h3 className="text-lg leading-6 font-medium text-neutral-900 flex-1 text-center px-2 truncate" id="modal-headline">
                  {title}
                </h3>
                {primaryAction ? (
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {primaryAction.label}
                  </button>
                ) : (
                  // Keeps the header visually balanced (X — title — […]) when
                  // a compact modal has no primary action of its own.
                  <span className="w-5" aria-hidden="true" />
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4 mb-4">
                <h3 className="text-lg leading-6 font-medium text-neutral-900" id="modal-headline">
                  {title}
                </h3>
                <button
                  type="button"
                  className="text-neutral-400 hover:text-neutral-500 focus:outline-none"
                  onClick={onClose}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="mt-2">
              {children}
            </div>
          </div>
          {!isCompact && footer && (
            <div className="bg-neutral-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;