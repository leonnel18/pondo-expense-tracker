import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../../contexts/PrivacyContext';

const PrivacyToggle = () => {
  const { masked, toggleMasked } = usePrivacy();

  return (
    <button
      onClick={toggleMasked}
      aria-label={masked ? 'Show amounts' : 'Hide amounts'}
      className="w-11 h-11 flex items-center justify-center text-neutral-600 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md transition-colors"
    >
      {masked ? (
        <EyeOff className="w-5 h-5" />
      ) : (
        <Eye className="w-5 h-5" />
      )}
    </button>
  );
};

export default PrivacyToggle;