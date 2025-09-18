import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomField, CustomFieldType } from '../types/BoardTypes';

interface CustomFieldManagerProps {
  fields: CustomField[];
  onFieldsChange: (fields: CustomField[]) => void;
  className?: string;
}

const FIELD_TYPES = [
  { value: CustomFieldType.TEXT, label: 'Text', icon: '📝', description: 'Single line of text' },
  { value: CustomFieldType.NUMBER, label: 'Number', icon: '🔢', description: 'Numeric values' },
  { value: CustomFieldType.DATE, label: 'Date', icon: '📅', description: 'Date picker' },
  { value: CustomFieldType.SELECT, label: 'Select', icon: '📋', description: 'Single choice from options' },
  { value: CustomFieldType.MULTISELECT, label: 'Multi-Select', icon: '☑️', description: 'Multiple choices' },
  { value: CustomFieldType.BOOLEAN, label: 'Boolean', icon: '✅', description: 'Yes/No toggle' },
  { value: CustomFieldType.USER, label: 'User', icon: '👤', description: 'User selection' }
];

interface NewFieldData {
  name: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  defaultValue: any;
}

export const CustomFieldManager: React.FC<CustomFieldManagerProps> = ({
  fields,
  onFieldsChange,
  className = ''
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newField, setNewField] = useState<NewFieldData>({
    name: '',
    type: CustomFieldType.TEXT,
    required: false,
    options: [],
    defaultValue: ''
  });

  const handleCreateField = () => {
    if (!newField.name.trim()) return;

    const field: CustomField = {
      id: `field-${Date.now()}`,
      name: newField.name.trim(),
      type: newField.type,
      required: newField.required,
      options: newField.type === CustomFieldType.SELECT || newField.type === CustomFieldType.MULTISELECT
        ? newField.options.filter(opt => opt.trim())
        : undefined,
      defaultValue: newField.defaultValue
    };

    onFieldsChange([...fields, field]);
    resetNewField();
    setIsCreating(false);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<CustomField>) => {
    const updatedFields = fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    onFieldsChange(updatedFields);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field? This will remove it from all cards.')) {
      onFieldsChange(fields.filter(field => field.id !== fieldId));
    }
  };

  const resetNewField = () => {
    setNewField({
      name: '',
      type: CustomFieldType.TEXT,
      required: false,
      options: [],
      defaultValue: ''
    });
  };

  const addOption = () => {
    setNewField(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          onClick={() => setIsCreating(true)}
        >
          Add Field
        </motion.button>
      </div>

      {/* Existing Fields */}
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map(field => (
            <div
              key={field.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {editingField === field.id ? (
                <FieldEditor
                  field={field}
                  onSave={(updates) => handleUpdateField(field.id, updates)}
                  onCancel={() => setEditingField(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      {FIELD_TYPES.find(t => t.value === field.type)?.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {FIELD_TYPES.find(t => t.value === field.type)?.label}
                        {field.options && field.options.length > 0 && (
                          <span className="ml-2">
                            ({field.options.length} options)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      onClick={() => setEditingField(field.id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">📋</div>
          <p className="text-gray-600">No custom fields yet</p>
          <p className="text-sm text-gray-500 mt-1">Add custom fields to track additional data on your cards</p>
        </div>
      )}

      {/* Create Field Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Custom Field</h3>

                {/* Field Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter field name..."
                  />
                </div>

                {/* Field Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_TYPES.map(type => (
                      <button
                        key={type.value}
                        className={`p-3 border-2 rounded-lg text-left transition-colors ${
                          newField.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setNewField(prev => ({ ...prev, type: type.value }))}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{type.icon}</span>
                          <div>
                            <div className="text-sm font-medium">{type.label}</div>
                            <div className="text-xs text-gray-600">{type.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options (for select/multiselect) */}
                {(newField.type === CustomFieldType.SELECT || newField.type === CustomFieldType.MULTISELECT) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {newField.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Option ${index + 1}`}
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded"
                            onClick={() => removeOption(index)}
                            disabled={newField.options.length === 1}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </motion.button>
                        </div>
                      ))}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-blue-600"
                        onClick={addOption}
                      >
                        + Add Option
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Required */}
                <div className="mb-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Required field
                    </span>
                  </label>
                </div>

                {/* Default Value */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Value (optional)
                  </label>
                  {newField.type === CustomFieldType.BOOLEAN ? (
                    <select
                      value={newField.defaultValue}
                      onChange={(e) => setNewField(prev => ({ ...prev, defaultValue: e.target.value === 'true' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No default</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : newField.type === CustomFieldType.SELECT ? (
                    <select
                      value={newField.defaultValue || ''}
                      onChange={(e) => setNewField(prev => ({ ...prev, defaultValue: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No default</option>
                      {newField.options.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={newField.type === CustomFieldType.NUMBER ? 'number' : 'text'}
                      value={newField.defaultValue || ''}
                      onChange={(e) => setNewField(prev => ({ ...prev, defaultValue: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter default value..."
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    onClick={() => {
                      resetNewField();
                      setIsCreating(false);
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    onClick={handleCreateField}
                    disabled={!newField.name.trim()}
                  >
                    Create Field
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FieldEditorProps {
  field: CustomField;
  onSave: (updates: Partial<CustomField>) => void;
  onCancel: () => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: field.name,
    type: field.type,
    required: field.required,
    options: field.options || [],
    defaultValue: field.defaultValue
  });

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    const updates: Partial<CustomField> = {
      name: formData.name,
      required: formData.required,
      defaultValue: formData.defaultValue
    };

    if (formData.type === CustomFieldType.SELECT || formData.type === CustomFieldType.MULTISELECT) {
      updates.options = formData.options.filter(opt => opt.trim());
    }

    onSave(updates);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Field name..."
      />

      {(formData.type === CustomFieldType.SELECT || formData.type === CustomFieldType.MULTISELECT) && (
        <div className="space-y-2">
          {formData.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Option ${index + 1}`}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-400 hover:text-red-600 rounded"
                onClick={() => removeOption(index)}
                disabled={formData.options.length === 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          ))}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-blue-600"
            onClick={addOption}
          >
            + Add Option
          </motion.button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.required}
          onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Required</span>
      </div>

      <div className="flex justify-end space-x-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
          onClick={onCancel}
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          onClick={handleSave}
        >
          Save
        </motion.button>
      </div>
    </div>
  );
};