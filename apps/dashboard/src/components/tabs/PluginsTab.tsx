'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  Plus,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  status: 'running' | 'stopped' | 'error' | 'installing';
  permissions: string[];
  memory: number;
  lastActive: number;
  config?: Record<string, unknown>;
}

export function PluginsTab() {
  const [plugins, setPlugins] = useState<Plugin[]>([
    {
      id: 'puppeteer-worker',
      name: 'Puppeteer Worker',
      version: '1.0.0',
      description: 'Browser automation plugin for web scraping and testing',
      author: 'Free-Cluely Team',
      enabled: true,
      status: 'running',
      permissions: ['automation', 'network'],
      memory: 45.2,
      lastActive: Date.now() - 300000,
      config: {
        headless: true,
        timeout: 30000
      }
    },
    {
      id: 'vision-service',
      name: 'Vision Service',
      version: '1.0.0',
      description: 'AI-powered image analysis and text extraction',
      author: 'Free-Cluely Team',
      enabled: true,
      status: 'running',
      permissions: ['screen', 'network'],
      memory: 23.8,
      lastActive: Date.now() - 120000,
      config: {
        model: 'gemini-pro-vision',
        confidence: 0.8
      }
    },
    {
      id: 'clipboard-manager',
      name: 'Clipboard Manager',
      version: '0.9.0',
      description: 'Enhanced clipboard with history and formatting',
      author: 'Community',
      enabled: false,
      status: 'stopped',
      permissions: ['clipboard'],
      memory: 0,
      lastActive: Date.now() - 86400000,
      config: {
        historySize: 100,
        formatOnPaste: true
      }
    }
  ]);

  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const togglePlugin = (pluginId: string) => {
    setPlugins(prev => prev.map(plugin => 
      plugin.id === pluginId 
        ? { 
            ...plugin, 
            enabled: !plugin.enabled,
            status: plugin.enabled ? 'stopped' : 'running'
          }
        : plugin
    ));
  };

  const uninstallPlugin = (pluginId: string) => {
    setPlugins(prev => prev.filter(plugin => plugin.id !== pluginId));
    if (selectedPlugin?.id === pluginId) {
      setSelectedPlugin(null);
    }
  };

  const getStatusIcon = (status: Plugin['status']) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stopped':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'installing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Plugin['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'installing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMemory = (mb: number) => {
    if (mb === 0) return '0 MB';
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatLastActive = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plugins</h2>
          <p className="text-muted-foreground">
            Manage and configure application plugins
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Install Plugin
        </Button>
      </div>

      <Tabs defaultValue="installed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plugin List */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Installed Plugins</CardTitle>
                  <CardDescription>
                    {plugins.filter(p => p.enabled).length} active, {plugins.length} total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {plugins.map((plugin) => (
                        <div
                          key={plugin.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedPlugin?.id === plugin.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedPlugin(plugin)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{plugin.name}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {plugin.version}
                                </Badge>
                                <Badge className={getStatusColor(plugin.status)}>
                                  {plugin.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {plugin.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>by {plugin.author}</span>
                                <span>•</span>
                                <span>{formatMemory(plugin.memory)}</span>
                                <span>•</span>
                                <span>{formatLastActive(plugin.lastActive)}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {plugin.permissions.map((permission) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={plugin.enabled}
                                onCheckedChange={() => togglePlugin(plugin.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  uninstallPlugin(plugin.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Plugin Details */}
            <div className="space-y-4">
              {selectedPlugin ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(selectedPlugin.status)}
                        {selectedPlugin.name}
                      </CardTitle>
                      <Badge variant="secondary">{selectedPlugin.version}</Badge>
                    </div>
                    <CardDescription>{selectedPlugin.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Actions</h4>
                      <div className="flex gap-2">
                        <Button
                          variant={selectedPlugin.enabled ? "destructive" : "default"}
                          size="sm"
                          onClick={() => togglePlugin(selectedPlugin.id)}
                        >
                          {selectedPlugin.enabled ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Resource Usage</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Memory</span>
                          <span>{formatMemory(selectedPlugin.memory)}</span>
                        </div>
                        {selectedPlugin.memory > 0 && (
                          <Progress value={(selectedPlugin.memory / 512) * 100} className="h-2" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Permissions</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedPlugin.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Information</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Author</span>
                          <span>{selectedPlugin.author}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Active</span>
                          <span>{formatLastActive(selectedPlugin.lastActive)}</span>
                        </div>
                      </div>
                    </div>

                    {selectedPlugin.config && (
                      <div>
                        <h4 className="font-medium mb-2">Configuration</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(selectedPlugin.config, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a plugin to view details</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plugin Marketplace</CardTitle>
              <CardDescription>
                Browse and install community plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Plugin marketplace coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plugin Settings</CardTitle>
              <CardDescription>
                Global plugin configuration and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Plugin settings coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}