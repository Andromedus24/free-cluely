import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Grid, List, Settings, Users, Calendar, Star } from 'lucide-react';
import { Board } from '../../../packages/boards/src/types/BoardTypes';
import { BoardSystemInterface } from '../../../packages/boards/src/interfaces/BoardSystemInterface';
import { CreateBoardModal } from '../../../packages/boards/src/components/CreateBoardModal';
import { BoardCard } from './BoardCard';

interface BoardsPageProps {
  userId: string;
  boardSystem: BoardSystemInterface;
  onBoardSelect?: (board: Board) => void;
}

export const BoardsPage: React.FC<BoardsPageProps> = ({
  userId,
  boardSystem,
  onBoardSelect
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBoards();
  }, [userId, boardSystem]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = boards.filter(board =>
        board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBoards(filtered);
    } else {
      setFilteredBoards(boards);
    }
  }, [boards, searchQuery]);

  const loadBoards = async () => {
    setIsLoading(true);
    try {
      const userBoards = await boardSystem.getBoardsByUser(userId);
      setBoards(userBoards);
      setFilteredBoards(userBoards);
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoardCreated = (board: Board) => {
    setBoards(prev => [board, ...prev]);
  };

  const handleBoardSelect = (board: Board) => {
    onBoardSelect?.(board);
  };

  const boardStats = {
    total: boards.length,
    recent: boards.filter(board => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(board.createdAt) > weekAgo;
    }).length,
    starred: boards.filter(board => board.isStarred).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Boards</h1>
          <p className="text-gray-600 mt-1">Manage your project boards and workflows</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={20} />
            </button>
            <button
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
              onClick={() => setViewMode('list')}
            >
              <List size={20} />
            </button>
          </div>

          {/* Create Board Button */}
          <motion.button
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            <span>Create Board</span>
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Grid size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Boards</p>
              <p className="text-2xl font-bold text-gray-900">{boardStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recent</p>
              <p className="text-2xl font-bold text-gray-900">{boardStats.recent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Starred</p>
              <p className="text-2xl font-bold text-gray-900">{boardStats.starred}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Boards Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Grid size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No boards found' : 'No boards yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Create your first board to get started with project management'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Create Your First Board</span>
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              viewMode={viewMode}
              onClick={() => handleBoardSelect(board)}
              boardSystem={boardSystem}
              onBoardUpdate={loadBoards}
            />
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          system={boardSystem}
          userId={userId}
          onBoardCreated={handleBoardCreated}
        />
      )}
    </div>
  );
};