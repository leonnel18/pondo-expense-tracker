import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { getTags, createTag } from '../../lib/api';

const MAX_TAGS = 5;
const DEBOUNCE_MS = 250;

/**
 * Controlled tag input with autocomplete and create-on-enter.
 *
 * Props:
 *   value     — array of {id, name} currently selected tags
 *   onChange  — callback(newArray) called whenever the selection changes
 *
 * Removing a chip calls onChange with the tag removed from the array —
 * it does NOT call deleteTag (the tag still exists for other entries).
 */
const TagInput = ({ value = [], onChange }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const atCap = value.length >= MAX_TAGS;

  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getTags(query.trim());
        setSuggestions(data.tags || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag) => {
    // Prevent duplicates
    if (value.some((t) => t.id === tag.id)) return;
    if (value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTag = (tagId) => {
    onChange(value.filter((t) => t.id !== tagId));
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Strip commas — they act as a delimiter
    const cleaned = val.replace(/,/g, '');
    setInput(cleaned);
    if (cleaned.trim()) {
      fetchSuggestions(cleaned);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (atCap) return;

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const name = input.trim();
      if (!name) return;

      // Check if an exact match exists in suggestions (case-insensitive)
      const exactMatch = suggestions.find(
        (s) => s.name.toLowerCase() === name.toLowerCase()
      );

      if (exactMatch) {
        addTag(exactMatch);
      } else {
        // Create new tag — server is idempotent (returns existing if name exists)
        handleCreateTag(name);
      }
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      // Backspace on empty input removes last chip
      removeTag(value[value.length - 1].id);
    }
  };

  const handleCreateTag = async (name) => {
    setCreating(true);
    try {
      const data = await createTag(name);
      const tag = data.tag;
      addTag(tag);
    } catch (err) {
      // If creation fails, leave input as-is so user can retry
      console.error('Failed to create tag:', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSuggestionClick = (tag) => {
    addTag(tag);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
      <div
        className="min-h-[42px] w-full rounded-md border border-gray-300 shadow-sm focus-within:border-brand-500 focus-within:ring-brand-500 p-1.5 flex flex-wrap items-center gap-1.5"
        onClick={() => !atCap && inputRef.current?.focus()}
      >
        {/* Chips */}
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200"
          >
            <TagIcon className="h-3 w-3" />
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag.id);
              }}
              className="inline-flex items-center justify-center rounded-full hover:bg-brand-100 text-brand-500 hover:text-brand-700 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Text input */}
        {!atCap && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => input.trim() && setShowSuggestions(true)}
            placeholder={value.length === 0 ? 'Add tags (type and press Enter)' : ''}
            disabled={creating}
            className="flex-1 min-w-[120px] border-0 outline-none focus:ring-0 text-sm p-1 bg-transparent"
          />
        )}

        {/* Creating indicator */}
        {creating && (
          <span className="text-xs text-gray-400">Creating...</span>
        )}

        {/* Max tags note */}
        {atCap && (
          <span className="text-xs text-gray-400 italic">Max 5 tags</span>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && (input.trim() || loadingSuggestions) && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {loadingSuggestions && (
            <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
          )}
          {!loadingSuggestions && suggestions.length === 0 && input.trim() && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No match — press Enter to create "{input.trim()}"
            </div>
          )}
          {!loadingSuggestions && suggestions.length > 0 && (
            <ul className="py-1">
              {suggestions.map((tag) => {
                const isSelected = value.some((t) => t.id === tag.id);
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(tag)}
                      disabled={isSelected}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                      <TagIcon className="h-3 w-3 text-gray-400" />
                      {tag.name}
                      {isSelected && (
                        <span className="ml-auto text-xs text-gray-400">added</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TagInput;