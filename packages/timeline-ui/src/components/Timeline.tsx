import React, { forwardRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Filter,
  Search,
  Download,
  BarChart3,
  Settings,
  Grid,
  List,
  Calendar,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

import { TimelineVirtualList } from './TimelineVirtualList';
import { TimelineItem } from './TimelineItem';
import { TimelineHeader } from './TimelineHeader';
import { TimelineFilter } from './TimelineFilter';
import { TimelineSearch } from './TimelineSearch';
import { TimelineExport } from './TimelineExport';
import { TimelineAnalytics } from './TimelineAnalytics';
import { TimelineRealtime } from './TimelineRealtime';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

import { useTimelineVirtualization } from '../hooks/useTimelineVirtualization';
import { useKeyboardShortcuts, useScreenReader } from '../hooks/useKeyboardShortcuts';
import { TimelineUIConfig, TimelineEntry } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';
import { createTimelineAPI, TimelineAPI } from '@atlas/timeline';

export interface TimelineProps extends TimelineUIConfig {
  timelineAPI?: TimelineAPI;
  items?: TimelineEntry[];
  realtimeConfig?: {
    url: string;
    enabled?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
  };
  onItemSelect?: (item: TimelineEntry) => void;
  onItemAction?: (itemId: string, action: string) => void;
  onJobCreate?: (job: TimelineEntry) => void;
  onJobUpdate?: (job: TimelineEntry) => void;
  onJobDelete?: (jobId: string) => void;
  onFilterChange?: (filter: any) => void;
  onSortChange?: (sort: any) => void;
  onLoadMore?: (cursor?: string) => Promise<{ items: TimelineEntry[]; hasMore: boolean; cursor?: string }>;
  className?: string;
  style?: React.CSSProperties;
}

export const Timeline = forwardRef<
  {
    refresh: () => Promise<void>;
    scrollToItem: (id: string) => void;
    clearSelection: () => void;
    getSelectedItems: () => TimelineEntry[];
  },
  TimelineProps
>(({
  timelineAPI,
  items: propItems,
  onItemSelect,
  onItemAction,
  onFilterChange,
  onSortChange,
  onLoadMore,
  className,
  style,
  ...config
}, ref) => {
  // Props
  const {
    realtimeConfig,
    onJobCreate,
    onJobUpdate,
    onJobDelete,
    ...otherProps
  } = config;

  // State
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showRealtime, setShowRealtime] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [density, setDensity] = useState<'compact' | 'normal' | 'spacious'>('normal');

  // Initialize timeline API if not provided
  const [internalAPI] = useState(() => timelineAPI || createTimelineAPI(config));

  // Load more items handler
  const handleLoadMore = useCallback(async (cursor?: string) => {
    if (onLoadMore) {
      return onLoadMore(cursor);
    }

    // Default implementation using timeline API
    try {
      const response = await internalAPI.queryTimeline({
        pagination: {
          limit: config.maxItemsPerPage || 50,
          cursor,
        },
        filter: config.defaultFilter,
        sort: [config.defaultSort || { field: 'createdAt', direction: 'desc' }],
      });

      return {
        items: response.entries,
        hasMore: response.pagination.hasNext,
        cursor: response.pagination.cursor,
      };
    } catch (error) {
      console.error('Failed to load timeline items:', error);
      toast.error('Failed to load timeline items');
      return { items: [], hasMore: false };
    }
  }, [internalAPI, onLoadMore, config]);

  // Virtualization hook
  const {
    state,
    loadMore,
    refresh,
    selectItem,
    expandItem,
    filterItems,
    sortItems,
    searchItems,
    clearSelection,
    clearFilters,
    enableRealtime,
    disableRealtime,
    reconnectRealtime,
    visibleItems,
    selectedItem,
    expandedItem,
    isLoading,
    hasMore,
    isEmpty,
    virtualListProps,
    getItemById,
    scrollToItem: scrollToItemHook,
  } = useTimelineVirtualization({
    config,
    initialItems: propItems,
    initialFilter: config.defaultFilter || {},
    initialSort: config.defaultSort || { field: 'createdAt', direction: 'desc' },
    realtimeConfig,
    onLoadMore: handleLoadMore,
    onFilterChange,
    onSortChange,
    onItemClick: onItemSelect,
    onItemAction,
    onJobCreate,
    onJobUpdate,
    onJobDelete,
  });

  // Keyboard shortcuts integration
  const { announcePolite } = useScreenReader();

  const keyboardShortcuts = [
    {
      category: 'Navigation',
      shortcuts: [
        { key: 'j', description: 'Focus next timeline item', action: () => {
          const currentIndex = visibleItems.findIndex(item => item.id === selectedItem?.id);
          const nextIndex = (currentIndex + 1) % visibleItems.length;
          if (visibleItems[nextIndex]) {
            selectItem(visibleItems[nextIndex].id);
            announcePolite(`Selected ${visibleItems[nextIndex].title}`);
          }
        }},
        { key: 'k', description: 'Focus previous timeline item', action: () => {
          const currentIndex = visibleItems.findIndex(item => item.id === selectedItem?.id);
          const prevIndex = currentIndex <= 0 ? visibleItems.length - 1 : currentIndex - 1;
          if (visibleItems[prevIndex]) {
            selectItem(visibleItems[prevIndex].id);
            announcePolite(`Selected ${visibleItems[prevIndex].title}`);
          }
        }},
        { key: 'g', shiftKey: true, description: 'Focus first timeline item', action: () => {
          if (visibleItems.length > 0) {
            selectItem(visibleItems[0].id);
            announcePolite(`Selected ${visibleItems[0].title}`);
          }
        }},
        { key: 'g', description: 'Focus last timeline item', action: () => {
          if (visibleItems.length > 0) {
            selectItem(visibleItems[visibleItems.length - 1].id);
            announcePolite(`Selected ${visibleItems[visibleItems.length - 1].title}`);
          }
        }},
        { key: 'Enter', description: 'Expand/collapse selected item', action: () => {
          if (selectedItem) {
            expandItem(selectedItem.id);
            announcePolite(`Toggled details for ${selectedItem.title}`);
          }
        }},
      ]
    },
    {
      category: 'Search & Filter',
      shortcuts: [
        { key: '/', description: 'Focus search input', action: () => {
          setShowSearch(true);
          announcePolite('Search focused');
        }},
        { key: 'f', description: 'Toggle filter panel', action: () => {
          setShowFilters(!showFilters);
          announcePolite(showFilters ? 'Filters hidden' : 'Filters shown');
        }},
        { key: 'Escape', description: 'Clear search and filters', action: () => {
          searchItems('');
          clearFilters();
          announcePolite('Search and filters cleared');
        }},
      ]
    },
    {
      category: 'Actions',
      shortcuts: [
        { key: 'r', description: 'Refresh timeline', action: () => {
          refresh();
          announcePolite('Timeline refreshed');
        }},
        { key: 'e', description: 'Export timeline', action: () => {
          setShowExport(true);
          announcePolite('Export panel opened');
        }},
        { key: 'a', description: 'Show analytics', action: () => {
          setShowAnalytics(true);
          announcePolite('Analytics panel opened');
        }},
        { key: 'Delete', description: 'Delete selected item', action: () => {
          if (selectedItem) {
            handleItemAction(selectedItem.id, 'delete');
          }
        }},
        { key: 'c', description: 'Cancel selected job', action: () => {
          if (selectedItem) {
            handleItemAction(selectedItem.id, 'cancel');
          }
        }},
      ]
    },
    {
      category: 'View Controls',
      shortcuts: [
        { key: '1', description: 'Switch to list view', action: () => {
          setLayoutMode('list');
          announcePolite('Switched to list view');
        }},
        { key: '2', description: 'Switch to grid view', action: () => {
          setLayoutMode('grid');
          announcePolite('Switched to grid view');
        }},
        { key: '3', description: 'Switch to calendar view', action: () => {
          setLayoutMode('calendar');
          announcePolite('Switched to calendar view');
        }},
        { key: '-', description: 'Decrease density', action: () => {
          const densities: Array<'compact' | 'normal' | 'spacious'> = ['compact', 'normal', 'spacious'];
          const currentIndex = densities.indexOf(density);
          const nextIndex = Math.min(currentIndex + 1, densities.length - 1);
          setDensity(densities[nextIndex]);
          announcePolite(`Switched to ${densities[nextIndex]} density`);
        }},
        { key: '=', description: 'Increase density', action: () => {
          const densities: Array<'compact' | 'normal' | 'spacious'> = ['compact', 'normal', 'spacious'];
          const currentIndex = densities.indexOf(density);
          const prevIndex = Math.max(currentIndex - 1, 0);
          setDensity(densities[prevIndex]);
          announcePolite(`Switched to ${densities[prevIndex]} density`);
        }},
      ]
    },
    {
      category: 'Help',
      shortcuts: [
        { key: '?', description: 'Show keyboard shortcuts', action: () => {
          setShowShortcuts(true);
          announcePolite('Keyboard shortcuts help opened');
        }},
      ]
    }
  ];

  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
    enabled: true,
    preventDefault: true,
  });

  // Register keyboard shortcuts
  useEffect(() => {
    keyboardShortcuts.forEach(category => {
      category.shortcuts.forEach(shortcut => {
        registerShortcut({
          ...shortcut,
          category: category.name,
          preventDefault: true,
          stopPropagation: true,
        });
      });
    });

    return () => {
      keyboardShortcuts.forEach(category => {
        category.shortcuts.forEach(shortcut => {
          unregisterShortcut(shortcut.key, category.name);
        });
      });
    };
  }, [registerShortcut, unregisterShortcut, visibleItems, selectedItem, showFilters]);

  // Item click handler
  const handleItemClick = useCallback((item: TimelineEntry) => {
    selectItem(item.id);
  }, [selectItem]);

  // Item action handler
  const handleItemAction = useCallback(async (itemId: string, action: string) => {
    try {
      switch (action) {
        case 'cancel':
          await internalAPI.batchOperation({
            operation: 'cancel',
            entryIds: [itemId],
          });
          toast.success('Job cancelled successfully');
          await refresh();
          break;

        case 'retry':
          await internalAPI.batchOperation({
            operation: 'retry',
            entryIds: [itemId],
          });
          toast.success('Job retry initiated');
          await refresh();
          break;

        case 'resume':
          await internalAPI.batchOperation({
            operation: 'resume',
            entryIds: [itemId],
          });
          toast.success('Job resumed successfully');
          await refresh();
          break;

        case 'delete':
          await internalAPI.deleteEntry(itemId);
          toast.success('Job deleted successfully');
          await refresh();
          break;

        case 'download':
          // Download implementation would go here
          toast.success('Download started');
          break;

        default:
          onItemAction?.(itemId, action);
      }
    } catch (error) {
      console.error(`Failed to perform action ${action} on item ${itemId}:`, error);
      toast.error(`Failed to ${action} job`);
    }
  }, [internalAPI, refresh, onItemAction]);

  // Export handler
  const handleExport = useCallback(async (format: string, options: any) => {
    try {
      const exportJob = await internalAPI.createExport({
        format: format as any,
        filter: state.filters,
        ...options,
      });

      toast.success(`Export started (Job ID: ${exportJob.id})`);

      // Monitor export progress
      const checkProgress = async () => {
        const job = await internalAPI.getExportJob(exportJob.id);
        if (job?.status === 'completed') {
          toast.success('Export completed successfully');
          setShowExport(false);
        } else if (job?.status === 'failed') {
          toast.error(`Export failed: ${job.error}`);
        } else {
          setTimeout(checkProgress, 1000);
        }
      };

      checkProgress();
    } catch (error) {
      console.error('Failed to create export:', error);
      toast.error('Failed to create export');
    }
  }, [internalAPI, state.filters]);

  // Ref implementation
  React.useImperativeHandle(ref, () => ({
    refresh,
    scrollToItem: scrollToItemHook,
    clearSelection,
    getSelectedItems: () => Array.from(state.selectedItems).map(id => getItemById(id)).filter(Boolean),
  }));

  // Auto-refresh if enabled
  useEffect(() => {
    if (config.enableRealtime && config.realtimeEnabled) {
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    }
  }, [config.enableRealtime, config.realtimeEnabled, refresh]);

  // Render item for virtual list
  const renderItem = useCallback((item: TimelineEntry, index: number) => {
    const isSelected = state.selectedItems.has(item.id);
    const isExpanded = state.expandedItems.has(item.id);

    return (
      <TimelineItem
        key={item.id}
        entry={item}
        isSelected={isSelected}
        isExpanded={isExpanded}
        onSelect={handleItemClick}
        onExpand={expandItem}
        onAction={handleItemAction}
        showDetails={config.showDetails !== false}
        compact={density === 'compact'}
        theme={config.theme || 'light'}
      />
    );
  }, [
    state.selectedItems,
    state.expandedItems,
    handleItemClick,
    expandItem,
    handleItemAction,
    config.showDetails,
    density,
    config.theme,
  ]);

  // Header actions
  const headerActions = [
    {
      label: 'Refresh',
      icon: RefreshCw,
      onClick: refresh,
      variant: 'default' as const,
      disabled: isLoading,
    },
    {
      label: 'Filter',
      icon: Filter,
      onClick: () => setShowFilters(!showFilters),
      variant: showFilters ? 'primary' : 'default' as const,
    },
    {
      label: 'Search',
      icon: Search,
      onClick: () => setShowSearch(!showSearch),
      variant: showSearch ? 'primary' : 'default' as const,
    },
    ...(config.showExport !== false ? [{
      label: 'Export',
      icon: Download,
      onClick: () => setShowExport(true),
      variant: 'default' as const,
    }] : []),
    ...(config.showAnalytics !== false ? [{
      label: 'Analytics',
      icon: BarChart3,
      onClick: () => setShowAnalytics(true),
      variant: 'default' as const,
    }] : []),
    ...(realtimeConfig ? [{
      label: showRealtime ? 'Disable Real-time' : 'Enable Real-time',
      icon: showRealtime ? WifiOff : Wifi,
      onClick: () => {
        if (showRealtime) {
          disableRealtime();
          setShowRealtime(false);
        } else {
          enableRealtime();
          setShowRealtime(true);
        }
      },
      variant: showRealtime ? 'primary' : 'default' as const,
    }] : []),
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => {
        // Settings implementation
        toast.info('Settings panel coming soon');
      },
      variant: 'default' as const,
    },
  ];

  // Calculate stats
  const stats = {
    total: visibleItems.length,
    completed: visibleItems.filter(item => item.status === 'completed').length,
    failed: visibleItems.filter(item => item.status === 'failed').length,
    running: visibleItems.filter(item => item.status === 'running').length,
  };

  const timelineClasses = cn(
    'timeline-container relative w-full h-full flex flex-col',
    'bg-gray-50 dark:bg-gray-900',
    className
  );

  return (
    <div className={timelineClasses} style={style}>
      {/* Header */}
      {config.showHeader !== false && (
        <TimelineHeader
          title={config.title || 'Timeline'}
          subtitle={config.subtitle || `${stats.total} items`}
          actions={headerActions}
          stats={stats}
          loading={isLoading}
        />
      )}

      {/* Controls */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-gray-200 dark:border-gray-700"
            >
              <TimelineSearch
                query={state.searchQuery}
                onQueryChange={searchItems}
                placeholder="Search timeline items..."
                compact={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-gray-200 dark:border-gray-700"
            >
              <TimelineFilter
                filters={state.filters}
                onFiltersChange={filterItems}
                compact={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {/* Layout Mode */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setLayoutMode('list')}
                className={cn(
                  'p-2 rounded transition-colors',
                  layoutMode === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('grid')}
                className={cn(
                  'p-2 rounded transition-colors',
                  layoutMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('calendar')}
                className={cn(
                  'p-2 rounded transition-colors',
                  layoutMode === 'calendar'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Density */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setDensity('compact')}
                className={cn(
                  'p-2 rounded transition-colors text-xs',
                  density === 'compact'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                Compact
              </button>
              <button
                onClick={() => setDensity('normal')}
                className={cn(
                  'p-2 rounded transition-colors text-xs',
                  density === 'normal'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                Normal
              </button>
              <button
                onClick={() => setDensity('spacious')}
                className={cn(
                  'p-2 rounded transition-colors text-xs',
                  density === 'spacious'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                Spacious
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear Filters */}
            {(Object.keys(state.filters).length > 0 || state.searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear filters
              </button>
            )}

            {/* Selected Items */}
            {state.selectedItems.size > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {state.selectedItems.size} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No timeline items
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get started by creating your first job or adjust your filters to see existing items.
              </p>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <TimelineVirtualList
            {...virtualListProps}
            renderItem={renderItem}
            overscanCount={config.bufferSize || 5}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {state.error && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                  Error loading timeline
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                  {state.error}
                </p>
                <button
                  onClick={refresh}
                  className="text-sm text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Export Timeline
              </h3>
              <button
                onClick={() => setShowExport(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <TimelineExport
              onExport={handleExport}
              availableFormats={['json', 'csv', 'pdf', 'xlsx']}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Timeline Analytics
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <TimelineAnalytics
              analytics={{
                totalJobs: stats.total,
                completedJobs: stats.completed,
                failedJobs: stats.failed,
                averageDuration: 0,
                totalCost: 0,
                jobsByType: {},
                jobsByStatus: {},
                jobsByDay: [],
                topTags: [],
              }}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Real-time Updates Panel */}
      {realtimeConfig && showRealtime && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">Real-time Updates</span>
              </div>
              <button
                onClick={() => setShowRealtime(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              <TimelineRealtime
                config={realtimeConfig}
                onJobUpdate={onJobUpdate}
                onJobCreate={onJobCreate}
                onJobDelete={onJobDelete}
                onConnectionChange={(isConnected) => {
                  if (!isConnected) {
                    toast.error('Real-time connection lost');
                  }
                }}
                compact={false}
                theme={config.theme || 'light'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        shortcuts={keyboardShortcuts}
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        theme={config.theme || 'light'}
      />
    </div>
  );
});

Timeline.displayName = 'Timeline';

export default Timeline;