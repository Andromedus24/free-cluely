import { TimelineEntry, TimelineFilter, TimelineSort, JobType, JobStatus, Priority } from '@atlas/timeline';

export interface TimelineUIConfig {
  virtualized?: boolean;
  itemHeight?: number;
  bufferSize?: number;
  enableAnimations?: boolean;
  enableRealtime?: boolean;
  enableKeyboardShortcuts?: boolean;
  showHeader?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showExport?: boolean;
  showAnalytics?: boolean;
  defaultSort?: TimelineSort;
  defaultFilter?: TimelineFilter;
  maxItemsPerPage?: number;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  density?: 'compact' | 'normal' | 'spacious';
}

export interface TimelineItemProps {
  entry: TimelineEntry;
  isSelected?: boolean;
  isExpanded?: boolean;
  onSelect?: (id: string) => void;
  onExpand?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  showDetails?: boolean;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

export interface TimelineHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: Array<{
    label: string;
    icon?: string;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'secondary' | 'danger';
  }>;
  stats?: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  };
  loading?: boolean;
}

export interface TimelineFilterProps {
  filters: TimelineFilter;
  onFiltersChange: (filters: TimelineFilter) => void;
  availableTypes?: JobType[];
  availableStatuses?: JobStatus[];
  availablePriorities?: Priority[];
  availableTags?: string[];
  compact?: boolean;
}

export interface TimelineSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  showFilters?: boolean;
  compact?: boolean;
}

export interface TimelineVirtualListProps {
  items: TimelineEntry[];
  itemHeight: number;
  renderItem: (item: TimelineEntry, index: number) => React.ReactNode;
  onEndReached?: () => void;
  onItemVisible?: (item: TimelineEntry, index: number) => void;
  onItemHidden?: (item: TimelineEntry, index: number) => void;
  overscanCount?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface TimelineExportProps {
  onExport: (format: string, options: any) => void;
  availableFormats?: string[];
  loading?: boolean;
  compact?: boolean;
}

export interface TimelineAnalyticsProps {
  analytics: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDuration: number;
    totalCost: number;
    jobsByType: Record<JobType, number>;
    jobsByStatus: Record<JobStatus, number>;
    jobsByDay: Array<{ date: string; count: number }>;
    topTags: Array<{ tag: string; count: number }>;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  compact?: boolean;
}

export interface TimelineKeyboardShortcuts {
  enabled: boolean;
  shortcuts: Array<{
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
    action: string;
    description: string;
    category: 'navigation' | 'selection' | 'actions' | 'filters';
  }>;
  onShortcut?: (shortcut: string) => void;
}

export interface TimelineTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    textDisabled: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

export interface TimelineLayout {
  mode: 'list' | 'grid' | 'kanban' | 'calendar';
  density: 'compact' | 'normal' | 'spacious';
  sortBy: TimelineSort;
  groupBy?: 'type' | 'status' | 'date' | 'priority' | 'none';
  showArtifacts: boolean;
  showMetadata: boolean;
  showActions: boolean;
  virtualized: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface TimelineState {
  items: TimelineEntry[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  filters: TimelineFilter;
  sort: TimelineSort;
  searchQuery: string;
  selectedItems: Set<string>;
  expandedItems: Set<string>;
  layout: TimelineLayout;
  analytics: any;
  realTimeUpdates: boolean;
  lastUpdated: Date;
}