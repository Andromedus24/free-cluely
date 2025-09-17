import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Eye,
  Copy,
  Share2,
  MoreVertical,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  FileText,
  Image,
  Code,
  Video,
  Audio,
  Archive,
  Database,
  MessageSquare,
  Search,
  BarChart3,
  Zap,
  Settings,
  Tag,
  User,
  Calendar,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';

import { TimelineEntry, Artifact, JobError } from '@atlas/timeline';
import { cn } from '../utils/cn';

interface TimelineJobModalProps {
  job: TimelineEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (jobId: string, action: string) => void;
  onDownloadArtifact?: (artifact: Artifact) => void;
  onViewArtifact?: (artifact: Artifact) => void;
  showActions?: boolean;
  theme?: 'light' | 'dark';
}

interface ArtifactViewerProps {
  artifact: Artifact;
  onView: (artifact: Artifact) => void;
  onDownload: (artifact: Artifact) => void;
  theme?: 'light' | 'dark';
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  onView,
  onDownload,
  theme = 'light'
}) => {
  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'code': return <Code className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Audio className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      case 'archive': return <Archive className="w-5 h-5" />;
      case 'data': return <Database className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getArtifactColor = (type: string) => {
    switch (type) {
      case 'image': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'text': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'code': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
      case 'video': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'audio': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    )}>
      <div className={cn('p-2 rounded-lg', getArtifactColor(artifact.type))}>
        {getArtifactIcon(artifact.type)}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {artifact.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span className="uppercase">{artifact.type}</span>
          {artifact.size && (
            <>
              <span>•</span>
              <span>{formatFileSize(artifact.size)}</span>
            </>
          )}
          {artifact.mimeType && (
            <>
              <span>•</span>
              <span className="truncate">{artifact.mimeType}</span>
            </>
          )}
        </div>
        {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(artifact.metadata).slice(0, 3).map(([key, value]) => (
              <span
                key={key}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
              >
                {key}: {String(value)}
              </span>
            ))}
            {Object.keys(artifact.metadata).length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{Object.keys(artifact.metadata).length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onView(artifact)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
          )}
          title="View artifact"
        >
          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => onDownload(artifact)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
          )}
          title="Download artifact"
        >
          <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
};

const TimelineJobModal: React.FC<TimelineJobModalProps> = ({
  job,
  isOpen,
  onClose,
  onAction,
  onDownloadArtifact,
  onViewArtifact,
  showActions = true,
  theme = 'light'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'artifacts' | 'metadata' | 'logs'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, []);

  const handleAction = useCallback((action: string) => {
    if (job) {
      onAction?.(job.id, action);
    }
  }, [job, onAction]);

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatCost = (cost?: number) => {
    if (!cost) return '-';
    return `$${cost.toFixed(6)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'paused': return <Pause className="w-5 h-5 text-orange-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'paused': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getAvailableActions = () => {
    if (!job) return [];

    const actions = [];

    if (job.status === 'running' || job.status === 'pending') {
      actions.push({
        label: 'Cancel',
        value: 'cancel',
        icon: XCircle,
        variant: 'danger' as const,
        color: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
      });
    }

    if (job.status === 'failed' || job.status === 'cancelled') {
      actions.push({
        label: 'Retry',
        value: 'retry',
        icon: RefreshCw,
        variant: 'default' as const,
        color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
      });
    }

    if (job.status === 'paused') {
      actions.push({
        label: 'Resume',
        value: 'resume',
        icon: Play,
        variant: 'default' as const,
        color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
      });
    }

    actions.push({
      label: 'Delete',
      value: 'delete',
      icon: Trash2,
      variant: 'danger' as const,
      color: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
    });

    return actions;
  };

  if (!job || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          'relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4 flex-1">
            {/* Status Icon */}
            <div className={cn('p-3 rounded-lg', getStatusColor(job.status))}>
              {getStatusIcon(job.status)}
            </div>

            {/* Job Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                    {job.title}
                  </h2>
                  {job.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {showActions && getAvailableActions().length > 0 && (
                  <div className="flex items-center gap-2">
                    {getAvailableActions().map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleAction(action.value)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          action.color
                        )}
                        title={action.label}
                      >
                        <action.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">ID:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">{job.id}</span>
                  <button
                    onClick={() => handleCopy(job.id, 'id')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {copiedField === 'id' && (
                    <span className="text-green-600 dark:text-green-400 text-xs">Copied!</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{job.type}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">Priority:</span>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium capitalize',
                    job.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                    job.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                    job.priority === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {job.priority}
                  </span>
                </div>

                {job.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatDuration(job.duration)}
                    </span>
                  </div>
                )}

                {job.cost && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatCost(job.cost)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'artifacts', label: `Artifacts${job.artifacts?.length ? ` (${job.artifacts.length})` : ''}`, icon: Database },
            { key: 'metadata', label: 'Metadata', icon: Settings },
            { key: 'logs', label: 'Logs', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Timeline</h3>
                <div className="space-y-3">
                  <TimelineEvent
                    icon={<Calendar className="w-4 h-4" />}
                    title="Created"
                    time={job.createdAt}
                    description="Job was created and added to queue"
                  />
                  {job.startedAt && (
                    <TimelineEvent
                      icon={<Play className="w-4 h-4" />}
                      title="Started"
                      time={job.startedAt}
                      description="Job execution began"
                    />
                  )}
                  {job.completedAt && (
                    <TimelineEvent
                      icon={job.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      title={job.status === 'completed' ? 'Completed' : 'Failed'}
                      time={job.completedAt}
                      description={job.status === 'completed' ? 'Job finished successfully' : 'Job failed to complete'}
                    />
                  )}
                </div>
              </div>

              {/* Resource Usage */}
              {job.resourceUsage && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resource Usage</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResourceMetric
                      icon={<Cpu className="w-5 h-5" />}
                      label="CPU"
                      value={job.resourceUsage.cpu ? `${job.resourceUsage.cpu}%` : '-'}
                    />
                    <ResourceMetric
                      icon={<HardDrive className="w-5 h-5" />}
                      label="Memory"
                      value={job.resourceUsage.memory ? `${job.resourceUsage.memory}MB` : '-'}
                    />
                    <ResourceMetric
                      icon={<Wifi className="w-5 h-5" />}
                      label="Network"
                      value={job.resourceUsage.networkRequests ? `${job.resourceUsage.networkRequests} reqs` : '-'}
                    />
                    <ResourceMetric
                      icon={<Activity className="w-5 h-5" />}
                      label="Tokens"
                      value={job.resourceUsage.tokens ? `${job.resourceUsage.tokens}` : '-'}
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              {job.tags.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        )}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {job.error && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Error Details</h3>
                  <div className={cn(
                    'p-4 rounded-lg border',
                    theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                  )}>
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-red-800 dark:text-red-400">
                            {job.error.code}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-300">
                            {format(job.error.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-red-700 dark:text-red-300 text-sm">
                          {job.error.message}
                        </p>
                        {job.error.stack && (
                          <details className="mt-3">
                            <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                              View stack trace
                            </summary>
                            <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto">
                              {job.error.stack}
                            </pre>
                          </details>
                        )}
                        {job.error.context && Object.keys(job.error.context).length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Context:</h4>
                            <div className="text-xs">
                              {Object.entries(job.error.context).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-red-600 dark:text-red-400">{key}:</span>
                                  <span className="text-red-700 dark:text-red-300">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Artifacts Tab */}
          {activeTab === 'artifacts' && (
            <div className="p-6">
              {job.artifacts && job.artifacts.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Artifacts ({job.artifacts.length})
                    </h3>
                    <button
                      onClick={() => {
                        job.artifacts?.forEach(artifact => onDownloadArtifact?.(artifact));
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                        'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      <Download className="w-4 h-4" />
                      Download All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {job.artifacts.map((artifact) => (
                      <ArtifactViewer
                        key={artifact.id}
                        artifact={artifact}
                        onView={onViewArtifact || (() => {})}
                        onDownload={onDownloadArtifact || (() => {})}
                        theme={theme}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Artifacts
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This job doesn't have any associated artifacts.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <div className="p-6">
              {Object.keys(job.metadata).length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Job Metadata
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(job.metadata).map(([key, value]) => (
                      <div
                        key={key}
                        className={cn(
                          'p-3 rounded-lg border',
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-all">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(String(value), key)}
                            className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Copy value"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Metadata
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This job doesn't have any metadata associated with it.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Execution Logs
                </h3>
                <div className={cn(
                  'p-4 rounded-lg font-mono text-sm space-y-2 max-h-96 overflow-y-auto',
                  theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
                )}>
                  <div className="text-green-600 dark:text-green-400">
                    [{format(job.createdAt, 'yyyy-MM-dd HH:mm:ss.SSS')}] INFO: Job created
                  </div>
                  {job.startedAt && (
                    <div className="text-blue-600 dark:text-blue-400">
                      [{format(job.startedAt, 'yyyy-MM-dd HH:mm:ss.SSS')}] INFO: Job started execution
                    </div>
                  )}
                  <div className="text-yellow-600 dark:text-yellow-400">
                    [{format(job.createdAt, 'yyyy-MM-dd HH:mm:ss.SSS')}] DEBUG: Initializing job resources
                  </div>
                  <div className="text-yellow-600 dark:text-yellow-400">
                    [{format(job.createdAt, 'yyyy-MM-dd HH:mm:ss.SSS')}] DEBUG: Loading input data
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    [{format(job.createdAt, 'yyyy-MM-dd HH:mm:ss.SSS')}] INFO: Processing job with type: {job.type}
                  </div>
                  {job.progress !== undefined && job.progress < 100 && (
                    <div className="text-blue-600 dark:text-blue-400">
                      [{format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')}] INFO: Progress: {job.progress}%
                    </div>
                  )}
                  {job.completedAt && (
                    <div className={job.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      [{format(job.completedAt, 'yyyy-MM-dd HH:mm:ss.SSS')}] {job.status === 'completed' ? 'INFO' : 'ERROR'}: Job {job.status}
                    </div>
                  )}
                  {job.error && (
                    <div className="text-red-600 dark:text-red-400">
                      [{format(job.error.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}] ERROR: {job.error.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {format(job.updatedAt, 'MMM dd, yyyy HH:mm:ss')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(JSON.stringify(job, null, 2), 'job')}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="w-4 h-4" />
              {copiedField === 'job' ? 'Copied!' : 'Copy Job Data'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper Components
const TimelineEvent: React.FC<{
  icon: React.ReactNode;
  title: string;
  time: Date;
  description: string;
}> = ({ icon, title, time, description }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {format(time, 'MMM dd, yyyy HH:mm:ss')}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
    </div>
  </div>
);

const ResourceMetric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className={cn(
    'flex items-center gap-3 p-3 rounded-lg border',
    'border-gray-200 dark:border-gray-700'
  )}>
    <div className="text-blue-600 dark:text-blue-400">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default TimelineJobModal;