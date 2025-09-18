import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Board,
  Column,
  Card,
  BoardView,
  CollaborationSession,
  BoardSystemEvent
} from '../types/BoardTypes';
import { BoardSystemInterface } from '../interfaces/BoardSystemInterface';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';
import { CreateCardModal } from './CreateCardModal';
import { ColumnSettingsModal } from './ColumnSettingsModal';
import { BoardHeader } from './BoardHeader';
import { UserAvatar } from './UserAvatar';
import { BoardCustomizationModal } from './BoardCustomizationModal';
import { BoardSettingsPanel } from './BoardSettingsPanel';
import { CustomFieldManager } from './CustomFieldManager';
import { useTheme } from '../contexts/ThemeContext';
import { CollaborationCursor } from './CollaborationCursor';
import { CollaborationPanel } from './CollaborationPanel';
import { BoardChat } from './BoardChat';
import { ActivityFeed, ActivityEvent } from './ActivityFeed';
import { BoardAnalytics } from './BoardAnalytics';
import { createCollaborationService, CollaborationSession, UserCursor } from '../services/CollaborationService';

interface KanbanBoardProps {
  board: Board;
  view: BoardView;
  system: BoardSystemInterface;
  userId: string;
  className?: string;
  onBoardChange?: (board: Board) => void;
  onCardClick?: (card: Card) => void;
}

interface SortableCardProps {
  card: Card;
  onCardClick?: (card: Card) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ card, onCardClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard card={card} onClick={onCardClick} />
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  view,
  system,
  userId,
  className = '',
  onBoardChange,
  onCardClick
}) => {
  const { currentTheme, setTheme } = useTheme();
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [createCardColumnId, setCreateCardColumnId] = useState<string>('');
  const [showColumnSettings, setShowColumnSettings] = useState<string | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [collaborationSession, setCollaborationSession] = useState<CollaborationSession | null>(null);
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(new Map());
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [collaborationService, setCollaborationService] = useState<any>(null);
  const [isCollaborationEnabled, setIsCollaborationEnabled] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Get other users' cursors (excluding current user)
  const otherUsers = Array.from(userCursors.values()).filter(cursor => cursor.userId !== userId);

  const boardRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Load board data
  useEffect(() => {
    loadBoardData();
  }, [board.id]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = system.subscribeToBoardEvents(board.id, handleBoardEvent);
    return () => unsubscribe();
  }, [board.id, system]);

  // Initialize collaboration service
  useEffect(() => {
    if (isCollaborationEnabled) {
      const service = createCollaborationService('ws://localhost:8080');
      setCollaborationService(service);

      // Set up event listeners
      service.on('session_joined', (session: CollaborationSession) => {
        setCollaborationSession(session);
        setIsCollaborationEnabled(true);
      });

      service.on('user_joined', (event: any) => {
        setActivities(prev => [{
          id: `activity_${Date.now()}`,
          type: 'user_joined',
          userId: event.userId,
          userName: event.userName,
          action: 'joined the collaboration session',
          timestamp: new Date()
        }, ...prev]);
      });

      service.on('message_sent', (event: any) => {
        setChatMessages(prev => [...prev, event.data]);
      });

      service.on('cursor_moved', (event: any) => {
        setUserCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(event.userId, {
            userId: event.userId,
            userName: event.userName,
            position: event.data.position,
            isVisible: true,
            isTyping: false,
            lastActive: new Date()
          });
          return newCursors;
        });
      });

      service.on('typing_start', (event: any) => {
        setUserCursors(prev => {
          const newCursors = new Map(prev);
          const existing = newCursors.get(event.userId);
          if (existing) {
            newCursors.set(event.userId, { ...existing, isTyping: true });
          }
          return newCursors;
        });
      });

      service.on('typing_end', (event: any) => {
        setUserCursors(prev => {
          const newCursors = new Map(prev);
          const existing = newCursors.get(event.userId);
          if (existing) {
            newCursors.set(event.userId, { ...existing, isTyping: false });
          }
          return newCursors;
        });
      });

      // Auto-connect if collaboration is enabled
      service.connect(board.id, userId, 'Current User').catch(error => {
        console.error('Failed to connect collaboration service:', error);
      });

      return () => {
        service.disconnect();
      };
    }
  }, [board.id, userId, isCollaborationEnabled]);

  // Join collaboration session (fallback for non-WebSocket mode)
  useEffect(() => {
    if (!isCollaborationEnabled) {
      joinCollaborationSession();
      return () => leaveCollaborationSession();
    }
  }, [board.id, userId, isCollaborationEnabled]);

  const loadBoardData = async () => {
    try {
      setLoading(true);
      const [boardColumns, boardCards] = await Promise.all([
        system.getColumnsByBoard(board.id),
        system.getCardsByBoard(board.id)
      ]);

      setColumns(boardColumns.sort((a, b) => a.position - b.position));
      setCards(boardCards.sort((a, b) => a.position - b.position));
    } catch (error) {
      console.error('Failed to load board data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBoardEvent = useCallback((event: BoardSystemEvent) => {
    switch (event.type) {
      case 'card_created':
      case 'card_updated':
      case 'card_moved':
        loadBoardData();
        break;
      case 'board_updated':
        if (onBoardChange) {
          onBoardChange(event.data);
        }
        break;
    }
  }, [loadBoardData, onBoardChange]);

  const joinCollaborationSession = async () => {
    try {
      const sessions = await system.getActiveCollaborationSessions(board.id);
      if (sessions.length > 0) {
        const session = sessions[0];
        await system.joinCollaborationSession(session.id, userId);
        setCollaborationSession(session);
      } else {
        const newSession = await system.startCollaborationSession(board.id, [userId]);
        setCollaborationSession(newSession);
      }
    } catch (error) {
      console.error('Failed to join collaboration session:', error);
    }
  };

  const leaveCollaborationSession = async () => {
    if (collaborationSession) {
      try {
        await system.leaveCollaborationSession(collaborationSession.id, userId);
        setCollaborationSession(null);
      } catch (error) {
        console.error('Failed to leave collaboration session:', error);
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    if (card) {
      setDraggingCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over?.data.current?.type === 'column') {
      setActiveColumn(over.id as string);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingCard(null);
    setActiveColumn(null);

    if (!over) return;

    const cardId = active.id as string;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Moving to a different column
    if (over.data.current?.type === 'column') {
      const targetColumnId = over.id as string;
      if (targetColumnId !== card.columnId) {
        try {
          await system.moveCard(cardId, {
            targetColumnId,
            targetPosition: 0
          });

          // Add collaboration activity
          if (collaborationService && isCollaborationEnabled) {
            setActivities(prev => [{
              id: `activity_${Date.now()}`,
              type: 'card_moved',
              userId: userId,
              userName: 'Current User',
              targetId: cardId,
              targetName: card.title,
              action: `moved card to ${columns.find(c => c.id === targetColumnId)?.name || 'new column'}`,
              timestamp: new Date(),
              metadata: {
                fromColumn: card.columnId,
                toColumn: targetColumnId
              }
            }, ...prev]);
          }
        } catch (error) {
          console.error('Failed to move card:', error);
          loadBoardData(); // Refresh to revert visual state
        }
      }
    }
    // Reordering within the same column
    else if (over.data.current?.type === 'card') {
      const targetCardId = over.id as string;
      const targetCard = cards.find(c => c.id === targetCardId);
      if (targetCard && targetCard.columnId === card.columnId) {
        try {
          const columnCards = cards
            .filter(c => c.columnId === card.columnId)
            .sort((a, b) => a.position - b.position);

          const currentIndex = columnCards.findIndex(c => c.id === cardId);
          const targetIndex = columnCards.findIndex(c => c.id === targetCardId);

          if (currentIndex !== targetIndex) {
            await system.moveCard(cardId, {
              targetColumnId: card.columnId,
              targetPosition: targetIndex
            });

            // Add collaboration activity
            if (collaborationService && isCollaborationEnabled) {
              setActivities(prev => [{
                id: `activity_${Date.now()}`,
                type: 'card_moved',
                userId: userId,
                userName: 'Current User',
                targetId: cardId,
                targetName: card.title,
                action: `reordered card`,
                timestamp: new Date(),
                metadata: {
                  fromPosition: currentIndex,
                  toPosition: targetIndex
                }
              }, ...prev]);
            }
          }
        } catch (error) {
          console.error('Failed to reorder card:', error);
          loadBoardData(); // Refresh to revert visual state
        }
      }
    }
  };

  const handleCreateCard = async (columnId: string, cardData: any) => {
    try {
      await system.createCard(
        board.id,
        columnId,
        cardData,
        userId
      );
      setShowCreateCardModal(false);
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleUpdateColumn = async (columnId: string, updates: Partial<Column>) => {
    try {
      await system.updateColumn(columnId, updates);
      setShowColumnSettings(null);
      loadBoardData();
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  };

  const handleColumnReorder = async (columnIds: string[]) => {
    try {
      await system.reorderColumns(board.id, columnIds);
    } catch (error) {
      console.error('Failed to reorder columns:', error);
    }
  };

  const getCardsForColumn = (columnId: string) => {
    return cards
      .filter(card => card.columnId === columnId)
      .sort((a, b) => a.position - b.position);
  };

  const getColumnStats = (columnId: string) => {
    const columnCards = getCardsForColumn(columnId);
    return {
      total: columnCards.length,
      completed: columnCards.filter(card => card.status === 'done').length
    };
  };

  const canModifyBoard = () => {
    return board.ownerId === userId || board.memberIds.includes(userId);
  };

  // Collaboration helper functions
  const toggleCollaboration = async () => {
    if (isCollaborationEnabled) {
      setIsCollaborationEnabled(false);
      if (collaborationService) {
        collaborationService.disconnect();
      }
      setShowCollaborationPanel(false);
    } else {
      setIsCollaborationEnabled(true);
      setShowCollaborationPanel(true);
    }
  };

  const handleSendMessage = (message: { content: string; mentions?: string[]; attachments?: File[] }) => {
    if (collaborationService && isCollaborationEnabled) {
      collaborationService.sendMessage(message.content, message.mentions, message.attachments);
    }
  };

  const handleMouseMovement = useCallback((e: React.MouseEvent) => {
    if (collaborationService && isCollaborationEnabled) {
      const position = {
        x: e.clientX,
        y: e.clientY
      };
      collaborationService.sendCursor(position);
    }
  }, [collaborationService, isCollaborationEnabled]);

  const handleKickUser = async (userIdToKick: string) => {
    if (collaborationSession && collaborationService) {
      try {
        await collaborationService.leaveSession(collaborationSession.id, userIdToKick);
        setActivities(prev => [{
          id: `activity_${Date.now()}`,
          type: 'user_left',
          userId: userIdToKick,
          userName: 'User',
          action: 'was removed from the session',
          timestamp: new Date()
        }, ...prev]);
      } catch (error) {
        console.error('Failed to kick user:', error);
      }
    }
  };

  const handleLeaveCollaboration = async () => {
    if (collaborationSession) {
      await leaveCollaborationSession();
      setShowCollaborationPanel(false);
    }
  };

  // Get user color for cursors
  const getUserColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${className}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-screen bg-gray-50 ${className}`}
      ref={boardRef}
      onMouseMove={handleMouseMovement}
    >
      {/* Board Header */}
      <BoardHeader
        board={board}
        userId={userId}
        onSettingsClick={() => setShowSettingsPanel(!showSettingsPanel)}
        onShareClick={() => {}}
        onExportClick={() => {}}
        onAnalyticsClick={() => setShowAnalytics(!showAnalytics)}
        onCustomizationClick={() => setShowCustomizationModal(true)}
        onManageFieldsClick={() => setShowFieldManager(true)}
        onCollaborationClick={toggleCollaboration}
        isCollaborationEnabled={isCollaborationEnabled}
        collaborationSession={collaborationSession}
        className="flex-shrink-0"
      />

      {/* Main Board Area */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full overflow-x-auto overflow-y-hidden">
            <SortableContext
              items={columns.map(col => col.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex gap-4 p-4">
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    stats={getColumnStats(column.id)}
                    isActive={activeColumn === column.id}
                    isOver={activeColumn === column.id}
                    canModify={canModifyBoard()}
                    onCardCreate={() => {
                      setCreateCardColumnId(column.id);
                      setShowCreateCardModal(true);
                    }}
                    onSettingsClick={() => setShowColumnSettings(column.id)}
                    onColumnReorder={handleColumnReorder}
                    className="flex-shrink-0"
                  >
                    <SortableContext
                      items={getCardsForColumn(column.id).map(card => card.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <AnimatePresence>
                        {getCardsForColumn(column.id).map((card) => (
                          <SortableCard
                            key={card.id}
                            card={card}
                            onCardClick={onCardClick}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </KanbanColumn>
                ))}
              </div>
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* Floating User Cursors */}
      {otherUsers.map((cursor) => (
        <motion.div
          key={cursor.userId}
          className="fixed w-8 h-8 rounded-full border-2 border-white shadow-lg pointer-events-none z-50"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            backgroundColor: getUserColor(cursor.userId),
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <div className="relative">
            <UserAvatar userId={cursor.userId} size={32} />
            {cursor.isTyping && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                typing...
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* Collaboration Panel */}
      <AnimatePresence>
        {showCollaborationPanel && collaborationSession && (
          <motion.div
            className="fixed right-4 top-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-40"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <CollaborationPanel
              session={collaborationSession}
              currentUserId={userId}
              onKickUser={handleKickUser}
              onLeaveSession={handleLeaveCollaboration}
              onStartChat={() => {
                setShowChat(true);
                setShowCollaborationPanel(false);
              }}
              onViewActivity={() => {
                setShowActivityFeed(true);
                setShowCollaborationPanel(false);
              }}
              onClose={() => setShowCollaborationPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board Chat */}
      <AnimatePresence>
        {showChat && collaborationSession && (
          <motion.div
            className="fixed right-4 bottom-4 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-40"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <BoardChat
              boardId={board.id}
              sessionId={collaborationSession.id}
              userId={userId}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onTypingStart={() => collaborationService?.sendTypingStart()}
              onTypingEnd={() => collaborationService?.sendTypingEnd()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Feed */}
      <AnimatePresence>
        {showActivityFeed && (
          <motion.div
            className="fixed right-4 top-20 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-40"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ActivityFeed
              boardId={board.id}
              activities={activities}
              onActivityClick={(activity) => {
                console.log('Activity clicked:', activity);
              }}
              onFilterChange={(filters) => {
                console.log('Filters changed:', filters);
              }}
              realtimeEnabled={isCollaborationEnabled}
              className="h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board Analytics */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <BoardAnalytics
                board={board}
                columns={columns}
                cards={cards}
                onClose={() => setShowAnalytics(false)}
                className="h-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Card Modal */}
      <AnimatePresence>
        {showCreateCardModal && (
          <CreateCardModal
            boardId={board.id}
            columnId={createCardColumnId}
            availableLabels={board.settings.customFields || []}
            availableMembers={board.memberIds}
            onCreateCard={(cardData) => handleCreateCard(createCardColumnId, cardData)}
            onClose={() => setShowCreateCardModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Column Settings Modal */}
      <AnimatePresence>
        {showColumnSettings && (
          <ColumnSettingsModal
            column={columns.find(c => c.id === showColumnSettings)!}
            onUpdateColumn={(updates) => handleUpdateColumn(showColumnSettings, updates)}
            onClose={() => setShowColumnSettings(null)}
          />
        )}
      </AnimatePresence>

      {/* Drag Preview */}
      <AnimatePresence>
        {draggingCard && (
          <motion.div
            className="fixed w-80 rounded-lg shadow-xl pointer-events-none z-50 bg-white border border-gray-200"
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <KanbanCard card={draggingCard} />
          </motion.div>
        )}

        {/* Customization Modal */}
        <AnimatePresence>
          {showCustomizationModal && (
            <BoardCustomizationModal
              board={board}
              onUpdateBoard={(updates) => {
                // Update the board with new theme and settings
                const updatedBoard = { ...board, ...updates };
                onBoardChange?.(updatedBoard);
              }}
              onClose={() => setShowCustomizationModal(false)}
            />
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettingsPanel && (
            <BoardSettingsPanel
              board={board}
              onUpdateBoard={(updates) => {
                const updatedBoard = { ...board, ...updates };
                onBoardChange?.(updatedBoard);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setShowSettingsPanel(false)}
            />
          )}
        </AnimatePresence>

        {/* Custom Field Manager */}
        <AnimatePresence>
          {showFieldManager && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
                    <button
                      onClick={() => setShowFieldManager(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <CustomFieldManager
                    fields={board.settings.customFields || []}
                    onFieldsChange={(fields) => {
                      const updatedBoard = {
                        ...board,
                        settings: { ...board.settings, customFields: fields }
                      };
                      onBoardChange?.(updatedBoard);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
};

export default KanbanBoard;