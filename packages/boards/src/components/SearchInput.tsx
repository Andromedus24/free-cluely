import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;
}

const SearchIcon: React.FC = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ClearIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SearchSuggestion: React.FC<{
  text: string;
  highlighted: string;
  onClick: () => void;
}> = ({ text, highlighted, onClick }) => {
  return (
    <motion.button
      whileHover={{ backgroundColor: '#F3F4F6' }}
      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
      onClick={onClick}
    >
      <span dangerouslySetInnerHTML={{
        __html: text.replace(
          new RegExp(`(${highlighted})`, 'gi'),
          '<mark class="bg-yellow-200">$1</mark>'
        )
      }} />
    </motion.button>
  );
};

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  autoFocus = false,
  debounceMs = 300
}) => {
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock search suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Handle debounced input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      if (value.length > 0) {
        // Mock suggestions - in practice, this would come from an API
        const mockSuggestions = [
          'Search in titles',
          'Search in descriptions',
          'Search by assignee',
          'Search by labels',
          'Search by status',
          'Search by priority',
          'Search by due date',
          'Search by custom fields'
        ].filter(s => s.toLowerCase().includes(value.toLowerCase()));
        setSuggestions(mockSuggestions);
      } else {
        setSuggestions([]);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // Handle auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to blur
      if (e.key === 'Escape' && focused) {
        inputRef.current?.blur();
        setFocused(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focused]);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const recentSearches = [
    'High priority cards',
    'Assigned to me',
    'Due this week',
    'Bug reports'
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className={`relative flex items-center border rounded-lg transition-all ${
        focused
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-300 hover:border-gray-400'
      }`}>
        <div className="pl-3 pr-2">
          <SearchIcon />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            // Delay blur to allow clicking on suggestions
            setTimeout(() => {
              setFocused(false);
              setShowSuggestions(false);
            }, 200);
          }}
          placeholder={placeholder}
          className="flex-1 py-2 px-2 outline-none bg-transparent"
        />

        {/* Clear Button */}
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="pr-3 pl-2 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            >
              <ClearIcon />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Search Shortcut */}
        {!value && !focused && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            ⌘K
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (value || suggestions.length > 0) && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            {/* Recent Searches */}
            {!value && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <SearchSuggestion
                    key={search}
                    text={search}
                    highlighted=""
                    onClick={() => handleSuggestionClick(search)}
                  />
                ))}
              </div>
            )}

            {/* Dynamic Suggestions */}
            {value && suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <SearchSuggestion
                    key={suggestion}
                    text={suggestion}
                    highlighted={value}
                    onClick={() => handleSuggestionClick(suggestion)}
                  />
                ))}
              </div>
            )}

            {/* Search Options */}
            <div className="border-t border-gray-200 p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                Search Options
              </div>
              <div className="space-y-1">
                <motion.button
                  whileHover={{ backgroundColor: '#F3F4F6' }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 flex items-center space-x-2"
                  onClick={() => {
                    onChange(`${value} status:done`);
                    setShowSuggestions(false);
                  }}
                >
                  <span>🎯</span>
                  <span>Add status filter</span>
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: '#F3F4F6' }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 flex items-center space-x-2"
                  onClick={() => {
                    onChange(`${value} priority:high`);
                    setShowSuggestions(false);
                  }}
                >
                  <span>⚡</span>
                  <span>Add priority filter</span>
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: '#F3F4F6' }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 flex items-center space-x-2"
                  onClick={() => {
                    onChange(`${value} assignee:me`);
                    setShowSuggestions(false);
                  }}
                >
                  <span>👤</span>
                  <span>Add assignee filter</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchInput;