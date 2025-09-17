import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineVirtualListProps, TimelineEntry } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

export const TimelineVirtualList: React.FC<TimelineVirtualListProps> = ({
  items,
  itemHeight,
  renderItem,
  onEndReached,
  onItemVisible,
  onItemHidden,
  overscanCount = 5,
  className,
  style,
}) => {
  const listRef = useRef<List>(null);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemHeights = useRef<Map<number, number>>(new Map());
  const lastLoadTime = useRef<number>(0);

  // Calculate estimated item height
  const estimatedItemHeight = useMemo(() => {
    if (items.length === 0) return itemHeight;
    const totalHeight = Array.from(itemHeights.current.values()).reduce((sum, h) => sum + h, 0);
    const measuredCount = itemHeights.current.size;
    return measuredCount > 0 ? totalHeight / measuredCount : itemHeight;
  }, [items.length, itemHeight]);

  // Handle item height measurement
  const setItemHeight = useCallback((index: number, height: number) => {
    itemHeights.current.set(index, height);

    // Update list if height changes significantly
    if (listRef.current) {
      const currentHeight = itemHeights.current.get(index) || itemHeight;
      if (Math.abs(height - currentHeight) > 5) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, [itemHeight]);

  // Handle infinite loading
  const isItemLoaded = useCallback((index: number) => {
    return index < items.length;
  }, [items.length]);

  const loadMoreItems = useCallback(() => {
    const now = Date.now();
    // Debounce loading to prevent rapid calls
    if (now - lastLoadTime.current < 1000) return Promise.resolve();

    lastLoadTime.current = now;
    onEndReached?.();
    return Promise.resolve();
  }, [onEndReached]);

  // Handle item visibility
  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex }: {
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    const newVisibleItems = new Set<number>();

    for (let i = visibleStartIndex; i <= visibleStopIndex; i++) {
      if (i < items.length) {
        newVisibleItems.add(i);

        // Notify about newly visible items
        if (!visibleItems.has(i)) {
          onItemVisible?.(items[i], i);
        }
      }
    }

    // Notify about newly hidden items
    visibleItems.forEach(index => {
      if (!newVisibleItems.has(index) && index < items.length) {
        onItemHidden?.(items[index], index);
      }
    });

    setVisibleItems(newVisibleItems);
  }, [items, visibleItems, onItemVisible, onItemHidden]);

  // Row renderer with measurement
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    if (!item) return null;

    const [ref, inView] = useInView({
      threshold: 0.1,
      triggerOnce: false,
      delay: 100,
    });

    useEffect(() => {
      if (inView && ref.current) {
        const height = ref.current.getBoundingClientRect().height;
        setItemHeight(index, height);
      }
    }, [inView, index, setItemHeight]);

    return (
      <div
        ref={ref}
        style={{
          ...style,
          height: 'auto',
          minHeight: itemHeight,
        }}
        className={cn(
          'timeline-virtual-item',
          'transition-all duration-200 ease-in-out',
          inView ? 'opacity-100' : 'opacity-0'
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderItem(item, index)}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }, [items, itemHeight, renderItem, setItemHeight]);

  // Get item height for variable sizing
  const getItemHeight = useCallback((index: number) => {
    return itemHeights.current.get(index) || estimatedItemHeight;
  }, [estimatedItemHeight]);

  // Scroll to item function
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, align);
    }
  }, []);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, []);

  // Expose scroll functions via ref
  React.useImperativeHandle(ref, () => ({
    scrollToItem,
    scrollToTop,
    resetItemHeights: () => {
      itemHeights.current.clear();
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    },
  }));

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No items to display</p>
          <p className="text-sm">Try adjusting your filters or search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full', className)} style={style}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={items.length + 1}
            loadMoreItems={loadMoreItems}
            threshold={10}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={(list) => {
                  ref(list);
                  if (list) listRef.current = list;
                }}
                width={width}
                height={height}
                itemCount={items.length}
                itemSize={getItemHeight}
                onItemsRendered={(props) => {
                  onItemsRendered(props);
                  handleItemsRendered({
                    visibleStartIndex: props.visibleStartIndex,
                    visibleStopIndex: props.visibleStopIndex,
                  });
                }}
                overscanCount={overscanCount}
                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
              >
                {Row}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
};

// Forward ref for imperative access
const TimelineVirtualListWithRef = React.forwardRef<
  {
    scrollToItem: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
    scrollToTop: () => void;
    resetItemHeights: () => void;
  },
  TimelineVirtualListProps
>((props, ref) => {
  const listRef = useRef<any>(null);

  React.useImperativeHandle(ref, () => ({
    scrollToItem: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => {
      listRef.current?.scrollToItem?.(index, align);
    },
    scrollToTop: () => {
      listRef.current?.scrollToTop?.();
    },
    resetItemHeights: () => {
      listRef.current?.resetItemHeights?.();
    },
  }));

  return <TimelineVirtualList {...props} ref={listRef} />;
});

TimelineVirtualListWithRef.displayName = 'TimelineVirtualList';

export default TimelineVirtualListWithRef;