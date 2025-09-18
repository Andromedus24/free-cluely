import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Column, Board } from '../types/BoardTypes';
import { formatTime } from '../utils/formatTime';

interface BoardAnalyticsProps {
  board: Board;
  columns: Column[];
  cards: Card[];
  onClose: () => void;
  className?: string;
}

interface AnalyticsData {
  totalCards: number;
  completedCards: number;
  inProgressCards: number;
  blockedCards: number;
  averageCompletionTime: number;
  cardsByColumn: Record<string, number>;
  cardsByAssignee: Record<string, { name: string; count: number }>;
  cardsByLabel: Record<string, number>;
  activityTrend: Array<{ date: string; cards: number; completed: number }>;
  throughput: number;
  cycleTime: number;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4'
};

export const BoardAnalytics: React.FC<BoardAnalyticsProps> = ({
  board,
  columns,
  cards,
  onClose,
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateAnalytics();
  }, [cards, columns, selectedPeriod]);

  const calculateAnalytics = () => {
    setLoading(true);

    // Basic metrics
    const totalCards = cards.length;
    const completedCards = cards.filter(card => card.status === 'done').length;
    const inProgressCards = cards.filter(card => card.status === 'in_progress').length;
    const blockedCards = cards.filter(card => card.status === 'blocked').length;

    // Cards by column
    const cardsByColumn: Record<string, number> = {};
    columns.forEach(column => {
      cardsByColumn[column.id] = cards.filter(card => card.columnId === column.id).length;
    });

    // Cards by assignee
    const cardsByAssignee: Record<string, { name: string; count: number }> = {};
    const assigneeNames: Record<string, string> = {
      'user1': 'Alice Johnson',
      'user2': 'Bob Smith',
      'user3': 'Carol Davis',
      'user4': 'David Wilson'
    };

    cards.forEach(card => {
      if (card.assigneeId) {
        if (!cardsByAssignee[card.assigneeId]) {
          cardsByAssignee[card.assigneeId] = {
            name: assigneeNames[card.assigneeId] || card.assigneeId,
            count: 0
          };
        }
        cardsByAssignee[card.assigneeId].count++;
      }
    });

    // Cards by label
    const cardsByLabel: Record<string, number> = {};
    cards.forEach(card => {
      card.labels?.forEach(label => {
        cardsByLabel[label] = (cardsByLabel[label] || 0) + 1;
      });
    });

    // Activity trend (mock data for demonstration)
    const activityTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        cards: Math.floor(Math.random() * 10) + 5,
        completed: Math.floor(Math.random() * 5) + 1
      };
    }).reverse();

    // Calculate average completion time (mock)
    const averageCompletionTime = 3.5; // days

    // Throughput (cards completed per day)
    const throughput = completedCards / 7;

    // Cycle time (average time from start to completion)
    const cycleTime = 2.8; // days

    setAnalytics({
      totalCards,
      completedCards,
      inProgressCards,
      blockedCards,
      averageCompletionTime,
      cardsByColumn,
      cardsByAssignee,
      cardsByLabel,
      activityTrend,
      throughput,
      cycleTime
    });

    setLoading(false);
  };

  const completionRate = analytics ?
    (analytics.completedCards / analytics.totalCards * 100).toFixed(1) : '0';

  const getTopAssignees = () => {
    if (!analytics) return [];
    return Object.entries(analytics.cardsByAssignee)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5);
  };

  const getTopLabels = () => {
    if (!analytics) return [];
    return Object.entries(analytics.cardsByLabel)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-xl ${className}`}>
        <div className="p-6 flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Board Analytics</h2>
            <p className="text-sm text-gray-600">{board.name} • Insights and metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 p-4 rounded-lg"
          >
            <div className="text-3xl font-bold text-blue-600">{analytics?.totalCards || 0}</div>
            <div className="text-sm text-blue-700">Total Cards</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-50 p-4 rounded-lg"
          >
            <div className="text-3xl font-bold text-green-600">{completionRate}%</div>
            <div className="text-sm text-green-700">Completion Rate</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-yellow-50 p-4 rounded-lg"
          >
            <div className="text-3xl font-bold text-yellow-600">{analytics?.cycleTime || 0}d</div>
            <div className="text-sm text-yellow-700">Avg Cycle Time</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-50 p-4 rounded-lg"
          >
            <div className="text-3xl font-bold text-purple-600">{analytics?.throughput?.toFixed(1) || 0}</div>
            <div className="text-sm text-purple-700">Daily Throughput</div>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cards by Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-50 p-4 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cards by Column</h3>
            <div className="space-y-3">
              {columns.map(column => {
                const count = analytics?.cardsByColumn[column.id] || 0;
                const percentage = analytics?.totalCards ? (count / analytics.totalCards * 100) : 0;

                return (
                  <div key={column.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{column.name}</span>
                      <span className="text-gray-900 font-medium">{count} cards</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Top Assignees */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-50 p-4 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Assignees</h3>
            <div className="space-y-3">
              {getTopAssignees().map(([assigneeId, data]) => {
                const percentage = analytics?.totalCards ? (data.count / analytics.totalCards * 100) : 0;

                return (
                  <div key={assigneeId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{data.name}</span>
                      <span className="text-gray-900 font-medium">{data.count} cards</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Card Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 p-4 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Status</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Completed</span>
                  <span className="text-gray-900 font-medium">{analytics?.completedCards || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{ width: `${(analytics?.completedCards || 0) / (analytics?.totalCards || 1) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">In Progress</span>
                  <span className="text-gray-900 font-medium">{analytics?.inProgressCards || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-yellow-600 h-3 rounded-full"
                    style={{ width: `${(analytics?.inProgressCards || 0) / (analytics?.totalCards || 1) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Blocked</span>
                  <span className="text-gray-900 font-medium">{analytics?.blockedCards || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-600 h-3 rounded-full"
                    style={{ width: `${(analytics?.blockedCards || 0) / (analytics?.totalCards || 1) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Top Labels */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 p-4 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Labels</h3>
            <div className="space-y-3">
              {getTopLabels().map(([label, count]) => {
                const percentage = analytics?.totalCards ? (count / analytics.totalCards * 100) : 0;

                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-900 font-medium">{count} cards</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Activity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-50 p-4 rounded-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Trend</h3>
          <div className="space-y-2">
            {analytics?.activityTrend.map((day, index) => (
              <div key={day.date} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{day.cards} cards</span>
                    <span>{day.completed} completed</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(day.cards / 15) * 100}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(day.completed / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 p-4 rounded-lg"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-blue-900">Completion Rate</div>
                  <div className="text-blue-700">
                    {completionRate}% of cards are completed. {parseFloat(completionRate) > 70 ? 'Great job!' : 'Room for improvement.'}
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-blue-900">Cycle Time</div>
                  <div className="text-blue-700">
                    Average {analytics?.cycleTime || 0} days from start to completion
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-blue-900">Throughput</div>
                  <div className="text-blue-700">
                    {analytics?.throughput?.toFixed(1) || 0} cards completed per day on average
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-blue-900">Blocked Cards</div>
                  <div className="text-blue-700">
                    {analytics?.blockedCards || 0} cards need attention to unblock progress
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BoardAnalytics;