import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  Image,
  Code,
  MessageSquare,
  Search,
  Settings,
  Database,
  Zap,
  DollarSign,
  Tag,
  User,
  Calendar,
  BarChart3
} from 'lucide-react';
import { TimelineItemProps, TimelineEntry } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

const statusIcons = {
  pending: Clock,
  running: RefreshCw,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertCircle,
  paused: PauseCircle,
  retrying: RefreshCw,
};

const statusColors = {
  pending: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  running: 'text-blue-500 bg-blue-50 border-blue-200',
  completed: 'text-green-500 bg-green-50 border-green-200',
  failed: 'text-red-500 bg-red-50 border-red-200',
  cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
  paused: 'text-orange-500 bg-orange-50 border-orange-200',
  retrying: 'text-purple-500 bg-purple-50 border-purple-200',
};

const typeIcons = {
  chat: MessageSquare,
  search: Search,
  analysis: BarChart3,
  generation: Zap,
  processing: Database,
  export: Download,
  workflow: Settings,
  plugin: FileText,
  system: Settings,
};

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const priorityBadges = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  entry,
  isSelected = false,
  isExpanded = false,
  onSelect,
  onExpand,
  onAction,
  showDetails = false,
  compact = false,
  theme = 'light',
}) => {
  const [showActions, setShowActions] = useState(false);
  const [hovered, setHovered] = useState(false);

  const StatusIcon = statusIcons[entry.status];
  const TypeIcon = typeIcons[entry.type];

  const handleSelect = useCallback(() => {
    onSelect?.(entry.id);
  }, [entry.id, onSelect]);

  const handleExpand = useCallback(() => {
    onExpand?.(entry.id);
  }, [entry.id, onExpand]);

  const handleAction = useCallback((action: string) => {
    onAction?.(entry.id, action);
    setShowActions(false);
  }, [entry.id, onAction]);

  const formatDuration = useCallback((duration?: number) => {
    if (!duration) return '-';

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  const formatCost = useCallback((cost?: number) => {
    if (!cost) return '-';
    return `$${cost.toFixed(4)}`;
  }, []);

  const canShowActions = useMemo(() => {
    return entry.status !== 'completed' && entry.status !== 'failed';
  }, [entry.status]);

  const availableActions = useMemo(() => {
    const actions = [];

    if (entry.status === 'running' || entry.status === 'pending') {
      actions.push({ label: 'Cancel', value: 'cancel', icon: XCircle, variant: 'danger' as const });
    }

    if (entry.status === 'failed' || entry.status === 'cancelled') {
      actions.push({ label: 'Retry', value: 'retry', icon: RefreshCw, variant: 'default' as const });
    }

    if (entry.status === 'paused') {
      actions.push({ label: 'Resume', value: 'resume', icon: RefreshCw, variant: 'default' as const });
    }

    if (entry.artifacts && entry.artifacts.length > 0) {
      actions.push({ label: 'Download', value: 'download', icon: Download, variant: 'secondary' as const });
    }

    actions.push({ label: 'Delete', value: 'delete', icon: Trash2, variant: 'danger' as const });

    return actions;
  }, [entry.status, entry.artifacts]);

  const itemClasses = cn(
    'timeline-item relative transition-all duration-200 ease-in-out',
    'border rounded-lg cursor-pointer hover:shadow-md',
    isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200',
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white',
    compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
  );

  const headerClasses = cn(
    'flex items-start justify-between gap-3',
    compact ? 'text-sm' : 'text-base'
  );

  const statusBadgeClasses = cn(
    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
    statusColors[entry.status]
  );

  const priorityBadgeClasses = cn(
    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
    priorityBadges[entry.priority || 'medium']
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={itemClasses}
      onClick={handleSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className={headerClasses}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TypeIcon className={cn(
              'flex-shrink-0',
              compact ? 'w-4 h-4' : 'w-5 h-5',
              priorityColors[entry.priority || 'medium']
            )} />

            <div className="min-w-0 flex-1">
              <h3 className={cn(
                'font-medium truncate',
                theme === 'dark' ? 'text-white' : 'text-gray-900',
                compact ? 'text-sm' : 'text-base'
              )}>
                {entry.title}
              </h3>

              {entry.description && (
                <p className={cn(
                  'text-sm truncate',
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {entry.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Badge */}
            <div className={statusBadgeClasses}>
              <StatusIcon className="w-3 h-3" />
              <span className="capitalize">{entry.status}</span>
            </div>

            {/* Priority Badge */}
            {entry.priority && (
              <div className={priorityBadgeClasses}>
                <span className="capitalize">{entry.priority}</span>
              </div>
            )}

            {/* Actions Menu */}
            {canShowActions && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className={cn(
                    'p-1 rounded hover:bg-gray-100 transition-colors',
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  )}
                >
                  <MoreVertical className={cn(
                    'transition-transform',
                    showActions ? 'rotate-90' : '',
                    compact ? 'w-4 h-4' : 'w-5 h-5',
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  )} />
                </button>

                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        'absolute right-0 top-8 z-50 min-w-[150px] rounded-lg shadow-lg border',
                        'backdrop-blur-sm',
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      )}
                    >
                      {availableActions.map((action) => {
                        const ActionIcon = action.icon;
                        return (
                          <button
                            key={action.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(action.value);
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                              'hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg',
                              theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-700 hover:bg-gray-100',
                              action.variant === 'danger' && 'text-red-600 hover:bg-red-50'
                            )}
                          >
                            <ActionIcon className="w-4 h-4" />
                            <span className="text-sm">{action.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        {!compact && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className={cn(
                'w-4 h-4',
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )} />
              <span className={cn(
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>
                {format(entry.createdAt, 'MMM dd, yyyy HH:mm')}
              </span>
            </div>

            {entry.duration && (
              <div className="flex items-center gap-1">
                <Clock className={cn(
                  'w-4 h-4',
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )} />
                <span className={cn(
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {formatDuration(entry.duration)}
                </span>
              </div>
            )}

            {entry.cost && (
              <div className="flex items-center gap-1">
                <DollarSign className={cn(
                  'w-4 h-4',
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )} />
                <span className={cn(
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {formatCost(entry.cost)}
                </span>
              </div>
            )}

            {entry.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className={cn(
                  'w-4 h-4',
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )} />
                <span className={cn(
                  'truncate',
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {entry.tags.slice(0, 3).join(', ')}
                  {entry.tags.length > 3 && ` +${entry.tags.length - 3}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, compact ? 3 : 6).map((tag) => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > (compact ? 3 : 6) && (
              <span className={cn(
                'text-xs',
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )}>
                +{entry.tags.length - (compact ? 3 : 6)} more
              </span>
            )}
          </div>
        )}

        {/* Expand Button */}
        {(showDetails || (entry.artifacts && entry.artifacts.length > 0)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExpand();
            }}
            className={cn(
              'flex items-center gap-1 text-sm transition-colors',
              theme === 'dark'
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-blue-600 hover:text-blue-700'
            )}
          >
            <Eye className={cn(
              'w-4 h-4 transition-transform',
              isExpanded ? 'rotate-180' : ''
            )} />
            <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
          </button>
        )}

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 pt-3 border-t"
              style={{
                borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              }}
            >
              {/* Error Display */}
              {entry.error && (
                <div className={cn(
                  'p-3 rounded-lg',
                  theme === 'dark'
                    ? 'bg-red-900/20 border-red-800'
                    : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className={cn(
                        'font-medium text-sm',
                        theme === 'dark' ? 'text-red-400' : 'text-red-700'
                      )}>
                        {entry.error.code}
                      </p>
                      <p className={cn(
                        'text-sm mt-1',
                        theme === 'dark' ? 'text-red-300' : 'text-red-600'
                      )}>
                        {entry.error.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {entry.progress !== undefined && entry.progress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn(
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      Progress
                    </span>
                    <span className={cn(
                      'font-medium',
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      {entry.progress}%
                    </span>
                  </div>
                  <div className={cn(
                    'w-full rounded-full h-2',
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  )}>
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        entry.status === 'running'
                          ? 'bg-blue-500'
                          : entry.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-green-500'
                      )}
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Artifacts */}
              {entry.artifacts && entry.artifacts.length > 0 && (
                <div className="space-y-2">
                  <h4 className={cn(
                    'font-medium text-sm',
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    Artifacts ({entry.artifacts.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {entry.artifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border',
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        {artifact.type === 'image' && <Image className="w-4 h-4 text-blue-500" />}
                        {artifact.type === 'text' && <FileText className="w-4 h-4 text-green-500" />}
                        {artifact.type === 'code' && <Code className="w-4 h-4 text-purple-500" />}
                        {artifact.type === 'document' && <FileText className="w-4 h-4 text-orange-500" />}

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          )}>
                            {artifact.name}
                          </p>
                          <p className={cn(
                            'text-xs',
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          )}>
                            {artifact.size && `${(artifact.size / 1024).toFixed(1)} KB`}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('download-artifact');
                          }}
                          className={cn(
                            'p-1 rounded hover:bg-gray-200 transition-colors',
                            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                          )}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {Object.keys(entry.metadata).length > 0 && (
                <div className="space-y-2">
                  <h4 className={cn(
                    'font-medium text-sm',
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    Metadata
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(entry.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className={cn(
                          'font-medium',
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        )}>
                          {key}:
                        </span>
                        <span className={cn(
                          'truncate',
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        )}>
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TimelineItem;