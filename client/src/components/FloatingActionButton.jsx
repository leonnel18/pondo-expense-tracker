import { Plus } from 'lucide-react';
import { useAddEntryModal } from '../contexts/AddEntryModalContext';

const FloatingActionButton = () => {
  const { openAddEntryModal } = useAddEntryModal();

  return (
    <button
      onClick={() => openAddEntryModal()}
      aria-label="Add entry"
      className="md:hidden fixed right-4 z-50 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-colors"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};

export default FloatingActionButton;