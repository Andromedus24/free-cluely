import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardTemplate } from '../types/BoardTypes';
import { BoardTemplateLibrary } from './BoardTemplateLibrary';
import { BoardSystemInterface } from '../interfaces/BoardSystemInterface';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: BoardSystemInterface;
  userId: string;
  onBoardCreated?: (board: any) => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  system,
  userId,
  onBoardCreated
}) => {
  const [activeView, setActiveView] = useState<'blank' | 'template'>('blank');
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const handleCreateBlankBoard = async () => {
    if (!boardName.trim()) return;

    setIsCreating(true);
    try {
      const board = await system.createBoard({
        name: boardName.trim(),
        description: boardDescription.trim() || undefined,
        type: 'kanban',
        columns: [
          { name: 'To Do', description: 'Tasks that need to be started', color: '#EF4444' },
          { name: 'In Progress', description: 'Tasks currently being worked on', color: '#F59E0B' },
          { name: 'Done', description: 'Completed tasks', color: '#10B981' }
        ]
      }, userId);

      onBoardCreated?.(board);
      onClose();
      setBoardName('');
      setBoardDescription('');
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (template: BoardTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateLibrary(false);
    setBoardName(template.name);
    setBoardDescription(template.description);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !boardName.trim()) return;

    setIsCreating(true);
    try {
      // Create columns from template
      const columns = selectedTemplate.columns?.map(col => ({
        name: col.name,
        description: col.description,
        color: col.color
      })) || [
        { name: 'To Do', description: 'Tasks that need to be started', color: '#EF4444' },
        { name: 'In Progress', description: 'Tasks currently being worked on', color: '#F59E0B' },
        { name: 'Done', description: 'Completed tasks', color: '#10B981' }
      ];

      const board = await system.createBoard({
        name: boardName.trim(),
        description: boardDescription.trim() || undefined,
        type: selectedTemplate.boardType,
        columns,
        templateId: selectedTemplate.id,
        settings: {
          ...selectedTemplate.settings,
          wipEnabled: selectedTemplate.columns?.some(col => col.settings?.wipLimit) || false
        }
      }, userId);

      onBoardCreated?.(board);
      onClose();
      setBoardName('');
      setBoardDescription('');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error creating board from template:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreate = () => {
    if (activeView === 'blank') {
      handleCreateBlankBoard();
    } else {
      handleCreateFromTemplate();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          variants={modalVariants}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create New Board</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={isCreating}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'blank'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveView('blank')}
              >
                Blank Board
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'template'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveView('template')}
              >
                From Template
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeView === 'blank' && (
              <div className="space-y-6">
                {/* Board Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Board Name *
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="Enter board name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

                {/* Board Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={boardDescription}
                    onChange={(e) => setBoardDescription(e.target.value)}
                    placeholder="Describe the purpose of this board..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

                {/* Board Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Board Type
                  </label>
                  <select
                    value="kanban"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreating}
                  >
                    <option value="kanban">Kanban Board</option>
                    <option value="scrum">Scrum Board</option>
                    <option value="list">List Board</option>
                    <option value="calendar">Calendar Board</option>
                    <option value="timeline">Timeline Board</option>
                  </select>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                    <div className="flex space-x-4">
                      {['To Do', 'In Progress', 'Done'].map((column, index) => (
                        <div key={column} className="flex-1">
                          <div className="h-2 rounded mb-2" style={{
                            backgroundColor: index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : '#10B981'
                          }} />
                          <p className="text-xs text-gray-600 font-medium">{column}</p>
                          <div className="mt-2 space-y-1">
                            <div className="h-6 bg-white rounded border border-gray-200"></div>
                            <div className="h-6 bg-white rounded border border-gray-200"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'template' && (
              <div className="space-y-6">
                {/* Selected Template */}
                {selectedTemplate ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Selected Template</h3>
                      <button
                        onClick={() => {
                          setSelectedTemplate(null);
                          setShowTemplateLibrary(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Change Template
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">
                          {selectedTemplate.boardType === 'kanban' ? '📋' :
                           selectedTemplate.boardType === 'scrum' ? '🏃' :
                           selectedTemplate.boardType === 'list' ? '📝' :
                           selectedTemplate.boardType === 'calendar' ? '📅' :
                           selectedTemplate.boardType === 'timeline' ? '📊' : '🎨'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{selectedTemplate.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{selectedTemplate.columnCount} columns</span>
                            <span>{selectedTemplate.category.replace('-', ' ')}</span>
                            {selectedTemplate.isPopular && <span>⭐ Popular</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setShowTemplateLibrary(true)}
                      className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-600 font-medium">Choose a Template</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Browse from 12+ professionally designed templates
                        </p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Board Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Board Name *
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="Enter board name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

                {/* Board Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={boardDescription}
                    onChange={(e) => setBoardDescription(e.target.value)}
                    placeholder="Describe the purpose of this board..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                disabled={!boardName.trim() || isCreating || (activeView === 'template' && !selectedTemplate)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !boardName.trim() || isCreating || (activeView === 'template' && !selectedTemplate)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCreating ? (
                  <div className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Board...
                  </div>
                ) : (
                  'Create Board'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Template Library Modal */}
      <AnimatePresence>
        {showTemplateLibrary && (
          <BoardTemplateLibrary
            onTemplateSelect={handleTemplateSelect}
            onClose={() => setShowTemplateLibrary(false)}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default CreateBoardModal;