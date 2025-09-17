import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, Clock, Filter } from 'lucide-react';
import { TimelineSearchProps } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'suggested';
  count?: number;
}

export const TimelineSearch: React.FC<TimelineSearchProps> = ({
  query,
  onQueryChange,
  onSearch,
  placeholder = 'Search timeline...',
  suggestions = [],
  showFilters = true,
  compact = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timeline-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  // Save recent searches to localStorage
  const saveToRecentSearches = useCallback((searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 10);
    setRecentSearches(updated);
    try {
      localStorage.setItem('timeline-recent-searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent searches:', error);
    }
  }, [recentSearches]);

  // Filter suggestions based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered: SearchSuggestion[] = [];

    // Add recent searches that match
    recentSearches
      .filter(search => search.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .forEach(search => {
        filtered.push({ text: search, type: 'recent' });
      });

    // Add provided suggestions that match
    suggestions
      .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .forEach(suggestion => {
        if (!filtered.find(f => f.text === suggestion)) {
          filtered.push({ text: suggestion, type: 'suggested' });
        }
      });

    setFilteredSuggestions(filtered);
    setSelectedIndex(-1);
  }, [query, recentSearches, suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          handleSuggestionClick(filteredSuggestions[selectedIndex].text);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, selectedIndex, filteredSuggestions]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      saveToRecentSearches(query.trim());
      onSearch?.(query.trim());
      setShowSuggestions(false);
    }
  }, [query, onSearch, saveToRecentSearches]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    onQueryChange(suggestion);
    saveToRecentSearches(suggestion);
    onSearch?.(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [onQueryChange, onSearch, saveToRecentSearches]);

  // Clear search
  const clearSearch = useCallback(() => {
    onQueryChange('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, [onQueryChange]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus management
  useEffect(() => {
    if (showSuggestions && selectedIndex >= 0) {
      const element = document.getElementById(`suggestion-${selectedIndex}`);
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, showSuggestions]);

  const getSuggestionsByType = useCallback((type: SearchSuggestion['type']) => {
    return filteredSuggestions.filter(s => s.type === type);
  }, [filteredSuggestions]);

  const getTypeIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'popular':
        return <Filter className="w-4 h-4 text-gray-400" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return 'Recent';
      case 'popular':
        return 'Popular';
      default:
        return 'Suggested';
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className={cn(
              'w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400'
            )}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.text}
                  id={`suggestion-${index}`}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    index === selectedIndex
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {getTypeIcon(suggestion.type)}
                    <span className="flex-1">{suggestion.text}</span>
                    <span className="text-xs text-gray-500">
                      {getTypeLabel(suggestion.type)}
                    </span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400'
          )}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className={cn(
              'px-3 py-1 text-sm font-medium rounded transition-colors',
              query.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-600'
            )}
          >
            Search
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          >
            {/* Recent Searches */}
            {getSuggestionsByType('recent').length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recent Searches
                </div>
                {getSuggestionsByType('recent').map((suggestion, index) => (
                  <button
                    key={`recent-${index}`}
                    id={`suggestion-${index}`}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      index === selectedIndex
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{suggestion.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Suggested Searches */}
            {getSuggestionsByType('suggested').length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Suggestions
                </div>
                {getSuggestionsByType('suggested').map((suggestion, index) => {
                  const actualIndex = getSuggestionsByType('recent').length + index;
                  return (
                    <button
                      key={`suggested-${index}`}
                      id={`suggestion-${actualIndex}`}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors',
                        actualIndex === selectedIndex
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span>{suggestion.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Keyboard Hint */}
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              <span className="font-medium">Keyboard shortcuts:</span> ↑↓ to navigate, Enter to select, Esc to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Filters */}
      {showFilters && recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Recent:</span>
          {recentSearches.slice(0, 5).map((search, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(search)}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {search}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelineSearch;