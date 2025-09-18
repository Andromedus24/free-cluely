import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ConditionalExpression,
  ConditionalLogicEngine
} from '../core/ConditionalLogic';

interface ConditionalNodeEditorProps {
  nodeId: string;
  initialCondition?: ConditionalExpression;
  onSave: (condition: ConditionalExpression) => void;
  onCancel: () => void;
  availableVariables: string[];
}

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not-equals', label: 'Not Equals (!=)' },
  { value: 'greater', label: 'Greater Than (>)' },
  { value: 'less', label: 'Less Than (<)' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts-with', label: 'Starts With' },
  { value: 'ends-with', label: 'Ends With' },
  { value: 'regex', label: 'Regular Expression' }
];

const LOGIC_OPERATORS = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
  { value: 'not', label: 'NOT' }
];

const VariableSuggestion: React.FC<{
  variable: string;
  onSelect: (variable: string) => void;
}> = ({ variable, onSelect }) => (
  <motion.div
    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
    whileHover={{ backgroundColor: '#dbeafe' }}
    onClick={() => onSelect(variable)}
  >
    <span className="text-sm text-blue-600 font-mono">{{`{{${variable}}}`}}</span>
  </motion.div>
);

export const ConditionalNodeEditor: React.FC<ConditionalNodeEditorProps> = ({
  nodeId,
  initialCondition,
  onSave,
  onCancel,
  availableVariables
}) => {
  const [condition, setCondition] = useState<ConditionalExpression>(
    initialCondition || ConditionalLogicEngine.createSimpleCondition('', 'equals', '')
  );
  const [showVariableSuggestions, setShowVariableSuggestions] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState<string[]>([]);
  const [currentInputField, setCurrentInputField] = useState<'left' | 'right'>('left');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testVariables, setTestVariables] = useState<Record<string, any>>({});

  useEffect(() => {
    if (showVariableSuggestions) {
      setFilteredVariables(availableVariables);
    }
  }, [availableVariables, showVariableSuggestions]);

  const handleConditionChange = (updates: Partial<ConditionalExpression>) => {
    setCondition(prev => ({ ...prev, ...updates }));
  };

  const handleVariableSelect = (variable: string) => {
    const variablePath = `{{${variable}}}`;
    if (currentInputField === 'left') {
      handleConditionChange({ left: variablePath });
    } else {
      handleConditionChange({ right: variablePath });
    }
    setShowVariableSuggestions(false);
  };

  const handleInputChange = (field: 'left' | 'right', value: string) => {
    setCurrentInputField(field);
    handleConditionChange({ [field]: value });

    // Show variable suggestions if user starts typing {{
    if (value.includes('{{')) {
      const searchTerm = value.replace('{{', '').trim();
      const filtered = availableVariables.filter(v =>
        v.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVariables(filtered);
      setShowVariableSuggestions(true);
    } else {
      setShowVariableSuggestions(false);
    }
  };

  const addSubCondition = () => {
    const newCondition = ConditionalLogicEngine.createSimpleCondition('', 'equals', '');
    handleConditionChange({
      type: 'compound',
      logic: 'and',
      children: [...(condition.children || []), newCondition]
    });
  };

  const removeSubCondition = (index: number) => {
    if (condition.children) {
      const newChildren = condition.children.filter((_, i) => i !== index);
      if (newChildren.length === 0) {
        handleConditionChange({ type: 'simple', children: undefined });
      } else {
        handleConditionChange({ children: newChildren });
      }
    }
  };

  const testCondition = async () => {
    try {
      // Create a mock execution context for testing
      const mockContext: any = {
        logs: []
      };

      const engine = new ConditionalLogicEngine(mockContext);
      const result = await engine.evaluateCondition(condition, testVariables);
      setTestResult(result);
    } catch (error) {
      setTestResult(false);
      console.error('Condition test failed:', error);
    }
  };

  const renderCondition = (cond: ConditionalExpression, depth: number = 0) => {
    const indent = depth * 20;

    if (cond.type === 'compound') {
      return (
        <div key={cond.id} className="space-y-2" style={{ marginLeft: `${indent}px` }}>
          <div className="flex items-center space-x-2">
            {depth > 0 && (
              <select
                className="px-2 py-1 border border-gray-300 rounded text-sm"
                value={cond.logic || 'and'}
                onChange={(e) => handleConditionChange({ logic: e.target.value as any })}
              >
                {LOGIC_OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            )}
            {depth > 0 && (
              <button
                className="text-red-500 hover:text-red-700 text-sm"
                onClick={() => removeSubCondition(depth - 1)}
              >
                Remove
              </button>
            )}
          </div>

          <div className="border-l-2 border-gray-300 pl-4">
            {cond.children?.map((child, index) => (
              <div key={child.id} className="mb-2">
                {renderCondition(child, depth + 1)}
              </div>
            ))}
          </div>

          {depth === 0 && (
            <button
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              onClick={addSubCondition}
            >
              Add Condition
            </button>
          )}
        </div>
      );
    }

    if (cond.type === 'script') {
      return (
        <div key={cond.id} style={{ marginLeft: `${indent}px` }}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Script Condition</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={4}
              placeholder="// Return true or false\nreturn variables.status === 'success';"
              value={cond.script || ''}
              onChange={(e) => handleConditionChange({ script: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Use the 'variables' object to access workflow variables. Return true/false.
            </p>
          </div>
        </div>
      );
    }

    // Simple condition
    return (
      <div key={cond.id} style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Left value (e.g., {{status}})"
              value={cond.left || ''}
              onChange={(e) => handleInputChange('left', e.target.value)}
              onFocus={() => setCurrentInputField('left')}
            />
          </div>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={cond.operator || 'equals'}
            onChange={(e) => handleConditionChange({ operator: e.target.value as any })}
          >
            {CONDITION_OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <div className="flex-1">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Right value (e.g., 'success')"
              value={cond.right || ''}
              onChange={(e) => handleInputChange('right', e.target.value)}
              onFocus={() => setCurrentInputField('right')}
            />
          </div>
        </div>

        {/* Variable suggestions */}
        <AnimatePresence>
          {showVariableSuggestions && filteredVariables.length > 0 && (
            <motion.div
              className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {filteredVariables.map(variable => (
                <VariableSuggestion
                  key={variable}
                  variable={variable}
                  onSelect={handleVariableSelect}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Edit Condition</h2>
          <p className="text-gray-600 text-sm mt-1">
            Configure conditional logic for workflow branching
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={condition.type === 'simple'}
                    onChange={() => handleConditionChange({ type: 'simple' })}
                  />
                  Simple Condition
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={condition.type === 'compound'}
                    onChange={() => handleConditionChange({ type: 'compound', logic: 'and', children: [] })}
                  />
                  Compound Condition
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={condition.type === 'script'}
                    onChange={() => handleConditionChange({ type: 'script', script: '' })}
                  />
                  Script Condition
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              {renderCondition(condition)}
            </div>

            {/* Test section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Test Condition</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Variables
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={3}
                    placeholder='{"status": "success", "count": 42}'
                    value={JSON.stringify(testVariables, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setTestVariables(parsed);
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={testCondition}
                  >
                    Test Condition
                  </button>

                  {testResult !== null && (
                    <div className={`flex items-center space-x-2 ${
                      testResult ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span>{testResult ? '✓' : '✗'}</span>
                      <span className="font-medium">
                        {testResult ? 'Condition is TRUE' : 'Condition is FALSE'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => onSave(condition)}
          >
            Save Condition
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConditionalNodeEditor;