import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Zap,
  Calendar
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

import { TimelineAnalyticsProps } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

export const TimelineAnalytics: React.FC<TimelineAnalyticsProps> = ({
  analytics,
  dateRange,
  onDateRangeChange,
  compact = false,
}) => {
  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    const successRate = analytics.totalJobs > 0
      ? Math.round((analytics.completedJobs / analytics.totalJobs) * 100)
      : 0;

    const failureRate = analytics.totalJobs > 0
      ? Math.round((analytics.failedJobs / analytics.totalJobs) * 100)
      : 0;

    const avgCostPerJob = analytics.totalJobs > 0
      ? analytics.totalCost / analytics.totalJobs
      : 0;

    const jobsPerDay = analytics.jobsByDay.length > 0
      ? analytics.totalJobs / analytics.jobsByDay.length
      : 0;

    return {
      successRate,
      failureRate,
      avgCostPerJob,
      jobsPerDay,
    };
  }, [analytics]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Job type distribution for pie chart
    const typeData = Object.entries(analytics.jobsByType).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      percentage: Math.round((count / analytics.totalJobs) * 100),
    }));

    // Status distribution for pie chart
    const statusData = Object.entries(analytics.jobsByStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percentage: Math.round((count / analytics.totalJobs) * 100),
    }));

    // Daily trend for line chart
    const trendData = analytics.jobsByDay.map(day => ({
      date: format(new Date(day.date), 'MMM dd'),
      jobs: day.count,
      completed: Math.floor(day.count * (derivedMetrics.successRate / 100)),
      failed: Math.floor(day.count * (derivedMetrics.failureRate / 100)),
    }));

    // Top tags for bar chart
    const tagsData = analytics.topTags.slice(0, 10).map((tag, index) => ({
      name: tag.tag,
      count: tag.count,
      percentage: Math.round((tag.count / analytics.totalJobs) * 100),
    }));

    return {
      typeData,
      statusData,
      trendData,
      tagsData,
    };
  }, [analytics, derivedMetrics]);

  // Render compact version
  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Success Rate */}
        <MetricCard
          title="Success Rate"
          value={`${derivedMetrics.successRate}%`}
          icon={CheckCircle}
          trend={derivedMetrics.successRate >= 80 ? 'up' : derivedMetrics.successRate >= 60 ? 'stable' : 'down'}
          trendValue={`${derivedMetrics.successRate >= 80 ? 'Excellent' : derivedMetrics.successRate >= 60 ? 'Good' : 'Needs Improvement'}`}
        />

        {/* Total Jobs */}
        <MetricCard
          title="Total Jobs"
          value={analytics.totalJobs.toLocaleString()}
          icon={BarChart3}
          trend={analytics.jobsByDay.length > 1 ? (analytics.jobsByDay[analytics.jobsByDay.length - 1].count > analytics.jobsByDay[0].count ? 'up' : 'down') : 'stable'}
          trendValue={`${analytics.jobsByDay.length > 1 ? (analytics.jobsByDay[analytics.jobsByDay.length - 1].count > analytics.jobsByDay[0].count ? 'Increasing' : 'Decreasing') : 'Stable'}`}
        />

        {/* Average Duration */}
        <MetricCard
          title="Avg Duration"
          value={formatDuration(analytics.averageDuration)}
          icon={Clock}
          trend="stable"
          trendValue="Last 30 days"
        />

        {/* Total Cost */}
        <MetricCard
          title="Total Cost"
          value={`$${analytics.totalCost.toFixed(2)}`}
          icon={DollarSign}
          trend="stable"
          trendValue={`$${derivedMetrics.avgCostPerJob.toFixed(4)} per job`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Timeline Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Performance metrics and insights for your timeline activities
          </p>
        </div>
        {dateRange && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Jobs"
          value={analytics.totalJobs.toLocaleString()}
          icon={BarChart3}
          trend={analytics.jobsByDay.length > 1 ? (analytics.jobsByDay[analytics.jobsByDay.length - 1].count > analytics.jobsByDay[0].count ? 'up' : 'down') : 'stable'}
          trendValue={`${analytics.jobsByDay.length > 1 ? (analytics.jobsByDay[analytics.jobsByDay.length - 1].count > analytics.jobsByDay[0].count ? 'Increasing' : 'Decreasing') : 'Stable'}`}
        />

        <MetricCard
          title="Success Rate"
          value={`${derivedMetrics.successRate}%`}
          icon={CheckCircle}
          trend={derivedMetrics.successRate >= 80 ? 'up' : derivedMetrics.successRate >= 60 ? 'stable' : 'down'}
          trendValue={`${derivedMetrics.successRate >= 80 ? 'Excellent' : derivedMetrics.successRate >= 60 ? 'Good' : 'Needs Improvement'}`}
        />

        <MetricCard
          title="Avg Duration"
          value={formatDuration(analytics.averageDuration)}
          icon={Clock}
          trend="stable"
          trendValue="Last 30 days"
        />

        <MetricCard
          title="Total Cost"
          value={`$${analytics.totalCost.toFixed(2)}`}
          icon={DollarSign}
          trend="stable"
          trendValue={`$${derivedMetrics.avgCostPerJob.toFixed(4)} per job`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Types Distribution */}
        <ChartCard
          title="Job Types Distribution"
          icon={PieChartIcon}
          description="Breakdown of jobs by type"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.typeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage}%`}
              >
                {chartData.typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard
          title="Status Distribution"
          icon={Activity}
          description="Current status of all jobs"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage}%`}
              >
                {chartData.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily Trend */}
        <ChartCard
          title="Daily Job Trend"
          icon={TrendingUp}
          description="Number of jobs over time"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="jobs" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="completed" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="failed" stackId="3" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Tags */}
        <ChartCard
          title="Top Tags"
          icon={Target}
          description="Most frequently used tags"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.tagsData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <ChartCard
          title="Performance Metrics"
          icon={Activity}
          description="Key performance indicators over time"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="jobs" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost Analysis */}
        <ChartCard
          title="Cost Analysis"
          icon={DollarSign}
          description="Cost trends and efficiency metrics"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${analytics.totalCost.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${derivedMetrics.avgCostPerJob.toFixed(4)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Cost/Job</div>
              </div>
            </div>
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <BarChart width={400} height={200} data={chartData.trendData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="jobs" fill="#3B82F6" />
              </BarChart>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Time-based Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Distribution */}
        <ChartCard
          title="Hourly Distribution"
          icon={Clock}
          description="Jobs by hour of day"
        >
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            Hourly analysis data would be displayed here
          </div>
        </ChartCard>

        {/* Day of Week Analysis */}
        <ChartCard
          title="Day of Week"
          icon={Calendar}
          description="Jobs by day of week"
        >
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            Day of week analysis would be displayed here
          </div>
        </ChartCard>

        {/* Provider Performance */}
        <ChartCard
          title="Provider Performance"
          icon={Zap}
          description="Success rate by provider"
        >
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            Provider performance data would be displayed here
          </div>
        </ChartCard>
      </div>

      {/* Detailed Insights */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Detailed Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InsightCard
            type="success"
            title="High Success Rate"
            description={`${derivedMetrics.successRate}% of jobs completed successfully`}
          />
          <InsightCard
            type="info"
            title="Daily Average"
            description={`${Math.round(derivedMetrics.jobsPerDay)} jobs per day on average`}
          />
          <InsightCard
            type="warning"
            title="Cost Efficiency"
            description={`Average cost of $${derivedMetrics.avgCostPerJob.toFixed(4)} per job`}
          />
          <InsightCard
            type={derivedMetrics.successRate >= 90 ? 'success' : derivedMetrics.successRate >= 70 ? 'info' : 'warning'}
            title="Performance Trend"
            description={derivedMetrics.successRate >= 90 ? 'Excellent performance' : derivedMetrics.successRate >= 70 ? 'Good performance' : 'Needs improvement'}
          />
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Export Analytics
        </h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export as PDF
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Export as CSV
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Export Raw Data
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}> = ({ title, value, icon: Icon, trend, trendValue }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </span>
        </div>
        {getTrendIcon()}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className={`text-xs ${getTrendColor()}`}>
        {trendValue}
      </div>
    </div>
  );
};

const ChartCard: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, description, children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-gray-400" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
};

const InsightCard: React.FC<{
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
}> = ({ type, title, description }) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: <Zap className="w-5 h-5 text-blue-500" />,
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={cn('p-4 rounded-lg border', styles.bg, styles.border)}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

const formatDuration = (duration?: number): string => {
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
};

export default TimelineAnalytics;