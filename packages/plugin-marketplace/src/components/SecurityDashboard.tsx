import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  BarChart3,
  Eye,
  Ban,
  Settings,
  RefreshCw,
  Download,
  FileText,
  UserCheck,
  Lock,
  Unlock,
  Virus,
  Database,
  Wifi,
  HardDrive,
  Cpu
} from 'lucide-react';
import { cn } from '../utils/cn';
import { SecurityEvent, SecurityScan, SecurityPolicy } from '../services/SecurityMonitor';

export interface SecurityDashboardProps {
  className?: string;
  theme?: 'light' | 'dark';
  onQuarantineAction?: (pluginId: string, action: 'quarantine' | 'release') => void;
  onPolicyUpdate?: (pluginId: string, policy: Partial<SecurityPolicy>) => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  className,
  theme = 'light',
  onQuarantineAction,
  onPolicyUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'scans' | 'policies' | 'quarantine'>('overview');
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);

  // Mock data
  const [securityStats, setSecurityStats] = useState({
    totalPlugins: 24,
    quarantinedPlugins: 2,
    activeScans: 1,
    securityEvents: {
      total: 156,
      last24h: 12,
      bySeverity: { critical: 3, high: 15, medium: 42, low: 96 }
    },
    averageSecurityScore: 87.5
  });

  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'code_injection',
      pluginId: 'malicious-plugin',
      severity: 'critical',
      message: 'Eval function detected in plugin code',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      metadata: { line: 45, pattern: 'eval(' },
      action: 'quarantine'
    },
    {
      id: '2',
      type: 'file_access',
      pluginId: 'file-explorer',
      severity: 'high',
      message: 'Attempted access to restricted directory',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      metadata: { path: '/etc/passwd' },
      action: 'block'
    },
    {
      id: '3',
      type: 'network_access',
      pluginId: 'network-tool',
      severity: 'medium',
      message: 'Unauthorized network connection attempt',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      metadata: { domain: 'suspicious-site.com' },
      action: 'warn'
    }
  ]);

  const [quarantinedPlugins, setQuarantinedPlugins] = useState([
    {
      id: 'malicious-plugin',
      name: 'Malicious Plugin',
      quarantineDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
      reason: 'Code injection detected',
      severity: 'critical',
      lastSecurityScan: {
        score: 25,
        vulnerabilities: 8,
        scanDate: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    },
    {
      id: 'suspicious-extension',
      name: 'Suspicious Extension',
      quarantineDate: new Date(Date.now() - 1000 * 60 * 60 * 5),
      reason: 'Multiple security violations',
      severity: 'high',
      lastSecurityScan: {
        score: 45,
        vulnerabilities: 5,
        scanDate: new Date(Date.now() - 1000 * 60 * 60 * 5)
      }
    }
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Update data
    } catch (error) {
      console.error('Failed to refresh security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Security Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={cn(
          'p-4 rounded-lg',
          theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Security Score</p>
              <p className="text-2xl font-bold text-green-600">{securityStats.averageSecurityScore}</p>
            </div>
            <Shield className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-lg',
          theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Events</p>
              <p className="text-2xl font-bold text-orange-600">{securityStats.securityEvents.last24h}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-lg',
          theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quarantined</p>
              <p className="text-2xl font-bold text-red-600">{securityStats.quarantinedPlugins}</p>
            </div>
            <Ban className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-lg',
          theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Plugins</p>
              <p className="text-2xl font-bold text-blue-600">{securityStats.totalPlugins}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Security Events by Severity */}
      <div className={cn(
        'p-6 rounded-lg',
        theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
      )}>
        <h3 className="text-lg font-semibold mb-4">Security Events by Severity</h3>
        <div className="space-y-3">
          {Object.entries(securityStats.securityEvents.bySeverity).map(([severity, count]) => (
            <div key={severity} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getSeverityIcon(severity)}
                <span className="capitalize">{severity}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      severity === 'critical' ? 'bg-red-500' :
                      severity === 'high' ? 'bg-orange-500' :
                      severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${(count / securityStats.securityEvents.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Security Events */}
      <div className={cn(
        'p-6 rounded-lg',
        theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Security Events</h3>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="space-y-3">
          {recentEvents.slice(0, 5).map(event => (
            <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className={cn(
                'p-1 rounded',
                getSeverityColor(event.severity)
              )}>
                {getSeverityIcon(event.severity)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{event.pluginId}</p>
                  <span className="text-xs text-gray-500">{formatTimeAgo(event.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full capitalize',
                    getSeverityColor(event.severity)
                  )}>
                    {event.severity}
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full capitalize',
                    event.action === 'quarantine' ? 'text-red-600 bg-red-100 dark:bg-red-900/20' :
                    event.action === 'block' ? 'text-orange-600 bg-orange-100 dark:bg-orange-900/20' :
                    event.action === 'warn' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20' :
                    'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
                  )}>
                    {event.action}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderQuarantine = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quarantined Plugins</h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {quarantinedPlugins.length} plugins quarantined
        </span>
      </div>

      <div className="space-y-4">
        {quarantinedPlugins.map(plugin => (
          <div key={plugin.id} className={cn(
            'p-6 rounded-lg border',
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold">{plugin.name}</h4>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full capitalize',
                    getSeverityColor(plugin.severity)
                  )}>
                    {plugin.severity}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{plugin.reason}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Quarantined:</span>
                    <span className="ml-2">{formatTimeAgo(plugin.quarantineDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Security Score:</span>
                    <span className="ml-2 font-medium">{plugin.lastSecurityScan.score}/100</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Vulnerabilities:</span>
                    <span className="ml-2">{plugin.lastSecurityScan.vulnerabilities}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Last Scan:</span>
                    <span className="ml-2">{formatTimeAgo(plugin.lastSecurityScan.scanDate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => onQuarantineAction?.(plugin.id, 'release')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  )}
                >
                  <Unlock className="w-4 h-4 inline mr-1" />
                  Release
                </button>
                <button
                  onClick={() => setSelectedPlugin(plugin.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {quarantinedPlugins.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Quarantined Plugins</h3>
          <p className="text-gray-600 dark:text-gray-400">
            All plugins are secure and operating normally.
          </p>
        </div>
      )}
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Security Policies</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Settings className="w-4 h-4 inline mr-1" />
          Configure
        </button>
      </div>

      <div className="space-y-4">
        <div className={cn(
          'p-6 rounded-lg border',
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        )}>
          <h4 className="font-semibold mb-4">Default Security Policy</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Blocked Modules
              </h5>
              <div className="space-y-2">
                {['child_process', 'fs', 'net', 'http', 'https'].map(module => (
                  <div key={module} className="flex items-center gap-2 text-sm">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span>{module}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Resource Limits
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Memory Limit:</span>
                  <span>50 MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution Timeout:</span>
                  <span>5 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Access:</span>
                  <span className="text-red-500">Blocked</span>
                </div>
                <div className="flex justify-between">
                  <span>File System Access:</span>
                  <span className="text-red-500">Blocked</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Quarantine Rules
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auto-quarantine on critical violations:</span>
                <span className="text-green-500">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span>Alert threshold:</span>
                <span>3 violations in 24h</span>
              </div>
              <div className="flex justify-between">
                <span>Security scan frequency:</span>
                <span>Every 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('w-full max-w-7xl mx-auto p-6', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and manage plugin security
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              securityStats.quarantinedPlugins > 0
                ? 'text-red-600 bg-red-100 dark:bg-red-900/20'
                : 'text-green-600 bg-green-100 dark:bg-green-900/20'
            )}>
              {securityStats.quarantinedPlugins > 0 ? 'Security Alert' : 'All Secure'}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              )}
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b dark:border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'events', label: 'Events', icon: Activity },
          { id: 'quarantine', label: 'Quarantine', icon: Ban },
          { id: 'policies', label: 'Policies', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors',
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'quarantine' && renderQuarantine()}
          {activeTab === 'policies' && renderPolicies()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SecurityDashboard;