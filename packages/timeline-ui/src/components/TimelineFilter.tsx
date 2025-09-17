import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Tag,
  Filter as FilterIcon,
  ChevronDown,
  Plus,
  Clock,
  DollarSign,
  AlertTriangle,
  Check,
  Search
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

import { TimelineFilterProps, TimelineFilter, JobType, JobStatus, Priority } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

const jobTypes: JobType[] = ['chat', 'search', 'analysis', 'generation', 'processing', 'export', 'workflow', 'plugin', 'system'];
const jobStatuses: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused', 'retrying'];
const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];

const datePresets = [
  { label: 'Last 24 hours', value: '24h', days: 1 },
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
];

export const TimelineFilter: React.FC<TimelineFilterProps> = ({
  filters,
  onFiltersChange,
  availableTypes = jobTypes,
  availableStatuses = jobStatuses,
  availablePriorities = priorities,
  availableTags = [],
  compact = false,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePreset, setDatePreset] = useState<string>('');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [tagInput, setTagInput] = useState('');

  const hasActiveFilters = Object.keys(filters).length > 0;

  const updateFilters = useCallback((newFilters: Partial<TimelineFilter>) => {
    onFiltersChange({ ...filters, ...newFilters });
  }, [filters, onFiltersChange]);

  const removeFilter = useCallback((key: keyof TimelineFilter) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const handleDatePresetChange = useCallback((preset: string) => {
    setDatePreset(preset);
    const selectedPreset = datePresets.find(p => p.value === preset);
    if (selectedPreset) {
      const end = endOfDay(new Date());
      const start = startOfDay(subDays(end, selectedPreset.days));
      updateFilters({ dateRange: { start, end } });
    }
  }, [updateFilters]);

  const handleCustomDateRange = useCallback((range: { start: Date; end: Date }) => {
    setCustomDateRange(range);
    setDatePreset('');
    updateFilters({ dateRange: range });
  }, [updateFilters]);

  const addTag = useCallback((tag: string) => {
    if (tag && !filters.tags?.includes(tag)) {
      const newTags = [...(filters.tags || []), tag];
      updateFilters({ tags: newTags });
    }
    setTagInput('');
  }, [filters.tags, updateFilters]);

  const removeTag = useCallback((tag: string) => {
    const newTags = (filters.tags || []).filter(t => t !== tag);
    updateFilters({ tags: newTags.length > 0 ? newTags : undefined });
  }, [filters.tags, updateFilters]);

  const toggleType = useCallback((type: JobType) => {
    const currentTypes = Array.isArray(filters.type) ? filters.type :
                        filters.type ? [filters.type] : [];

    if (currentTypes.includes(type)) {
      const newTypes = currentTypes.filter(t => t !== type);
      updateFilters({ type: newTypes.length > 0 ? newTypes : undefined });
    } else {
      updateFilters({ type: [...currentTypes, type] });
    }
  }, [filters.type, updateFilters]);

  const toggleStatus = useCallback((status: JobStatus) => {
    const currentStatuses = Array.isArray(filters.status) ? filters.status :
                          filters.status ? [filters.status] : [];

    if (currentStatuses.includes(status)) {
      const newStatuses = currentStatuses.filter(s => s !== status);
      updateFilters({ status: newStatuses.length > 0 ? newStatuses : undefined });
    } else {
      updateFilters({ status: [...currentStatuses, status] });
    }
  }, [filters.status, updateFilters]);

  const togglePriority = useCallback((priority: Priority) => {
    const currentPriorities = Array.isArray(filters.priority) ? filters.priority :
                             filters.priority ? [filters.priority] : [];

    if (currentPriorities.includes(priority)) {
      const newPriorities = currentPriorities.filter(p => p !== priority);
      updateFilters({ priority: newPriorities.length > 0 ? newPriorities : undefined });
    } else {
      updateFilters({ priority: [...currentPriorities, priority] });
    }
  }, [filters.priority, updateFilters]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({});
    setDatePreset('');
    setCustomDateRange(null);
  }, [onFiltersChange]);

  const getSelectedTypes = () =>
    Array.isArray(filters.type) ? filters.type : filters.type ? [filters.type] : [];

  const getSelectedStatuses = () =>
    Array.isArray(filters.status) ? filters.status : filters.status ? [filters.status] : [];

  const getSelectedPriorities = () =>
    Array.isArray(filters.priority) ? filters.priority : filters.priority ? [filters.priority] : [];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            hasActiveFilters
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          )}
        >
          <FilterIcon className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {Object.keys(filters).length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-2"
        >
          {filters.type && (
            <FilterBadge
              label="Type"
              value={Array.isArray(filters.type) ? filters.type.join(', ') : filters.type}
              onRemove={() => removeFilter('type')}
            />
          )}
          {filters.status && (
            <FilterBadge
              label="Status"
              value={Array.isArray(filters.status) ? filters.status.join(', ') : filters.status}
              onRemove={() => removeFilter('status')}
            />
          )}
          {filters.priority && (
            <FilterBadge
              label="Priority"
              value={Array.isArray(filters.priority) ? filters.priority.join(', ') : filters.priority}
              onRemove={() => removeFilter('priority')}
            />
          )}
          {filters.tags && (
            <FilterBadge
              label="Tags"
              value={filters.tags.join(', ')}
              onRemove={() => removeFilter('tags')}
            />
          )}
          {filters.dateRange && (
            <FilterBadge
              label="Date Range"
              value={`${format(filters.dateRange.start, 'MMM dd')} - ${format(filters.dateRange.end, 'MMM dd')}`}
              onRemove={() => removeFilter('dateRange')}
            />
          )}
          {filters.hasError !== undefined && (
            <FilterBadge
              label="Errors"
              value={filters.hasError ? 'Has Errors' : 'No Errors'}
              onRemove={() => removeFilter('hasError')}
            />
          )}
          {filters.hasArtifacts !== undefined && (
            <FilterBadge
              label="Artifacts"
              value={filters.hasArtifacts ? 'Has Artifacts' : 'No Artifacts'}
              onRemove={() => removeFilter('hasArtifacts')}
            />
          )}

          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear all
          </button>
        </motion.div>
      )}

      {/* Filter Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Type Filter */}
        <FilterSection
          title="Job Type"
          icon={<Tag className="w-4 h-4" />}
        >
          <div className="flex flex-wrap gap-2">
            {availableTypes.map(type => (
              <FilterChip
                key={type}
                label={type}
                selected={getSelectedTypes().includes(type)}
                onClick={() => toggleType(type)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Status Filter */}
        <FilterSection
          title="Status"
          icon={<Clock className="w-4 h-4" />}
        >
          <div className="flex flex-wrap gap-2">
            {availableStatuses.map(status => (
              <FilterChip
                key={status}
                label={status}
                selected={getSelectedStatuses().includes(status)}
                onClick={() => toggleStatus(status)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Priority Filter */}
        <FilterSection
          title="Priority"
          icon={<AlertTriangle className="w-4 h-4" />}
        >
          <div className="flex flex-wrap gap-2">
            {availablePriorities.map(priority => (
              <FilterChip
                key={priority}
                label={priority}
                selected={getSelectedPriorities().includes(priority)}
                onClick={() => togglePriority(priority)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Date Range Filter */}
        <FilterSection
          title="Date Range"
          icon={<Calendar className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <select
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select date range</option>
              {datePresets.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full text-left px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              Custom Range
              <ChevronDown className={`w-4 h-4 inline ml-2 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <input
                    type="date"
                    onChange={(e) => {
                      const start = e.target.value ? new Date(e.target.value) : null;
                      if (start && customDateRange?.end) {
                        handleCustomDateRange({ start, end: customDateRange.end });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <input
                    type="date"
                    onChange={(e) => {
                      const end = e.target.value ? new Date(e.target.value) : null;
                      if (end && customDateRange?.start) {
                        handleCustomDateRange({ start: customDateRange.start, end });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FilterSection>

        {/* Tags Filter */}
        <FilterSection
          title="Tags"
          icon={<Tag className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTag(tagInput.trim());
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={() => addTag(tagInput.trim())}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.tags?.map(tag => (
                <TagBadge
                  key={tag}
                  label={tag}
                  onRemove={() => removeTag(tag)}
                />
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Advanced Filters */}
        <FilterSection
          title="Advanced"
          icon={<FilterIcon className="w-4 h-4" />}
        >
          <div className="space-y-3">
            {/* Has Error */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasError || false}
                onChange={(e) => updateFilters({ hasError: e.target.checked || undefined })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Has errors only
              </span>
            </label>

            {/* Has Artifacts */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasArtifacts || false}
                onChange={(e) => updateFilters({ hasArtifacts: e.target.checked || undefined })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Has artifacts only
              </span>
            </label>

            {/* Cost Range */}
            <div className="space-y-1">
              <label className="text-sm text-gray-700 dark:text-gray-300">Cost Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.costRange?.min || ''}
                  onChange={(e) => updateFilters({
                    costRange: {
                      min: e.target.value ? Number(e.target.value) : 0,
                      max: filters.costRange?.max || Infinity
                    }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.costRange?.max || ''}
                  onChange={(e) => updateFilters({
                    costRange: {
                      min: filters.costRange?.min || 0,
                      max: e.target.value ? Number(e.target.value) : Infinity
                    }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </FilterSection>
      </div>
    </div>
  );
};

// Helper Components
const FilterSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const FilterBadge: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
}> = ({ label, value, onRemove }) => (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs">
    <span className="font-medium">{label}:</span>
    <span>{value}</span>
    <button
      onClick={onRemove}
      className="hover:text-blue-600 dark:hover:text-blue-300"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

const FilterChip: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-2 py-1 rounded-full text-xs font-medium transition-colors',
      selected
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
    )}
  >
    {label}
  </button>
);

const TagBadge: React.FC<{
  label: string;
  onRemove: () => void;
}> = ({ label, onRemove }) => (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
    <span>{label}</span>
    <button
      onClick={onRemove}
      className="hover:text-green-600 dark:hover:text-green-300"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

export default TimelineFilter;