'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Cpu, 
  MemoryStick, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface Stats {
  uptime: number;
  totalRequests: number;
  activePlugins: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
}

interface PluginStats {
  name: string;
  requests: number;
  errors: number;
  memory: number;
  uptime: number;
}

interface TimelineData {
  timestamp: string;
  requests: number;
  errors: number;
  memory: number;
  responseTime: number;
}

export function StatsTab() {
  const [timeRange, setTimeRange] = useState('24h');
  const [stats, setStats] = useState<Stats>({
    uptime: 0,
    totalRequests: 0,
    activePlugins: 0,
    errorRate: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    responseTime: 0
  });

  const [pluginStats, setPluginStats] = useState<PluginStats[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);

  useEffect(() => {
    // Mock data - in real app, this would come from the backend
    const mockStats: Stats = {
      uptime: 86400000, // 24 hours
      totalRequests: 15420,
      activePlugins: 3,
      errorRate: 0.8,
      memoryUsage: 512,
      cpuUsage: 23.5,
      responseTime: 245
    };

    const mockPluginStats: PluginStats[] = [
      { name: 'Puppeteer Worker', requests: 8920, errors: 12, memory: 45.2, uptime: 86400000 },
      { name: 'Vision Service', requests: 5430, errors: 8, memory: 23.8, uptime: 86400000 },
      { name: 'Screenshot Helper', requests: 1070, errors: 3, memory: 12.1, uptime: 86400000 }
    ];

    const mockTimelineData: TimelineData[] = [
      { timestamp: '00:00', requests: 120, errors: 2, memory: 480, responseTime: 220 },
      { timestamp: '04:00', requests: 85, errors: 1, memory: 490, responseTime: 230 },
      { timestamp: '08:00', requests: 320, errors: 3, memory: 502, responseTime: 240 },
      { timestamp: '12:00', requests: 450, errors: 4, memory: 510, responseTime: 250 },
      { timestamp: '16:00', requests: 380, errors: 2, memory: 508, responseTime: 245 },
      { timestamp: '20:00', requests: 290, errors: 1, memory: 505, responseTime: 235 },
      { timestamp: '24:00', requests: 180, errors: 0, memory: 500, responseTime: 230 }
    ];

    setStats(mockStats);
    setPluginStats(mockPluginStats);
    setTimelineData(mockTimelineData);
  }, [timeRange]);

  const formatUptime = (ms: number) => {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMemory = (mb: number) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getTrendIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return null;
    
    return {
      direction: change > 0 ? 'up' : 'down',
      value: Math.abs(change).toFixed(1)
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Statistics</h2>
          <p className="text-muted-foreground">
            Monitor application performance and usage metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(stats.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Since last restart
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plugins</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePlugins}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activePlugins} of {pluginStats.length} installed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              -0.2% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Resources
            </CardTitle>
            <CardDescription>
              Current resource utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span>{stats.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={stats.cpuUsage} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>{formatMemory(stats.memoryUsage)}</span>
              </div>
              <Progress value={(stats.memoryUsage / 2048) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Avg Response Time</span>
                <span>{stats.responseTime}ms</span>
              </div>
              <Progress value={(stats.responseTime / 500) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Plugin Usage Distribution
            </CardTitle>
            <CardDescription>
              Request distribution across plugins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={pluginStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="requests"
                >
                  {pluginStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {pluginStats.map((plugin, index) => (
                <div key={plugin.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{plugin.name}</span>
                  </div>
                  <span>{plugin.requests.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Volume</CardTitle>
            <CardDescription>
              Number of requests over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
            <CardDescription>
              Average response time over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="responseTime" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plugin Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Plugin Performance</CardTitle>
          <CardDescription>
            Detailed performance metrics for each plugin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pluginStats.map((plugin) => (
              <div key={plugin.name} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{plugin.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatUptime(plugin.uptime)} uptime
                  </p>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Requests</div>
                  <div className="font-medium">{plugin.requests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plugin.errors > 10 ? 'destructive' : 'secondary'}>
                      {plugin.errors}
                    </Badge>
                    <span className="text-xs">
                      {((plugin.errors / plugin.requests) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Memory</div>
                  <div className="font-medium">{formatMemory(plugin.memory)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}