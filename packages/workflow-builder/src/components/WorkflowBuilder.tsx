import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  NodeProps,
  Handle,
  Position,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  NodeTemplate,
  WorkflowStatus
} from '../types/WorkflowTypes';
import { WorkflowBuilderInterface } from '../interfaces/WorkflowBuilderInterface';

interface WorkflowBuilderProps {
  workflow?: Workflow;
  service: WorkflowBuilderInterface;
  onWorkflowChange?: (workflow: Workflow) => void;
  className?: string;
}

interface NodePaletteProps {
  templates: NodeTemplate[];
  onAddNode: (template: NodeTemplate, position: { x: number; y: number }) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ templates, onAddNode }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(templates.map(t => t.category)));

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) ||
                         template.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div
      className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto"
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <h3 className="text-lg font-semibold mb-4">Node Palette</h3>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search nodes..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filteredTemplates.map(template => (
          <motion.div
            key={template.id}
            className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddNode(template, { x: 100, y: 100 })}
          >
            <div className="flex items-center space-x-2">
              {template.icon && (
                <span className="text-xl">{template.icon}</span>
              )}
              <div>
                <h4 className="font-medium text-sm">{template.name}</h4>
                <p className="text-xs text-gray-600">{template.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const CustomNode: React.FC<NodeProps<WorkflowNode>> = ({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className={`px-4 py-2 rounded-lg border-2 min-w-[150px] cursor-move ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
      }`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />

      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-1">
          {data.icon && <span className="text-lg">{data.icon}</span>}
          <h4 className="font-semibold text-sm">{data.name}</h4>
        </div>
        <p className="text-xs text-gray-600 mb-2">{data.description}</p>

        <button
          className="text-xs text-blue-600 hover:text-blue-800"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 text-left space-y-1"
            >
              {data.inputs.map((input, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs">{input.name}: {input.type}</span>
                </div>
              ))}
              {data.outputs.map((output, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-xs">{output.name}: {output.type}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </motion.div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflow,
  service,
  onWorkflowChange,
  className = ''
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [templates, setTemplates] = useState<NodeTemplate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Initialize workflow and templates
  useEffect(() => {
    const initialize = async () => {
      if (workflow) {
        // Convert workflow nodes to ReactFlow nodes
        const rfNodes = workflow.nodes.map(node => ({
          id: node.id,
          type: 'custom',
          position: node.position,
          data: node
        }));

        // Convert workflow connections to ReactFlow edges
        const rfEdges = workflow.connections.map(conn => ({
          id: conn.id,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          sourceHandle: conn.sourceOutputId,
          targetHandle: conn.targetInputId,
          data: conn
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      }

      // Load node templates
      const nodeTemplates = await service.getNodeTemplates();
      setTemplates(nodeTemplates);
    };

    initialize();
  }, [workflow, service]);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (params.source && params.target) {
        const newEdge = {
          id: `edge-${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          data: {
            sourceNodeId: params.source,
            sourceOutputId: params.sourceHandle || 'output',
            targetNodeId: params.target,
            targetInputId: params.targetHandle || 'input'
          }
        };

        setEdges((eds) => addEdge(newEdge, eds));

        if (workflow) {
          try {
            await service.addConnection(workflow.id, newEdge.data);
          } catch (error) {
            console.error('Failed to save connection:', error);
          }
        }
      }
    },
    [workflow, service, setEdges]
  );

  const onAddNode = useCallback(
    async (template: NodeTemplate, position: { x: number; y: number }) => {
      if (!workflow) return;

      const newNode: Omit<WorkflowNode, 'id'> = {
        type: template.type,
        name: template.name,
        description: template.description,
        position,
        inputs: template.inputs,
        outputs: template.outputs,
        config: {},
        metadata: {}
      };

      try {
        const createdNode = await service.addNode(workflow.id, newNode);

        const rfNode = {
          id: createdNode.id,
          type: 'custom',
          position: createdNode.position,
          data: createdNode
        };

        setNodes((nds) => nds.concat(rfNode));
      } catch (error) {
        console.error('Failed to add node:', error);
      }
    },
    [workflow, service, setNodes]
  );

  const onNodesChangeHandler = useCallback(
    async (changes: any) => {
      onNodesChange(changes);

      if (workflow && changes.length > 0) {
        const change = changes[0];
        if (change.type === 'position' && change.position) {
          try {
            await service.moveNode(workflow.id, change.id, change.position);
          } catch (error) {
            console.error('Failed to update node position:', error);
          }
        }
      }
    },
    [workflow, service, onNodesChange]
  );

  const onEdgesChangeHandler = useCallback(
    async (changes: any) => {
      onEdgesChange(changes);

      // Handle edge deletions
      if (workflow && changes.length > 0) {
        const change = changes[0];
        if (change.type === 'remove') {
          try {
            await service.deleteConnection(workflow.id, change.id);
          } catch (error) {
            console.error('Failed to delete connection:', error);
          }
        }
      }
    },
    [workflow, service, onEdgesChange]
  );

  const onValidateWorkflow = useCallback(async () => {
    if (!workflow) return;

    try {
      const result = await service.validateWorkflow(workflow.id);
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate workflow:', error);
    }
  }, [workflow, service]);

  const onExecuteWorkflow = useCallback(async () => {
    if (!workflow) return;

    try {
      const executionId = await service.executeWorkflow(workflow.id);
      console.log('Workflow execution started:', executionId);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  }, [workflow, service]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !workflow) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      };

      const templateId = event.dataTransfer.getData('application/reactflow');
      const template = templates.find(t => t.id === templateId);

      if (template) {
        onAddNode(template, position);
      }
    },
    [workflow, templates, onAddNode]
  );

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      <motion.div
        className={`${isPanelOpen ? 'w-80' : 'w-12'} bg-white border-r border-gray-200 transition-all duration-300`}
        initial={{ width: isPanelOpen ? 320 : 48 }}
      >
        <button
          className="w-full py-2 px-4 text-left hover:bg-gray-100 border-b border-gray-200"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
        >
          {isPanelOpen ? '◀' : '▶'}
        </button>

        <AnimatePresence>
          {isPanelOpen && (
            <NodePalette templates={templates} onAddNode={onAddNode} />
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">
              {workflow ? workflow.name : 'New Workflow'}
            </h2>
            {workflow && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                workflow.status === WorkflowStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                workflow.status === WorkflowStatus.DRAFT ? 'bg-yellow-100 text-yellow-800' :
                workflow.status === WorkflowStatus.ERROR ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {workflow.status}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              onClick={onValidateWorkflow}
              disabled={!workflow}
            >
              Validate
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              onClick={onExecuteWorkflow}
              disabled={!workflow || validationResult?.isValid === false}
            >
              Execute
            </button>
          </div>
        </div>

        <div
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeHandler}
            onEdgesChange={onEdgesChangeHandler}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#aaa" gap={16} variant={BackgroundVariant.Dots} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {validationResult && (
          <motion.div
            className="bg-white border-t border-gray-200 p-4"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Validation Results</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setValidationResult(null)}
              >
                ✕
              </button>
            </div>

            {validationResult.isValid ? (
              <div className="text-green-600">✓ Workflow is valid</div>
            ) : (
              <div className="space-y-2">
                {validationResult.errors.map((error: any, index: number) => (
                  <div key={index} className="text-red-600 text-sm">
                    ✗ {error.message}
                  </div>
                ))}
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                <h4 className="font-medium text-yellow-600">Warnings:</h4>
                {validationResult.warnings.map((warning: any, index: number) => (
                  <div key={index} className="text-yellow-600 text-sm">
                    ⚠ {warning.message}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WorkflowBuilder;