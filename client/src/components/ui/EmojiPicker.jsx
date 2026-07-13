import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

const EmojiPicker = ({ selectedEmoji, onEmojiSelect, label = "Select Emoji" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Common emojis organized by category
  const commonEmojis = [
    // Food & Dining
    '🍎', '🍕', '🍔', '🍟', '🍗', '🍜', '🍝', '🍣', '🍱', '🍛',
    // Transport
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '✈️',
    // Shopping
    '👕', '👖', '👗', '👠', '👜', '-shopping', '🎁', '💎', '📱', '💻',
    // Housing
    '🏠', '🏢', '🏣', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭',
    // Entertainment
    '🎮', '🎬', '🎭', '🎨', '🎪', '🎫', '🎭', '🎯', '🎲', '🎰',
    // Health
    '💊', '💉', '🩹', '🌡', '🩺', '🦷', '🦵', '🦰', '🧠', '💪',
    // Education
    '📚', '📖', '🎓', '✏️', '📎', '📏', '🧠', '🔬', '🔭', '🧮',
    // Insurance
    '📋', '🔒', '🔐', '✅', '🛡', '📌', '📎', '📂', '📁', '📋',
    // Income
    '💼', '💰', '💵', '💳', '🏦', '🏧', '💱', '💎', '🏆', '🎯',
    // Other
    '❓', '📌', '🔧', '⚙️', '🧰', '📦', '🛒', '🧾', '📝', '📅'
  ];

  // Filter emojis based on search term
  const filteredEmojis = commonEmojis.filter(emoji => 
    emoji.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji);
  };

  const handleClear = () => {
    onEmojiSelect('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search emojis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Selected: {selectedEmoji || 'None'}
        </span>
        {selectedEmoji && (
          <button
            onClick={handleClear}
            className="text-sm text-red-600 hover:text-red-800 flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-8 gap-2 p-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleEmojiSelect(emoji)}
            className={`p-2 text-2xl rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
              selectedEmoji === emoji ? 'bg-brand-100 ring-2 ring-brand-500' : ''
            }`}
            aria-label={`Select ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;