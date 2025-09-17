import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { TimelineHeaderProps } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  title = 'Timeline',
  subtitle,
  actions = [],
  stats,
  loading = false,
}) => {
  const completionRate = stats ? Math.round((stats.completed / stats.total) * 100) : 0;
  const failureRate = stats ? Math.round((stats.failed / stats.total) * 100) : 0;

  const getVariantClasses = (variant: 'default' | 'primary' | 'secondary' | 'danger') => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'secondary':
        return 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              {loading && (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              )}
            </div>

            {subtitle && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}

            {/* Stats */}
            {stats && (
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {/* Total */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total: <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span>
                  </span>
                </div>

                {/* Completed */}
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Completed: <span className="font-medium text-green-600 dark:text-green-400">{stats.completed}</span>
                  </span>
                </div>

                {/* Failed */}
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Failed: <span className="font-medium text-red-600 dark:text-red-400">{stats.failed}</span>
                  </span>
                </div>

                {/* Running */}
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Running: <span className="font-medium text-blue-600 dark:text-blue-400">{stats.running}</span>
                  </span>
                </div>

                {/* Completion Rate */}
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn(
                    'w-4 h-4',
                    completionRate >= 80 ? 'text-green-500' :
                    completionRate >= 60 ? 'text-yellow-500' : 'text-red-500'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    completionRate >= 80 ? 'text-green-600 dark:text-green-400' :
                    completionRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {completionRate}% complete
                  </span>
                </div>

                {/* Warning */}
                {failureRate > 20 && stats.total > 10 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      High failure rate ({failureRate}%)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    getVariantClasses(action.variant)
                  )}
                >
                  {action.icon && (
                    <action.icon className="w-4 h-4" />
                  )}
                  {action.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TimelineHeader;