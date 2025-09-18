import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Board,
  BoardView,
  CardStatus,
  CollaborationSession
} from '../types/BoardTypes';
import { UserAvatar } from './UserAvatar';
import { SearchInput } from './SearchInput';
import { FilterDropdown } from './FilterDropdown';

interface BoardHeaderProps {
  board: Board;
  userId: string;
  onSettingsClick: () => void;
  onShareClick: () => void;
  onExportClick: () => void;
  onAnalyticsClick?: () => void;
  onCustomizationClick?: () => void;
  onManageFieldsClick?: () => void;
  onCollaborationClick?: () => void;
  isCollaborationEnabled?: boolean;
  collaborationSession?: CollaborationSession | null;
  className?: string;
}

const ViewSwitcher: React.FC<{
  currentView: BoardView;
  views: BoardView[];
  onViewChange: (view: BoardView) => void;
}> = ({ currentView, views, onViewChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{currentView.name}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            {views.map(view => (
              <motion.button
                key={view.id}
                whileHover={{ backgroundColor: '#F3F4F6' }}
                className={`w-full text-left px-3 py-2 text-sm ${
                  view.id === currentView.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                onClick={() => {
                  onViewChange(view);
                  setIsOpen(false);
                }}
              >
                {view.name}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BoardStats: React.FC<{
  board: Board;
}> = ({ board }) => {
  const [stats, setStats] = useState({
    totalCards: 0,
    completedCards: 0,
    inProgressCards: 0,
    totalMembers: 0
  });

  // In practice, this would be fetched from the board service
  React.useEffect(() => {
    // Mock stats calculation
    setStats({
      totalCards: 42,
      completedCards: 18,
      inProgressCards: 8,
      totalMembers: board.memberIds.length
    });
  }, [board]);

  const completionPercentage = stats.totalCards > 0
    ? Math.round((stats.completedCards / stats.totalCards) * 100)
    : 0;

  return (
    <div className="flex items-center space-x-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{stats.totalCards}</div>
        <div className="text-xs text-gray-600">Total Cards</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.completedCards}</div>
        <div className="text-xs text-gray-600">Completed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">{stats.inProgressCards}</div>
        <div className="text-xs text-gray-600">In Progress</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{completionPercentage}%</div>
        <div className="text-xs text-gray-600">Complete</div>
      </div>
    </div>
  );
};

const QuickFilters: React.FC<{
  filters: string[];
  activeFilters: string[];
  onFilterToggle: (filter: string) => void;
}> = ({ filters, activeFilters, onFilterToggle }) => {
  return (
    <div className="flex items-center space-x-2">
      {filters.map(filter => (
        <motion.button
          key={filter}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            activeFilters.includes(filter)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => onFilterToggle(filter)}
        >
          {filter}
        </motion.button>
      ))}
    </div>
  );
};

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  userId,
  onSettingsClick,
  onShareClick,
  onExportClick,
  onAnalyticsClick,
  onCustomizationClick,
  onManageFieldsClick,
  onCollaborationClick,
  isCollaborationEnabled = false,
  collaborationSession = null,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<BoardView>({
    id: 'default',
    boardId: board.id,
    name: 'Kanban',
    type: 'kanban',
    filters: {},
    sorts: [],
    grouping: {},
    isDefault: true,
    isPublic: true,
    settings: {},
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const mockViews: BoardView[] = [
    currentView,
    {
      ...currentView,
      id: 'list',
      name: 'List',
      type: 'list'
    },
    {
      ...currentView,
      id: 'calendar',
      name: 'Calendar',
      type: 'calendar'
    },
    {
      ...currentView,
      id: 'timeline',
      name: 'Timeline',
      type: 'timeline'
    }
  ];

  const quickFilters = ['Assigned to me', 'Due this week', 'High priority', 'Blocked'];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Search functionality filters cards based on title, description, and assignee
    onSearch?.(query);
  };

  const handleFilterToggle = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const isBoardOwner = board.ownerId === userId;
  const canModifyBoard = isBoardOwner || board.memberIds.includes(userId);

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-6 py-4">
        {/* Main Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{board.name}</h1>
              {board.description && (
                <p className="text-sm text-gray-600 mt-1">{board.description}</p>
              )}
            </div>

            {/* Board Actions */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowSearch(!showSearch)}
                title="Search cards"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-colors ${
                  isCollaborationEnabled
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                onClick={onCollaborationClick}
                title={isCollaborationEnabled ? "Collaboration enabled" : "Enable collaboration"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isCollaborationEnabled && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                onClick={onShareClick}
                title="Share board"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                onClick={onExportClick}
                title="Export board"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                onClick={onAnalyticsClick}
                title="Board analytics"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </motion.button>

              {canModifyBoard && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                    onClick={onCustomizationClick}
                    title="Customize board"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                    onClick={onManageFieldsClick}
                    title="Manage custom fields"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                    onClick={onSettingsClick}
                    title="Board settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </motion.button>
                </>
              )}
            </div>

            {/* View Switcher */}
            <ViewSwitcher
              currentView={currentView}
              views={mockViews}
              onViewChange={setCurrentView}
            />
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search cards by title, description, assignee..."
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats and Filters */}
        <div className="flex items-center justify-between">
          <BoardStats board={board} />

          <div className="flex items-center space-x-4">
            {/* Quick Filters */}
            <QuickFilters
              filters={quickFilters}
              activeFilters={activeFilters}
              onFilterToggle={handleFilterToggle}
            />

            {/* Team Members */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {isCollaborationEnabled && collaborationSession ? "Collaborating:" : "Team:"}
              </span>
              <div className="flex -space-x-2">
                {isCollaborationEnabled && collaborationSession ? (
                  <>
                    {collaborationSession.participants
                      .filter(p => p.isActive)
                      .slice(0, 5)
                      .map(participant => (
                        <div key={participant.userId} className="relative">
                          <UserAvatar
                            userId={participant.userId}
                            size={28}
                            className="border-2 border-white"
                          />
                          {participant.isOwner && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                      ))}
                    {collaborationSession.participants.filter(p => p.isActive).length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700">
                        +{collaborationSession.participants.filter(p => p.isActive).length - 5}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {board.memberIds.slice(0, 5).map(userId => (
                      <UserAvatar
                        key={userId}
                        userId={userId}
                        size={28}
                        className="border-2 border-white"
                      />
                    ))}
                    {board.memberIds.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700">
                        +{board.memberIds.length - 5}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <motion.div
            className="mt-3 flex items-center space-x-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-sm text-gray-600">Active filters:</span>
            {activeFilters.map(filter => (
              <motion.span
                key={filter}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <span>{filter}</span>
                <button
                  onClick={() => handleFilterToggle(filter)}
                  className="hover:text-blue-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BoardHeader;