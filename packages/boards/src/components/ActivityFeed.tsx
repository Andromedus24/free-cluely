import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../utils/formatTime';

export interface ActivityEvent {
  id: string;
  type: 'card_created' | 'card_updated' | 'card_moved' | 'card_deleted' |
        'column_created' | 'column_updated' | 'column_deleted' |
        'comment_added' | 'board_updated' | 'user_joined' | 'user_left' |
        'label_added' | 'label_removed' | 'assignee_changed' |
        'due_date_changed' | 'attachment_added' | 'checklist_completed';
  userId: string;
  userName: string;
  userAvatar?: string;
  targetId?: string;
  targetName?: string;
  action: string;
  details?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  boardId: string;
  activities: ActivityEvent[];
  onActivityClick?: (activity: ActivityEvent) => void;
  onFilterChange?: (filters: ActivityFilter) => void;
  realtimeEnabled?: boolean;
  maxItems?: number;
  className?: string;
}

interface ActivityFilter {
  types?: ActivityEvent['type'][];
  users?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

const ACTIVITY_ICONS: Record<ActivityEvent['type'], string> = {
  card_created: '➕',
  card_updated: '✏️',
  card_moved: '🔄',
  card_deleted: '🗑️',
  column_created: '📋',
  column_updated: '📝',
  column_deleted: '🗑️',
  comment_added: '💬',
  board_updated: '⚙️',
  user_joined: '👋',
  user_left: '👋',
  label_added: '🏷️',
  label_removed: '🏷️',
  assignee_changed: '👤',
  due_date_changed: '📅',
  attachment_added: '📎',
  checklist_completed: '✅'
};

const ACTIVITY_COLORS: Record<ActivityEvent['type'], string> = {
  card_created: 'text-green-600',
  card_updated: 'text-blue-600',
  card_moved: 'text-purple-600',
  card_deleted: 'text-red-600',
  column_created: 'text-green-600',
  column_updated: 'text-blue-600',
  column_deleted: 'text-red-600',
  comment_added: 'text-blue-600',
  board_updated: 'text-gray-600',
  user_joined: 'text-green-600',
  user_left: 'text-red-600',
  label_added: 'text-yellow-600',
  label_removed: 'text-gray-600',
  assignee_changed: 'text-blue-600',
  due_date_changed: 'text-orange-600',
  attachment_added: 'text-indigo-600',
  checklist_completed: 'text-green-600'
};

const ActivityItem: React.FC<{
  activity: ActivityEvent;
  onClick?: (activity: ActivityEvent) => void;
}> = ({ activity, onClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(activity);
    }
    setShowDetails(!showDetails);
  };

  const renderActivityContent = () => {
    const icon = ACTIVITY_ICONS[activity.type] || '📌';
    const colorClass = ACTIVITY_COLORS[activity.type] || 'text-gray-600';

    return (
      <div className="flex items-start space-x-3">
        <div className={`text-lg ${colorClass} flex-shrink-0`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-gray-900">{activity.userName}</span>
            <span className="text-gray-600">{activity.action}</span>
            {activity.targetName && (
              <span className="font-medium text-gray-700">"{activity.targetName}"</span>
            )}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {formatTime(activity.timestamp)}
          </div>

          {activity.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: showDetails ? 'auto' : 0, opacity: showDetails ? 1 : 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                {activity.details}
              </div>
            </motion.div>
          )}

          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: showDetails ? 'auto' : 0, opacity: showDetails ? 1 : 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-2 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-700 mb-1">Details:</div>
                {Object.entries(activity.metadata).map(([key, value]) => (
                  <div key={key} className="text-xs text-gray-600">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <button
          onClick={handleClick}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <motion.div
      className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ backgroundColor: '#F9FAFB' }}
      onClick={handleClick}
    >
      {renderActivityContent()}
    </motion.div>
  );
};

const ActivityFilterPanel: React.FC<{
  filters: ActivityFilter;
  onFilterChange: (filters: ActivityFilter) => void;
  availableUsers: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}> = ({ filters, onFilterChange, availableUsers, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  const activityTypes: Array<{ type: ActivityEvent['type']; label: string }> = [
    { type: 'card_created', label: 'Cards Created' },
    { type: 'card_updated', label: 'Cards Updated' },
    { type: 'card_moved', label: 'Cards Moved' },
    { type: 'card_deleted', label: 'Cards Deleted' },
    { type: 'comment_added', label: 'Comments' },
    { type: 'user_joined', label: 'Users Joined' },
    { type: 'user_left', label: 'Users Left' },
    { type: 'attachment_added', label: 'Attachments' }
  ];

  const hasActiveFilters = () => {
    return (
      (filters.types && filters.types.length > 0) ||
      (filters.users && filters.users.length > 0) ||
      (filters.dateRange) ||
      (filters.searchQuery && filters.searchQuery.length > 0)
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters()
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
          {hasActiveFilters() && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {[
                filters.types?.length || 0,
                filters.users?.length || 0,
                filters.dateRange ? 1 : 0,
                filters.searchQuery ? 1 : 0
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Activity Filters</h3>
                {hasActiveFilters() && (
                  <button
                    onClick={onClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Activity Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Types
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {activityTypes.map(({ type, label }) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.types?.includes(type) || false}
                        onChange={(e) => {
                          const currentTypes = filters.types || [];
                          const newTypes = e.target.checked
                            ? [...currentTypes, type]
                            : currentTypes.filter(t => t !== type);
                          onFilterChange({ ...filters, types: newTypes });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Users
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableUsers.map(user => (
                    <label key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.users?.includes(user.id) || false}
                        onChange={(e) => {
                          const currentUsers = filters.users || [];
                          const newUsers = e.target.checked
                            ? [...currentUsers, user.id]
                            : currentUsers.filter(u => u !== user.id);
                          onFilterChange({ ...filters, users: newUsers });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const start = e.target.value ? new Date(e.target.value) : undefined;
                      onFilterChange({
                        ...filters,
                        dateRange: { ...filters.dateRange!, start }
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={filters.dateRange?.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const end = e.target.value ? new Date(e.target.value) : undefined;
                      onFilterChange({
                        ...filters,
                        dateRange: { ...filters.dateRange!, end }
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  boardId,
  activities,
  onActivityClick,
  onFilterChange,
  realtimeEnabled = false,
  maxItems = 50,
  className = ''
}) => {
  const [filteredActivities, setFilteredActivities] = useState<ActivityEvent[]>([]);
  const [filters, setFilters] = useState<ActivityFilter>({});
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string }>>([]);

  // Extract unique users from activities
  useEffect(() => {
    const users = Array.from(
      new Map(
        activities.map(activity => [activity.userId, {
          id: activity.userId,
          name: activity.userName
        }])
      ).values()
    );
    setAvailableUsers(users);
  }, [activities]);

  // Apply filters to activities
  useEffect(() => {
    let filtered = activities;

    // Apply type filter
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(activity => filters.types!.includes(activity.type));
    }

    // Apply user filter
    if (filters.users && filters.users.length > 0) {
      filtered = filtered.filter(activity => filters.users!.includes(activity.userId));
    }

    // Apply date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(activity => {
        const activityDate = activity.timestamp;
        const start = filters.dateRange!.start;
        const end = filters.dateRange!.end;

        if (start && activityDate < start) return false;
        if (end && activityDate > end) return false;
        return true;
      });
    }

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.action.toLowerCase().includes(query) ||
        activity.userName.toLowerCase().includes(query) ||
        activity.targetName?.toLowerCase().includes(query) ||
        activity.details?.toLowerCase().includes(query)
      );
    }

    // Sort by timestamp (newest first) and limit
    filtered = filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);

    setFilteredActivities(filtered);
  }, [activities, filters, maxItems]);

  const handleFilterChange = useCallback((newFilters: ActivityFilter) => {
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [onFilterChange]);

  const clearFilters = useCallback(() => {
    setFilters({});
    onFilterChange?.({});
  }, [onFilterChange]);

  const groupActivitiesByDate = (activities: ActivityEvent[]) => {
    const groups: Record<string, ActivityEvent[]> = {};

    activities.forEach(activity => {
      const dateKey = formatTime(activity.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return Object.entries(groups);
  };

  const activityGroups = groupActivitiesByDate(filteredActivities);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <p className="text-sm text-gray-600">
              {realtimeEnabled ? 'Real-time updates' : 'Recent board activity'}
            </p>
          </div>

          <ActivityFilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            availableUsers={availableUsers}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Real-time indicator */}
        {realtimeEnabled && (
          <div className="mt-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Live updates enabled</span>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📊</div>
            <p className="text-gray-600">
              {hasActiveFilters() ? 'No activities match your filters' : 'No activity yet'}
            </p>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activityGroups.map(([dateKey, groupActivities]) => (
              <div key={dateKey}>
                <div className="sticky top-0 bg-white py-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {dateKey}
                  </h4>
                </div>
                <div className="space-y-2">
                  {groupActivities.map(activity => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      onClick={onActivityClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredActivities.length} of {activities.length} activities
          </span>
          {realtimeEnabled && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;