import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Star, Users, Calendar, MessageSquare, Settings } from 'lucide-react';
import { Board } from '../../../../packages/boards/src/types/BoardTypes';
import { BoardSystemInterface } from '../../../../packages/boards/src/interfaces/BoardSystemInterface';

interface BoardCardProps {
  board: Board;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  boardSystem: BoardSystemInterface;
  onBoardUpdate?: () => void;
}

export const BoardCard: React.FC<BoardCardProps> = ({
  board,
  viewMode,
  onClick,
  boardSystem,
  onBoardUpdate
}) => {
  const [isStarred, setIsStarred] = useState(board.isStarred || false);
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      await boardSystem.updateBoard(board.id, { isStarred: !isStarred });
      setIsStarred(!isStarred);
      onBoardUpdate?.();
    } catch (error) {
      console.error('Error updating board star status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      await boardSystem.duplicateBoard(board.id, `${board.name} (Copy)`);
      onBoardUpdate?.();
    } catch (error) {
      console.error('Error duplicating board:', error);
    } finally {
      setIsUpdating(false);
      setShowMenu(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      await boardSystem.archiveBoard(board.id);
      onBoardUpdate?.();
    } catch (error) {
      console.error('Error archiving board:', error);
    } finally {
      setIsUpdating(false);
      setShowMenu(false);
    }
  };

  const getBoardTypeIcon = (type: string) => {
    switch (type) {
      case 'kanban': return '📋';
      case 'scrum': return '🏃';
      case 'list': return '📝';
      case 'calendar': return '📅';
      case 'timeline': return '📊';
      default: return '🎨';
    }
  };

  const getBoardTypeColor = (type: string) => {
    switch (type) {
      case 'kanban': return 'bg-blue-100 text-blue-700';
      case 'scrum': return 'bg-purple-100 text-purple-700';
      case 'list': return 'bg-gray-100 text-gray-700';
      case 'calendar': return 'bg-green-100 text-green-700';
      case 'timeline': return 'bg-orange-100 text-orange-700';
      default: return 'bg-indigo-100 text-indigo-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all duration-200"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Board Icon */}
            <div className="text-3xl">{getBoardTypeIcon(board.type)}</div>

            {/* Board Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="font-medium text-gray-900">{board.name}</h3>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getBoardTypeColor(board.type)}`}>
                  {board.type}
                </span>
                {board.templateId && (
                  <span className="text-xs text-gray-500">From Template</span>
                )}
              </div>
              {board.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{board.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{formatDate(board.createdAt)}</span>
                </span>
                {board.columns && (
                  <span className="flex items-center space-x-1">
                    <List size={14} />
                    <span>{board.columns.length} columns</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleStar}
              disabled={isUpdating}
              className={`p-2 rounded-lg transition-colors ${
                isStarred ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <Star size={18} fill={isStarred ? 'currentColor' : 'none'} />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                disabled={isUpdating}
              >
                <MoreHorizontal size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={handleDuplicate}
                    disabled={isUpdating}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Duplicate Board
                  </button>
                  <button
                    onClick={() => {}}
                    disabled={isUpdating}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <Settings size={14} />
                      <span>Settings</span>
                    </span>
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleArchive}
                    disabled={isUpdating}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Archive Board
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all duration-200 relative"
      onClick={onClick}
    >
      {/* Star Button */}
      <button
        onClick={handleToggleStar}
        disabled={isUpdating}
        className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10 ${
          isStarred ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-50'
        }`}
      >
        <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
      </button>

      {/* Board Icon */}
      <div className="text-4xl mb-3">{getBoardTypeIcon(board.type)}</div>

      {/* Board Info */}
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <h3 className="font-medium text-gray-900 flex-1 pr-8">{board.name}</h3>
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getBoardTypeColor(board.type)}`}>
            {board.type}
          </span>
        </div>

        {board.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{board.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {board.columns && (
              <span>{board.columns.length} columns</span>
            )}
          </div>
          <span>{formatDate(board.createdAt)}</span>
        </div>

        {/* Tags */}
        {board.templateId && (
          <div className="flex items-center space-x-1">
            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
              Template
            </span>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex space-x-1 overflow-hidden">
          {board.columns?.slice(0, 3).map((column, index) => (
            <div
              key={column.id}
              className="flex-1 h-1 rounded"
              style={{ backgroundColor: column.color || '#E5E7EB' }}
            />
          ))}
          {(board.columns?.length || 0) > 3 && (
            <div className="w-4 h-1 bg-gray-300 rounded"></div>
          )}
        </div>
      </div>
    </motion.div>
  );
};