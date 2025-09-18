import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  TaskPriority,
  TaskType,
  CreateCardRequest
} from '../types/BoardTypes';
import { UserAvatar } from './UserAvatar';
import { LabelSelector } from './LabelSelector';
import { DateSelector } from './DateSelector';
import { RichTextEditor } from './RichTextEditor';

interface CreateCardModalProps {
  boardId: string;
  columnId: string;
  availableLabels: string[];
  availableMembers: string[];
  onCreateCard: (cardData: CreateCardRequest) => void;
  onClose: () => void;
}

interface FormData extends Omit<CreateCardRequest, 'type' | 'priority'> {
  type: TaskType;
  priority: TaskPriority;
  assigneeIds: string[];
  labels: string[];
  dueDate: Date | null;
  startDate: Date | null;
  estimatedHours: number | null;
  customFields: Record<string, any>;
}

const INITIAL_FORM_DATA: FormData = {
  title: '',
  description: '',
  type: TaskType.TASK,
  priority: TaskPriority.MEDIUM,
  assigneeIds: [],
  labels: [],
  dueDate: null,
  startDate: null,
  estimatedHours: null,
  customFields: {}
};

const TASK_TYPES = [
  { value: TaskType.TASK, label: 'Task', icon: '📋' },
  { value: TaskType.BUG, label: 'Bug', icon: '🐛' },
  { value: TaskType.FEATURE, label: 'Feature', icon: '✨' },
  { value: TaskType.EPIC, label: 'Epic', icon: '📚' },
  { value: TaskType.STORY, label: 'Story', icon: '📖' },
  { value: TaskType.SUBTASK, label: 'Subtask', icon: '📝' }
];

const PRIORITY_LEVELS = [
  { value: TaskPriority.LOW, label: 'Low', color: 'bg-gray-400' },
  { value: TaskPriority.MEDIUM, label: 'Medium', color: 'bg-blue-400' },
  { value: TaskPriority.HIGH, label: 'High', color: 'bg-orange-400' },
  { value: TaskPriority.URGENT, label: 'Urgent', color: 'bg-red-500' }
];

const TemplateCard: React.FC<{
  template: {
    title: string;
    description: string;
    type: TaskType;
    priority: TaskPriority;
    labels: string[];
  };
  onSelect: () => void;
}> = ({ template, onSelect }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
    onClick={onSelect}
  >
    <h4 className="font-medium text-gray-900 mb-1">{template.title}</h4>
    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
    <div className="flex items-center space-x-2">
      <span className="text-xs">{template.type}</span>
      <span className={`text-xs px-2 py-1 rounded-full text-white ${
        PRIORITY_LEVELS.find(p => p.value === template.priority)?.color || 'bg-gray-400'
      }`}>
        {template.priority}
      </span>
    </div>
  </motion.button>
);

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  boardId,
  columnId,
  availableLabels,
  availableMembers,
  onCreateCard,
  onClose
}) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Helper function to get user display name
  const getUserName = (userId: string): string => {
    // In a real implementation, this would fetch from a user service
    // For now, return a formatted version of the userId
    return userId.includes('@')
      ? userId.split('@')[0]
      : userId.includes('user-')
        ? userId.replace('user-', 'User ')
        : userId;
  };

  const CARD_TEMPLATES = [
    {
      title: 'Bug Report',
      description: 'Report a bug or issue',
      type: TaskType.BUG,
      priority: TaskPriority.HIGH,
      labels: ['bug', 'needs-investigation'],
      formData: {
        description: '## Steps to Reproduce\n\n1. \n2. \n3. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Environment\n- OS: \n- Browser: \n- Version: '
      }
    },
    {
      title: 'Feature Request',
      description: 'Request a new feature',
      type: TaskType.FEATURE,
      priority: TaskPriority.MEDIUM,
      labels: ['feature-request', 'enhancement'],
      formData: {
        description: '## Problem Statement\n\n## Proposed Solution\n\n## Acceptance Criteria\n\n- [ ] \n- [ ] \n- [ ] '
      }
    },
    {
      title: 'Task',
      description: 'Create a new task',
      type: TaskType.TASK,
      priority: TaskPriority.MEDIUM,
      labels: ['task'],
      formData: {}
    },
    {
      title: 'Epic',
      description: 'Create a large feature epic',
      type: TaskType.EPIC,
      priority: TaskPriority.HIGH,
      labels: ['epic', 'feature'],
      formData: {
        description: '## Epic Goal\n\n## User Stories\n\n### Story 1\n**As a** [user type]\n**I want** [goal]\n**So that** [benefit]\n\n### Story 2\n**As a** [user type]\n**I want** [goal]\n**So that** [benefit]'
      }
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateCard({
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
        assigneeIds: formData.assigneeIds,
        labels: formData.labels,
        dueDate: formData.dueDate || undefined,
        startDate: formData.startDate || undefined,
        estimatedHours: formData.estimatedHours || undefined,
        customFields: formData.customFields
      });
      setFormData(INITIAL_FORM_DATA);
      onClose();
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateSelect = (template: typeof CARD_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      ...template.formData,
      type: template.type,
      priority: template.priority,
      labels: template.labels
    }));
    setShowTemplates(false);
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const isFormValid = formData.title.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create New Card</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Add a new card to the board
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  📋 Templates
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  onClick={onClose}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Templates */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Choose a template</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {CARD_TEMPLATES.map(template => (
                      <TemplateCard
                        key={template.title}
                        template={template}
                        onSelect={() => handleTemplateSelect(template)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => updateFormData({ title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter card title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={value => updateFormData({ description: value })}
                    placeholder="Add a detailed description..."
                    minHeight={120}
                  />
                </div>
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => updateFormData({ type: e.target.value as TaskType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TASK_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => updateFormData({ priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_LEVELS.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignees
                </label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {formData.assigneeIds.map(userId => (
                      <div key={userId} className="flex items-center space-x-1 bg-gray-100 rounded-lg px-2 py-1">
                        <UserAvatar userId={userId} size={20} />
                        <button
                          type="button"
                          onClick={() => updateFormData({
                            assigneeIds: formData.assigneeIds.filter(id => id !== userId)
                          })}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value && !formData.assigneeIds.includes(e.target.value)) {
                        updateFormData({
                          assigneeIds: [...formData.assigneeIds, e.target.value]
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Add assignee...</option>
                    {availableMembers
                      .filter(userId => !formData.assigneeIds.includes(userId))
                      .map(userId => (
                        <option key={userId} value={userId}>
                          {getUserName(userId)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labels
                </label>
                <LabelSelector
                  selectedLabels={formData.labels}
                  availableLabels={availableLabels}
                  onLabelsChange={labels => updateFormData({ labels })}
                  onCreateLabel={label => {
                    // Create new label functionality
                    // In a real implementation, this would call a service to persist the label
                    updateFormData({ labels: [...formData.labels, label] });
                  }}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <DateSelector
                    value={formData.startDate}
                    onChange={date => updateFormData({ startDate: date })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <DateSelector
                    value={formData.dueDate}
                    onChange={date => updateFormData({ dueDate: date })}
                    minDate={formData.startDate || undefined}
                  />
                </div>
              </div>

              {/* Time Tracking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={formData.estimatedHours || ''}
                  onChange={e => updateFormData({
                    estimatedHours: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>

              {/* Custom Fields */}
              {/* Custom fields would be dynamically rendered based on board configuration */}
              {formData.customFields && Object.keys(formData.customFields).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(formData.customFields).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => updateFormData({
                          customFields: { ...formData.customFields, [key]: e.target.value }
                        })}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Card'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateCardModal;