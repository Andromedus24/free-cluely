import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TimelineEntry, TimelineFilter, TimelineSort } from '@atlas/timeline';
import { useWebSocketRealtime } from './useWebSocketRealtime';
import { TimelineUIConfig, TimelineState, TimelineLayout } from '../types/TimelineUITypes';

interface UseTimelineVirtualizationProps {
  config?: TimelineUIConfig;
  initialItems?: TimelineEntry[];
  initialFilter?: TimelineFilter;
  initialSort?: TimelineSort;
  realtimeConfig?: {
    url: string;
    enabled?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
  };
  onLoadMore?: (cursor?: string) => Promise<{ items: TimelineEntry[]; hasMore: boolean; cursor?: string }>;
  onFilterChange?: (filter: TimelineFilter) => void;
  onSortChange?: (sort: TimelineSort) => void;
  onItemClick?: (item: TimelineEntry) => void;
  onItemAction?: (itemId: string, action: string) => void;
  onJobCreate?: (job: TimelineEntry) => void;
  onJobUpdate?: (job: TimelineEntry) => void;
  onJobDelete?: (jobId: string) => void;
}

interface UseTimelineVirtualizationReturn {
  // State
  state: TimelineState;

  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  selectItem: (id: string) => void;
  expandItem: (id: string) => void;
  filterItems: (filter: TimelineFilter) => void;
  sortItems: (sort: TimelineSort) => void;
  searchItems: (query: string) => void;
  clearSelection: () => void;
  clearFilters: () => void;

  // Real-time actions
  enableRealtime: () => void;
  disableRealtime: () => void;
  reconnectRealtime: () => void;

  // Derived state
  visibleItems: TimelineEntry[];
  selectedItem: TimelineEntry | null;
  expandedItem: TimelineEntry | null;
  isLoading: boolean;
  hasMore: boolean;
  isEmpty: boolean;

  // Virtual list props
  virtualListProps: {
    items: TimelineEntry[];
    itemHeight: number;
    onEndReached: () => void;
    onItemVisible: (item: TimelineEntry, index: number) => void;
    onItemHidden: (item: TimelineEntry, index: number) => void;
  };

  // Utils
  getItemById: (id: string) => TimelineEntry | null;
  getItemsByIds: (ids: string[]) => TimelineEntry[];
  scrollToItem: (id: string) => void;
}

export function useTimelineVirtualization({
  config = {},
  initialItems = [],
  initialFilter = {},
  initialSort = { field: 'createdAt', direction: 'desc' },
  realtimeConfig,
  onLoadMore,
  onFilterChange,
  onSortChange,
  onItemClick,
  onItemAction,
  onJobCreate,
  onJobUpdate,
  onJobDelete,
}: UseTimelineVirtualizationProps): UseTimelineVirtualizationReturn {
  // Configuration
  const virtualized = config.virtualized ?? true;
  const itemHeight = config.itemHeight ?? 120;
  const bufferSize = config.bufferSize ?? 5;
  const maxItemsPerPage = config.maxItemsPerPage ?? 50;
  const enableAnimations = config.enableAnimations ?? true;

  // State
  const [state, setState] = useState<TimelineState>({
    items: initialItems,
    loading: false,
    error: null,
    hasMore: true,
    filters: initialFilter,
    sort: initialSort,
    searchQuery: '',
    selectedItems: new Set(),
    expandedItems: new Set(),
    layout: {
      mode: 'list',
      density: 'normal',
      sortBy: initialSort,
      groupBy: 'none',
      showArtifacts: true,
      showMetadata: true,
      showActions: true,
      virtualized: virtualized,
      autoRefresh: config.enableRealtime ?? false,
      refreshInterval: 30000,
    },
    analytics: null,
    realTimeUpdates: config.enableRealtime ?? false,
    lastUpdated: new Date(),
  });

  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Real-time WebSocket connection
  const {
    connectionState,
    isConnected: wsConnected,
    connect: connectWs,
    disconnect: disconnectWs,
    requestJobUpdate,
    requestBatchSync,
  } = useWebSocketRealtime(realtimeConfig || { url: '' }, {
    onJobCreated: (job) => {
      // Add or update job in the timeline
      setState(prev => {
        const existingIndex = prev.items.findIndex(item => item.id === job.id);
        const newItems = [...prev.items];
        if (existingIndex >= 0) {
          newItems[existingIndex] = job;
        } else {
          newItems.unshift(job); // Add new jobs at the top
        }
        return { ...prev, items: newItems, lastUpdated: new Date() };
      });
      onJobCreate?.(job);
    },
    onJobUpdated: (job) => {
      // Update existing job
      setState(prev => {
        const newItems = prev.items.map(item =>
          item.id === job.id ? job : item
        );
        return { ...prev, items: newItems, lastUpdated: new Date() };
      });
      onJobUpdate?.(job);
    },
    onJobDeleted: (jobId) => {
      // Remove job from timeline
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== jobId),
        lastUpdated: new Date(),
      }));
      onJobDelete?.(jobId);
    },
    onBatchUpdate: (update) => {
      // Process batch updates efficiently
      setState(prev => {
        let newItems = [...prev.items];

        // Add new jobs
        if (update.jobs) {
          update.jobs.forEach(job => {
            const existingIndex = newItems.findIndex(item => item.id === job.id);
            if (existingIndex >= 0) {
              newItems[existingIndex] = job;
            } else {
              newItems.unshift(job);
            }
          });
        }

        // Remove deleted jobs
        if (update.deletedJobs) {
          newItems = newItems.filter(item => !update.deletedJobs!.includes(item.id));
        }

        return { ...prev, items: newItems, lastUpdated: new Date() };
      });
    },
  });

  // Filter and sort items
  const visibleItems = useMemo(() => {
    let filtered = [...state.items];

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query)) ||
        Object.entries(item.metadata).some(([key, value]) =>
          key.toLowerCase().includes(query) ||
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Apply structured filters
    if (state.filters.type) {
      const types = Array.isArray(state.filters.type) ? state.filters.type : [state.filters.type];
      filtered = filtered.filter(item => types.includes(item.type));
    }

    if (state.filters.status) {
      const statuses = Array.isArray(state.filters.status) ? state.filters.status : [state.filters.status];
      filtered = filtered.filter(item => statuses.includes(item.status));
    }

    if (state.filters.priority) {
      const priorities = Array.isArray(state.filters.priority) ? state.filters.priority : [state.filters.priority];
      filtered = filtered.filter(item => item.priority && priorities.includes(item.priority));
    }

    if (state.filters.tags && state.filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        state.filters.tags!.some(tag => item.tags.includes(tag))
      );
    }

    if (state.filters.dateRange) {
      const { start, end } = state.filters.dateRange;
      filtered = filtered.filter(item =>
        item.createdAt >= start && item.createdAt <= end
      );
    }

    if (state.filters.dateFrom) {
      filtered = filtered.filter(item => item.createdAt >= state.filters.dateFrom!);
    }

    if (state.filters.dateTo) {
      filtered = filtered.filter(item => item.createdAt <= state.filters.dateTo!);
    }

    if (state.filters.hasError !== undefined) {
      filtered = filtered.filter(item =>
        state.filters.hasError ? !!item.error : !item.error
      );
    }

    if (state.filters.hasArtifacts !== undefined) {
      filtered = filtered.filter(item =>
        state.filters.hasArtifacts ?
        (item.artifacts && item.artifacts.length > 0) :
        (!item.artifacts || item.artifacts.length === 0)
      );
    }

    if (state.filters.costRange) {
      const { min, max } = state.filters.costRange;
      filtered = filtered.filter(item =>
        item.cost && item.cost >= min && item.cost <= max
      );
    }

    if (state.filters.durationRange) {
      const { min, max } = state.filters.durationRange;
      filtered = filtered.filter(item =>
        item.duration && item.duration >= min && item.duration <= max
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const field = state.sort.field;
      const direction = state.sort.direction === 'asc' ? 1 : -1;

      let aValue: any = a[field as keyof TimelineEntry];
      let bValue: any = b[field as keyof TimelineEntry];

      // Handle dates
      if (field === 'createdAt' || field === 'updatedAt' || field === 'startedAt' || field === 'completedAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle null/undefined values
      if (aValue == null) aValue = direction === 1 ? -Infinity : Infinity;
      if (bValue == null) bValue = direction === 1 ? -Infinity : Infinity;

      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });

    return filtered;
  }, [state.items, state.filters, state.sort, state.searchQuery]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !state.hasMore || !onLoadMore) return;

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const lastItem = state.items[state.items.length - 1];
      const cursor = lastItem?.id;

      const result = await onLoadMore(cursor);

      setState(prev => ({
        ...prev,
        items: [...prev.items, ...result.items],
        hasMore: result.hasMore,
        loading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Load more request was aborted');
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load more items',
        }));
      }
    } finally {
      loadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [state.hasMore, state.items, onLoadMore]);

  // Refresh items
  const refresh = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const result = await onLoadMore?.();

      setState(prev => ({
        ...prev,
        items: result?.items || [],
        hasMore: result?.hasMore ?? false,
        loading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Refresh request was aborted');
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to refresh items',
        }));
      }
    } finally {
      loadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [onLoadMore]);

  // Select item
  const selectItem = useCallback((id: string) => {
    const item = getItemById(id);
    if (item) {
      setState(prev => {
        const newSelected = new Set(prev.selectedItems);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        return { ...prev, selectedItems: newSelected };
      });
      onItemClick?.(item);
    }
  }, [onItemClick]);

  // Expand item
  const expandItem = useCallback((id: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedItems);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { ...prev, expandedItems: newExpanded };
    });
  }, []);

  // Filter items
  const filterItems = useCallback((filter: TimelineFilter) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filter },
    }));
    onFilterChange?.(filter);
  }, [onFilterChange]);

  // Sort items
  const sortItems = useCallback((sort: TimelineSort) => {
    setState(prev => ({
      ...prev,
      sort,
      layout: { ...prev.layout, sortBy: sort },
    }));
    onSortChange?.(sort);
  }, [onSortChange]);

  // Search items
  const searchItems = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedItems: new Set() }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      searchQuery: '',
    }));
  }, []);

  // Get item by ID
  const getItemById = useCallback((id: string) => {
    return state.items.find(item => item.id === id) || null;
  }, [state.items]);

  // Get items by IDs
  const getItemsByIds = useCallback((ids: string[]) => {
    return state.items.filter(item => ids.includes(item.id));
  }, [state.items]);

  // Scroll to item (implementation depends on virtual list ref)
  const scrollToItem = useCallback((id: string) => {
    const index = visibleItems.findIndex(item => item.id === id);
    if (index !== -1) {
      // This would be implemented with the virtual list ref
      console.log(`Scrolling to item ${id} at index ${index}`);
    }
  }, [visibleItems]);

  // Real-time control functions
  const enableRealtime = useCallback(() => {
    if (realtimeConfig && realtimeConfig.enabled !== false) {
      connectWs();
    }
  }, [connectWs, realtimeConfig]);

  const disableRealtime = useCallback(() => {
    disconnectWs();
  }, [disconnectWs]);

  const reconnectRealtime = useCallback(() => {
    disconnectWs();
    setTimeout(connectWs, 1000);
  }, [connectWs, disconnectWs]);

  // Virtual list props
  const virtualListProps = {
    items: visibleItems,
    itemHeight,
    onEndReached: loadMore,
    onItemVisible: useCallback((item: TimelineEntry, index: number) => {
      // Track item visibility for analytics or performance
    }, []),
    onItemHidden: useCallback((item: TimelineEntry, index: number) => {
      // Track item visibility for analytics or performance
    }, []),
  };

  // Auto-refresh
  useEffect(() => {
    if (!state.layout.autoRefresh || !onLoadMore) return;

    const interval = setInterval(() => {
      refresh();
    }, state.layout.refreshInterval);

    return () => clearInterval(interval);
  }, [state.layout.autoRefresh, state.layout.refreshInterval, refresh, onLoadMore]);

  // Auto-connect real-time updates when enabled
  useEffect(() => {
    if (realtimeConfig?.enabled !== false && realtimeConfig?.url && state.layout.autoRefresh) {
      enableRealtime();
    } else {
      disableRealtime();
    }
  }, [realtimeConfig, state.layout.autoRefresh, enableRealtime, disableRealtime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Derived state
  const selectedItem = state.selectedItems.size === 1
    ? getItemById(Array.from(state.selectedItems)[0])
    : null;

  const expandedItem = state.expandedItems.size === 1
    ? getItemById(Array.from(state.expandedItems)[0])
    : null;

  const isLoading = state.loading;
  const hasMore = state.hasMore;
  const isEmpty = state.items.length === 0 && !isLoading;

  return {
    // State
    state,

    // Actions
    loadMore,
    refresh,
    selectItem,
    expandItem,
    filterItems,
    sortItems,
    searchItems,
    clearSelection,
    clearFilters,

    // Real-time actions
    enableRealtime,
    disableRealtime,
    reconnectRealtime,

    // Derived state
    visibleItems,
    selectedItem,
    expandedItem,
    isLoading,
    hasMore,
    isEmpty,

    // Virtual list props
    virtualListProps,

    // Utils
    getItemById,
    getItemsByIds,
    scrollToItem,
  };
}