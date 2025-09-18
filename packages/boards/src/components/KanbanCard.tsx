import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  TaskPriority,
  TaskType,
  CardStatus
} from '../types/BoardTypes';
import { UserAvatar } from './UserAvatar';
import { CardLabels } from './CardLabels';
import { CardMenu } from './CardMenu';

interface KanbanCardProps {
  card: Card;
  onClick?: (card: Card) => void;
  className?: string;
}

const PriorityIndicator: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const colors = {
    [TaskPriority.LOW]: 'bg-gray-400',
    [TaskPriority.MEDIUM]: 'bg-blue-400',
    [TaskPriority.HIGH]: 'bg-orange-400',
    [TaskPriority.URGENT]: 'bg-red-500'
  };

  const labels = {
    [TaskPriority.LOW]: 'Low',
    [TaskPriority.MEDIUM]: 'Medium',
    [TaskPriority.HIGH]: 'High',
    [TaskPriority.URGENT]: 'Urgent'
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${colors[priority]}`}>
      {labels[priority]}
    </div>
  );
};

const TypeIndicator: React.FC<{ type: TaskType }> = ({ type }) => {
  const icons = {
    [TaskType.TASK]: '📋',
    [TaskType.BUG]: '🐛',
    [TaskType.FEATURE]: '✨',
    [TaskType.EPIC]: '📚',
    [TaskType.STORY]: '📖',
    [TaskType.SUBTASK]: '📝'
  };

  const labels = {
    [TaskType.TASK]: 'Task',
    [TaskType.BUG]: 'Bug',
    [TaskType.FEATURE]: 'Feature',
    [TaskType.EPIC]: 'Epic',
    [TaskType.STORY]: 'Story',
    [TaskType.SUBTASK]: 'Subtask'
  };

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-600">
      <span>{icons[type]}</span>
      <span>{labels[type]}</span>
    </div>
  );
};

const DueDateIndicator: React.FC<{ dueDate?: Date; status: CardStatus }> = ({ dueDate, status }) => {
  if (!dueDate) return null;

  const now = new Date();
  const isOverdue = dueDate < now && status !== CardStatus.DONE && status !== CardStatus.CANCELLED;
  const isToday = dueDate.toDateString() === now.toDateString();
  const isTomorrow = dueDate.getDate() === now.getDate() + 1 && dueDate.getMonth() === now.getMonth();

  const formatDate = (date: Date) => {
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`flex items-center space-x-1 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>{formatDate(dueDate)}</span>
    </div>
  );
};

const Assignees: React.FC<{ assigneeIds: string[]; max?: number }> = ({ assigneeIds, max = 3 }) => {
  const visibleAssignees = assigneeIds.slice(0, max);
  const remainingCount = assigneeIds.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visibleAssignees.map((userId, index) => (
        <UserAvatar
          key={userId}
          userId={userId}
          size={24}
          className="border-2 border-white"
          style={{ zIndex: visibleAssignees.length - index }}
        />
      ))}
      {remainingCount > 0 && (
        <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

const CheckProgress: React.FC<{ checklists: Card['checklists'] }> = ({ checklists }) => {
  if (checklists.length === 0) return null;

  const totalItems = checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
  const completedItems = checklists.reduce((sum, checklist) =>
    sum + checklist.items.filter(item => item.completed).length, 0
  );

  if (totalItems === 0) return null;

  const percentage = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">Checklists</span>
        <span className="text-gray-700">{completedItems} / {totalItems}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <motion.div
          className="bg-green-500 h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};

const AttachmentsIndicator: React.FC<{ attachments: Card['attachments'] }> = ({ attachments }) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-600">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span>{attachments.length}</span>
    </div>
  );
};

const CommentsIndicator: React.FC<{ commentCount: number }> = ({ commentCount }) => {
  if (commentCount === 0) return null;

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-600">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span>{commentCount}</span>
    </div>
  );
};

export const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  onClick,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger click if clicking on menu or interactive elements
    if ((e.target as HTMLElement).closest('.card-menu')) {
      return;
    }
    onClick?.(card);
  };

  const getCardStyle = () => {
    if (card.status === CardStatus.DONE) {
      return 'opacity-75 bg-gray-50';
    }
    if (card.status === CardStatus.CANCELLED) {
      return 'opacity-50 bg-gray-100 line-through';
    }
    return 'bg-white';
  };

  return (
    <motion.div
      className={`relative group cursor-pointer rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${getCardStyle()} ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      layout
      layoutId={`card-${card.id}`}
    >
      {/* Card Header */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <PriorityIndicator priority={card.priority} />
            <TypeIndicator type={card.type} />
          </div>

          <CardMenu
            card={card}
            isVisible={isHovered || showMenu}
            onShowMenu={setShowMenu}
            className="card-menu"
          />
        </div>

        {/* Card Title */}
        <h4 className="font-medium text-gray-900 text-sm mb-2 leading-tight line-clamp-2">
          {card.title}
        </h4>

        {/* Card Description */}
        {card.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Labels */}
        {card.labels.length > 0 && (
          <div className="mb-2">
            <CardLabels labels={card.labels} />
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-1">
          {/* Due Date */}
          <DueDateIndicator dueDate={card.dueDate} status={card.status} />

          {/* Time Tracking */}
          {(card.estimatedHours || card.actualHours) && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              {card.estimatedHours && (
                <span>⏱️ {card.estimatedHours}h estimated</span>
              )}
              {card.actualHours && (
                <span>⏱️ {card.actualHours}h actual</span>
              )}
            </div>
          )}

          {/* Attachments and Comments */}
          <div className="flex items-center space-x-3">
            <AttachmentsIndicator attachments={card.attachments} />
            <CommentsIndicator commentCount={card.comments?.length || 0} />
          </div>
        </div>

        {/* Checklists Progress */}
        <CheckProgress checklists={card.checklists} />

        {/* Card Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          {/* Assignees */}
          <Assignees assigneeIds={card.assigneeIds} />

          {/* Status Badge */}
          <div className="flex items-center space-x-1">
            {card.status === CardStatus.DONE && (
              <span className="text-green-600 text-xs">✓ Done</span>
            )}
            {card.status === CardStatus.IN_PROGRESS && (
              <span className="text-yellow-600 text-xs">⚡ In Progress</span>
            )}
            {card.status === CardStatus.REVIEW && (
              <span className="text-purple-600 text-xs">👀 Review</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Custom Field Values */}
      {Object.keys(card.customFields).length > 0 && (
        <div className="px-3 pb-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(card.customFields).map(([key, value]) => (
              <div key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
                <span className="text-gray-600">{key}:</span>
                <span className="text-gray-800 ml-1">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtasks Indicator */}
      {card.childCardIds.length > 0 && (
        <div className="px-3 pb-2 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-xs text-gray-600 mt-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>{card.childCardIds.length} subtask{card.childCardIds.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default KanbanCard;