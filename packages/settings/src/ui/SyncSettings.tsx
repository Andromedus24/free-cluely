// Sync Settings Component
// ========================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SettingsSection, SyncAdapter as SyncAdapterType, SyncStats } from '../types';

interface SyncSettingsProps {
  className?: string;
  onSyncUpdate?: (config: any) => void;
  onTestConnection?: (adapterName: string) => Promise<boolean>;
}

interface AdapterConfig {
  name: string;
  type: 'cloud' | 'filesystem' | 'websocket';
  enabled: boolean;
  priority: number;
  config: any;
  status?: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastSync?: Date;
  error?: string;
}

interface SyncConfig {
  autoSync: boolean;
  syncInterval: number;
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
  enableRealtimeSync: boolean;
  enableAutoBackup: boolean;
  backupInterval: number;
  maxBackupCount: number;
  syncOnStartup: boolean;
  syncOnNetworkChange: boolean;
  adapters: AdapterConfig[];
}

export function SyncSettings({ className = '', onSyncUpdate, onTestConnection }: SyncSettingsProps) {
  const [config, setConfig] = useState<SyncConfig>({
    autoSync: true,
    syncInterval: 300000, // 5 minutes
    conflictResolution: 'local-wins',
    enableRealtimeSync: true,
    enableAutoBackup: true,
    backupInterval: 3600000, // 1 hour
    maxBackupCount: 10,
    syncOnStartup: true,
    syncOnNetworkChange: true,
    adapters: [
      {
        name: 'local-filesystem',
        type: 'filesystem',
        enabled: true,
        priority: 1,
        config: {
          basePath: './settings',
          fileName: 'settings.json',
          autoCreatePath: true,
          fileFormat: 'json',
          compression: false,
          encryption: false,
          watchChanges: true
        }
      },
      {
        name: 'cloud-sync',
        type: 'cloud',
        enabled: false,
        priority: 2,
        config: {
          endpoint: 'https://api.example.com/settings',
          apiKey: '',
          compression: true,
          encryption: true,
          timeout: 30000
        }
      },
      {
        name: 'realtime-sync',
        type: 'websocket',
        enabled: false,
        priority: 3,
        config: {
          url: 'wss://api.example.com/sync',
          compression: false,
          encryption: true,
          heartbeatInterval: 30000
        }
      }
    ]
  });

  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSync: null,
    lastSuccess: null,
    lastFailure: null,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    bytesTransferred: 0,
    averageSyncTime: 0
  });

  const [selectedAdapter, setSelectedAdapter] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simulate sync status updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update adapter statuses randomly for demo
      setConfig(prev => ({
        ...prev,
        adapters: prev.adapters.map(adapter => ({
          ...adapter,
          status: adapter.enabled ? ['connected', 'disconnected', 'error'][Math.floor(Math.random() * 3)] as any : 'disconnected'
        }))
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (key: keyof SyncConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onSyncUpdate?.(newConfig);
  };

  const handleAdapterChange = (adapterName: string, key: string, value: any) => {
    const newConfig = {
      ...config,
      adapters: config.adapters.map(adapter =>
        adapter.name === adapterName ? { ...adapter, [key]: value } : adapter
      )
    };
    setConfig(newConfig);
    onSyncUpdate?.(newConfig);
  };

  const handleAdapterConfigChange = (adapterName: string, configKey: string, value: any) => {
    const newConfig = {
      ...config,
      adapters: config.adapters.map(adapter =>
        adapter.name === adapterName
          ? { ...adapter, config: { ...adapter.config, [configKey]: value } }
          : adapter
      )
    };
    setConfig(newConfig);
    onSyncUpdate?.(newConfig);
  };

  const handleTestConnection = async (adapterName: string) => {
    setIsTesting(true);
    try {
      const success = await onTestConnection?.(adapterName) || Math.random() > 0.3;

      if (success) {
        handleAdapterChange(adapterName, 'status', 'connected');
        handleAdapterChange(adapterName, 'error', undefined);
      } else {
        handleAdapterChange(adapterName, 'status', 'error');
        handleAdapterChange(adapterName, 'error', 'Connection failed');
      }
    } catch (error) {
      handleAdapterChange(adapterName, 'status', 'error');
      handleAdapterChange(adapterName, 'error', (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSyncStats(prev => ({
        ...prev,
        lastSync: new Date(),
        totalSyncs: prev.totalSyncs + 1,
        successfulSyncs: prev.successfulSyncs + 1
      }));

      // Update adapter last sync times
      setConfig(prev => ({
        ...prev,
        adapters: prev.adapters.map(adapter => ({
          ...adapter,
          lastSync: new Date()
        }))
      }));
    } catch (error) {
      setSyncStats(prev => ({
        ...prev,
        lastSync: new Date(),
        totalSyncs: prev.totalSyncs + 1,
        failedSyncs: prev.failedSyncs + 1
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  const addNewAdapter = (type: 'cloud' | 'filesystem' | 'websocket') => {
    const newAdapter: AdapterConfig = {
      name: `new-${type}-${Date.now()}`,
      type,
      enabled: false,
      priority: config.adapters.length + 1,
      config: getDefaultConfig(type)
    };

    setConfig(prev => ({
      ...prev,
      adapters: [...prev.adapters, newAdapter]
    }));
  };

  const removeAdapter = (adapterName: string) => {
    setConfig(prev => ({
      ...prev,
      adapters: prev.adapters.filter(adapter => adapter.name !== adapterName)
    }));
  };

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'cloud':
        return {
          endpoint: '',
          apiKey: '',
          compression: true,
          encryption: true,
          timeout: 30000
        };
      case 'filesystem':
        return {
          basePath: '',
          fileName: 'settings.json',
          autoCreatePath: true,
          fileFormat: 'json',
          compression: false,
          encryption: false,
          watchChanges: true
        };
      case 'websocket':
        return {
          url: '',
          compression: false,
          encryption: true,
          heartbeatInterval: 30000
        };
      default:
        return {};
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;

    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'connecting':
        return <Badge variant="outline">Connecting</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sync Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Monitor and manage settings synchronization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Last Sync</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(syncStats.lastSync)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Success Rate</div>
              <div className="text-sm text-muted-foreground">
                {syncStats.totalSyncs > 0
                  ? `${Math.round((syncStats.successfulSyncs / syncStats.totalSyncs) * 100)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Data Transferred</div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(syncStats.bytesTransferred)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center space-x-2"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  <span>Syncing...</span>
                </>
              ) : (
                <span>Sync Now</span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="adapters">Adapters</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Sync Settings</CardTitle>
              <CardDescription>Configure basic synchronization behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoSync">Auto Sync</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically sync settings at regular intervals
                  </div>
                </div>
                <Switch
                  id="autoSync"
                  checked={config.autoSync}
                  onCheckedChange={(checked) => handleConfigChange('autoSync', checked)}
                />
              </div>

              {config.autoSync && (
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">Sync Interval</Label>
                  <Select
                    value={config.syncInterval.toString()}
                    onValueChange={(value) => handleConfigChange('syncInterval', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60000">1 minute</SelectItem>
                      <SelectItem value="300000">5 minutes</SelectItem>
                      <SelectItem value="600000">10 minutes</SelectItem>
                      <SelectItem value="1800000">30 minutes</SelectItem>
                      <SelectItem value="3600000">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="conflictResolution">Conflict Resolution</Label>
                <Select
                  value={config.conflictResolution}
                  onValueChange={(value) => handleConfigChange('conflictResolution', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local-wins">Local Wins</SelectItem>
                    <SelectItem value="remote-wins">Remote Wins</SelectItem>
                    <SelectItem value="merge">Merge</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="realtimeSync">Real-time Sync</Label>
                  <div className="text-sm text-muted-foreground">
                    Sync settings immediately when they change
                  </div>
                </div>
                <Switch
                  id="realtimeSync"
                  checked={config.enableRealtimeSync}
                  onCheckedChange={(checked) => handleConfigChange('enableRealtimeSync', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="syncOnStartup">Sync on Startup</Label>
                  <div className="text-sm text-muted-foreground">
                    Sync settings when the application starts
                  </div>
                </div>
                <Switch
                  id="syncOnStartup"
                  checked={config.syncOnStartup}
                  onCheckedChange={(checked) => handleConfigChange('syncOnStartup', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="syncOnNetworkChange">Sync on Network Change</Label>
                  <div className="text-sm text-muted-foreground">
                    Sync settings when network status changes
                  </div>
                </div>
                <Switch
                  id="syncOnNetworkChange"
                  checked={config.syncOnNetworkChange}
                  onCheckedChange={(checked) => handleConfigChange('syncOnNetworkChange', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adapters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Adapters</CardTitle>
              <CardDescription>Manage settings storage and synchronization providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => addNewAdapter('cloud')}
                  className="flex-1"
                >
                  Add Cloud Adapter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => addNewAdapter('filesystem')}
                  className="flex-1"
                >
                  Add File System
                </Button>
                <Button
                  variant="outline"
                  onClick={() => addNewAdapter('websocket')}
                  className="flex-1"
                >
                  Add WebSocket
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {config.adapters.map((adapter) => (
                    <Card key={adapter.name}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={adapter.enabled}
                              onCheckedChange={(checked) =>
                                handleAdapterChange(adapter.name, 'enabled', checked)
                              }
                            />
                            <span className="font-medium">{adapter.name}</span>
                            <Badge variant="outline">{adapter.type}</Badge>
                            {getStatusBadge(adapter.status)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdapter(adapter.name)}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Input
                              type="number"
                              value={adapter.priority}
                              onChange={(e) =>
                                handleAdapterChange(adapter.name, 'priority', parseInt(e.target.value))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Sync</Label>
                            <div className="text-sm text-muted-foreground">
                              {adapter.lastSync ? formatDate(adapter.lastSync) : 'Never'}
                            </div>
                          </div>
                        </div>

                        {adapter.type === 'cloud' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Endpoint URL</Label>
                                <Input
                                  value={adapter.config.endpoint || ''}
                                  onChange={(e) =>
                                    handleAdapterConfigChange(adapter.name, 'endpoint', e.target.value)
                                  }
                                  placeholder="https://api.example.com/settings"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                  type="password"
                                  value={adapter.config.apiKey || ''}
                                  onChange={(e) =>
                                    handleAdapterConfigChange(adapter.name, 'apiKey', e.target.value)
                                  }
                                  placeholder="Enter API key"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {adapter.type === 'filesystem' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Base Path</Label>
                                <Input
                                  value={adapter.config.basePath || ''}
                                  onChange={(e) =>
                                    handleAdapterConfigChange(adapter.name, 'basePath', e.target.value)
                                  }
                                  placeholder="./settings"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>File Name</Label>
                                <Input
                                  value={adapter.config.fileName || ''}
                                  onChange={(e) =>
                                    handleAdapterConfigChange(adapter.name, 'fileName', e.target.value)
                                  }
                                  placeholder="settings.json"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {adapter.type === 'websocket' && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>WebSocket URL</Label>
                              <Input
                                value={adapter.config.url || ''}
                                onChange={(e) =>
                                  handleAdapterConfigChange(adapter.name, 'url', e.target.value)
                                }
                                placeholder="wss://api.example.com/sync"
                              />
                            </div>
                          </div>
                        )}

                        {adapter.error && (
                          <Alert variant="destructive">
                            <AlertDescription>{adapter.error}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => handleTestConnection(adapter.name)}
                          disabled={isTesting}
                          className="w-full"
                        >
                          {isTesting ? 'Testing...' : 'Test Connection'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Settings</CardTitle>
              <CardDescription>Configure automatic backup of settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBackup">Auto Backup</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically create backups of settings
                  </div>
                </div>
                <Switch
                  id="autoBackup"
                  checked={config.enableAutoBackup}
                  onCheckedChange={(checked) => handleConfigChange('enableAutoBackup', checked)}
                />
              </div>

              {config.enableAutoBackup && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backupInterval">Backup Interval</Label>
                    <Select
                      value={config.backupInterval.toString()}
                      onValueChange={(value) => handleConfigChange('backupInterval', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1800000">30 minutes</SelectItem>
                        <SelectItem value="3600000">1 hour</SelectItem>
                        <SelectItem value="7200000">2 hours</SelectItem>
                        <SelectItem value="21600000">6 hours</SelectItem>
                        <SelectItem value="86400000">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxBackupCount">Max Backups</Label>
                    <Input
                      type="number"
                      value={config.maxBackupCount}
                      onChange={(e) =>
                        handleConfigChange('maxBackupCount', parseInt(e.target.value))
                      }
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Advanced synchronization options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Retry Attempts</Label>
                    <Input
                      type="number"
                      value="3"
                      onChange={(e) => console.log('Retry attempts:', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Retry Delay (ms)</Label>
                    <Input
                      type="number"
                      value="5000"
                      onChange={(e) => console.log('Retry delay:', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      value="10"
                      onChange={(e) => console.log('Batch size:', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timeout (ms)</Label>
                    <Input
                      type="number"
                      value="30000"
                      onChange={(e) => console.log('Timeout:', e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compression</Label>
                    <div className="text-sm text-muted-foreground">
                      Compress data during transfer
                    </div>
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={(checked) => console.log('Compression:', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Encryption</Label>
                    <div className="text-sm text-muted-foreground">
                      Encrypt data during transfer
                    </div>
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={(checked) => console.log('Encryption:', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable debug logging for sync operations
                    </div>
                  </div>
                  <Switch
                    checked={false}
                    onCheckedChange={(checked) => console.log('Debug mode:', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}