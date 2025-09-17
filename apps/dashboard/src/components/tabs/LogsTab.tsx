'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Filter, RefreshCw, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  plugin?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock logs data - in real app, this would come from the backend
  useEffect(() => {
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        level: 'info',
        message: 'Application started successfully',
        timestamp: Date.now() - 3600000,
        plugin: 'system'
      },
      {
        id: '2',
        level: 'debug',
        message: 'Screenshot captured: screen-001.png',
        timestamp: Date.now() - 1800000,
        plugin: 'screenshot'
      },
      {
        id: '3',
        level: 'warn',
        message: 'Plugin permission denied: clipboard access',
        timestamp: Date.now() - 1200000,
        plugin: 'permissions'
      },
      {
        id: '4',
        level: 'error',
        message: 'Failed to connect to Ollama service',
        timestamp: Date.now() - 600000,
        plugin: 'llm',
        metadata: { error: 'ECONNREFUSED' }
      },
      {
        id: '5',
        level: 'info',
        message: 'Vision analysis completed successfully',
        timestamp: Date.now() - 300000,
        plugin: 'vision'
      }
    ];
    
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by plugin
    if (selectedPlugin !== 'all') {
      filtered = filtered.filter(log => log.plugin === selectedPlugin);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.plugin && log.plugin.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevel, selectedPlugin, searchTerm]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'debug': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      level: log.level,
      plugin: log.plugin || 'system',
      message: log.message,
      metadata: log.metadata
    }));

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `free-cluely-logs-${format(Date.now(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const refreshLogs = () => {
    // In real app, this would fetch new logs from the backend
    console.log('Refreshing logs...');
  };

  const plugins = Array.from(new Set(logs.map(log => log.plugin).filter(Boolean)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Logs</CardTitle>
          <CardDescription>
            Monitor application activity, errors, and plugin events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                className="h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPlugin} onValueChange={setSelectedPlugin}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by plugin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plugins</SelectItem>
                {plugins.map(plugin => (
                  <SelectItem key={plugin} value={plugin!}>
                    {plugin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={refreshLogs} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportLogs} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" onClick={clearLogs} className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>

          {/* Log count */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Showing {filteredLogs.length} of {logs.length} logs</span>
            {filteredLogs.length !== logs.length && (
              <Button variant="link" onClick={() => {
                setSelectedLevel('all');
                setSelectedPlugin('all');
                setSearchTerm('');
              }}>
                Clear filters
              </Button>
            )}
          </div>

          {/* Logs display */}
          <ScrollArea className="h-[600px] rounded-md border">
            <div className="p-4 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs found
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Badge className={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
                            {log.plugin && (
                              <>
                                <span>•</span>
                                <span className="font-medium">{log.plugin}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{log.message}</p>
                          {log.metadata && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer">
                                Metadata
                              </summary>
                              <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}