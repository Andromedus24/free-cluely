import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Column,
  CardStatus
} from '../types/BoardTypes';
import { UserAvatar } from './UserAvatar';

interface KanbanColumnProps {
  column: Column;
  stats: {
    total: number;
    completed: number;
  };
  isActive?: boolean;
  isOver?: boolean;
  canModify?: boolean;
  onCardCreate?: () => void;
  onSettingsClick?: () => void;
  onColumnReorder?: (columnIds: string[]) => void;
  className?: string;
  children?: React.ReactNode;
}

interface SortableColumnProps {
  id: string;
  children: React.ReactNode;
}

const SortableColumn: React.FC<SortableColumnProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const WIPIndicator: React.FC<{ current: number; limit?: number }> = ({ current, limit }) => {
  if (!limit) return null;

  const percentage = (current / limit) * 100;
  const isOver = current > limit;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">WIP Limit</span>
        <span className={`font-medium ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
          {current} / {limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${isOver ? 'bg-red-500' : 'bg-blue-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {isOver && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600 mt-1 font-medium"
        >
          WIP limit exceeded!
        </motion.div>
      )}
    </div>
  );
};

const ColumnHeader: React.FC<{
  column: Column;
  stats: { total: number; completed: number };
  canModify?: boolean;
  onSettingsClick?: () => void;
  dragHandleProps?: any;
}> = ({ column, stats, canModify, onSettingsClick, dragHandleProps }) => {
  const getStatusColor = (status: CardStatus) => {
    const colors = {
      [CardStatus.BACKLOG]: 'bg-gray-500',
      [CardStatus.TODO]: 'bg-blue-500',
      [CardStatus.IN_PROGRESS]: 'bg-yellow-500',
      [CardStatus.REVIEW]: 'bg-purple-500',
      [CardStatus.DONE]: 'bg-green-500',
      [CardStatus.CANCELLED]: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <div className={`w-3 h-3 rounded-full ${getStatusColor(column.status)}`} />
        <h3 className="font-semibold text-gray-900 truncate">{column.name}</h3>
        <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
          {stats.total}
        </span>
      </div>

      <div className="flex items-center space-x-1">
        {canModify && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            onClick={onSettingsClick}
            title="Column settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </motion.button>
        )}

        {dragHandleProps && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-grab"
            {...dragHandleProps}
            title="Drag to reorder column"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  stats,
  isActive = false,
  isOver = false,
  canModify = false,
  onCardCreate,
  onSettingsClick,
  onColumnReorder,
  className = '',
  children
}) => {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column
    }
  });

  const columnRef = useRef<HTMLDivElement>(null);

  const columnStyle = {
    backgroundColor: column.settings.color || '#ffffff',
  };

  const isDragActive = isActive || isDroppableOver;

  return (
    <motion.div
      ref={setNodeRef}
      className={`flex flex-col w-80 bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
      style={columnStyle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        boxShadow: isDragActive ? '0 10px 25px rgba(0, 0, 0, 0.1)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
        borderColor: isDragActive ? '#3B82F6' : '#E5E7EB'
      }}
    >
      {/* Column Header */}
      <div className="p-3 pb-0">
        <ColumnHeader
          column={column}
          stats={stats}
          canModify={canModify}
          onSettingsClick={onSettingsClick}
        />
      </div>

      {/* Column Description */}
      {column.description && (
        <div className="px-3 pb-2">
          <p className="text-xs text-gray-600">{column.description}</p>
        </div>
      )}

      {/* WIP Limit Indicator */}
      {column.settings.wipLimit && (
        <div className="px-3 pb-2">
          <WIPIndicator
            current={stats.total}
            limit={column.settings.wipLimit}
          />
        </div>
      )}

      {/* Drop Zone */}
      <motion.div
        ref={columnRef}
        className={`flex-1 min-h-0 p-3 overflow-y-auto ${
          isDragActive ? 'bg-blue-50' : ''
        }`}
        initial={{ minHeight: '400px' }}
        animate={{
          minHeight: isDragActive ? '500px' : '400px',
          backgroundColor: isDragActive ? '#EFF6FF' : 'transparent'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Cards Container */}
        <div className="space-y-2">
          <AnimatePresence>
            {children}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {stats.total === 0 && (
          <motion.div
            className="text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No cards in this column</p>
          </motion.div>
        )}

        {/* Add Card Button */}
        {canModify && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-3 p-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center space-x-2"
            onClick={onCardCreate}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Card</span>
          </motion.button>
        )}
      </motion.div>

      {/* Column Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{stats.completed} of {stats.total} completed</span>
          <div className="flex items-center space-x-2">
            {stats.total > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-green-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.completed / stats.total) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drop Indicator */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-lg pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default KanbanColumn;