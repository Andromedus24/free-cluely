import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Column, CardStatus } from '../types/BoardTypes';

interface ColumnSettingsModalProps {
  column: Column;
  onUpdateColumn: (updates: Partial<Column>) => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: CardStatus.BACKLOG, label: 'Backlog', color: 'bg-gray-500' },
  { value: CardStatus.TODO, label: 'To Do', color: 'bg-blue-500' },
  { value: CardStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-yellow-500' },
  { value: CardStatus.REVIEW, label: 'Review', color: 'bg-purple-500' },
  { value: CardStatus.DONE, label: 'Done', color: 'bg-green-500' },
  { value: CardStatus.CANCELLED, label: 'Cancelled', color: 'bg-red-500' }
];

const COLOR_OPTIONS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Light Gray', value: '#f3f4f6' },
  { name: 'Light Blue', value: '#eff6ff' },
  { name: 'Light Green', value: '#f0fdf4' },
  { name: 'Light Yellow', value: '#fefce8' },
  { name: 'Light Pink', value: '#fdf2f8' },
  { name: 'Light Purple', value: '#faf5ff' }
];

export const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({
  column,
  onUpdateColumn,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: column.name,
    description: column.description || '',
    status: column.status,
    wipLimit: column.settings.wipLimit || null,
    color: column.settings.color || '#ffffff',
    autoArchive: column.settings.autoArchive || false
  });

  const handleSave = () => {
    onUpdateColumn({
      name: formData.name,
      description: formData.description,
      status: formData.status,
      settings: {
        ...column.settings,
        wipLimit: formData.wipLimit,
        color: formData.color,
        autoArchive: formData.autoArchive
      }
    });
    onClose();
  };

  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Column Settings</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Configure column properties and behavior
                </p>
              </div>
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

          {/* Form */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Column Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => updateFormField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter column name..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => updateFormField('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add a description..."
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <motion.button
                      key={status.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        formData.status === status.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateFormField('status', status.value)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* WIP Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WIP Limit
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.wipLimit || ''}
                    onChange={e => updateFormField('wipLimit', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="No limit"
                    min="1"
                  />
                  <span className="text-sm text-gray-600">
                    Maximum cards in this column
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Set to 0 or leave empty for no limit
                </p>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map(color => (
                    <motion.button
                      key={color.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        formData.color === color.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => updateFormField('color', color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Auto Archive */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.autoArchive}
                    onChange={e => updateFormField('autoArchive', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Auto-archive completed cards
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Automatically move cards to archive when marked as done
                </p>
              </div>

              {/* Advanced Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Allow Cards</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.settings.allowCards !== false}
                        onChange={e => {
                          // This would be handled in the update
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Collapsed</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.settings.isCollapsed || false}
                        onChange={e => {
                          // This would be handled in the update
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
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
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={handleSave}
              >
                Save Changes
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ColumnSettingsModal;