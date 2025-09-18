import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  KeyboardCoordinateGetter,
  pointerWithin
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WorkflowNode,
  NodeTemplate,
  WorkflowNodeType,
  WorkflowConnection
} from '../types/WorkflowTypes';

interface DragDropEditorProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  templates: NodeTemplate[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onConnectionsChange: (connections: WorkflowConnection[]) => void;
  onAddNode: (template: NodeTemplate, position: { x: number; y: number }) => void;
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
  onAddConnection: (connection: Omit<WorkflowConnection, 'id'>) => void;
  onDeleteConnection: (connectionId: string) => void;
  className?: string;
}

// Sortable workflow node component
const SortableWorkflowNode: React.FC<{
  node: WorkflowNode;
  isDragging?: boolean;
  onDelete?: (nodeId: string) => void;
  onConfigure?: (nodeId: string) => void;
}> = ({ node, isDragging, onDelete, onConfigure }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isNodeDragging
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isNodeDragging ? 0.5 : 1,
    zIndex: isNodeDragging ? 100 : 1
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`absolute cursor-move select-none ${isDragging ? 'shadow-xl' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      layout
    >
      <div
        className={`px-4 py-3 rounded-lg border-2 min-w-[180px] max-w-[250px] shadow-md ${
          isNodeDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {node.icon && <span className="text-lg">{node.icon}</span>}
            <h4 className="font-semibold text-sm truncate">{node.name}</h4>
          </div>
          <div className="flex space-x-1">
            <button
              className="text-gray-400 hover:text-blue-500 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure?.(node.id);
              }}
            >
              ⚙️
            </button>
            <button
              className="text-gray-400 hover:text-red-500 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(node.id);
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {node.description && (
          <p className="text-xs text-gray-600 mb-2">{node.description}</p>
        )}

        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            {node.inputs.length > 0 && (
              <div className="flex -space-x-1">
                {node.inputs.slice(0, 3).map((input, index) => (
                  <div
                    key={index}
                    className="w-2 h-2 bg-green-500 rounded-full border border-white"
                    title={input.name}
                  />
                ))}
                {node.inputs.length > 3 && (
                  <span className="text-xs text-gray-500">+{node.inputs.length - 3}</span>
                )}
              </div>
            )}
          </div>

          <button
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 space-y-1"
            >
              {node.inputs.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-green-600">Inputs:</span>
                  <ul className="ml-2 mt-1">
                    {node.inputs.map((input, index) => (
                      <li key={index} className="text-gray-600">
                        • {input.name} ({input.type})
                        {input.required && <span className="text-red-500 ml-1">*</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {node.outputs.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-blue-600">Outputs:</span>
                  <ul className="ml-2 mt-1">
                    {node.outputs.map((output, index) => (
                      <li key={index} className="text-gray-600">
                        • {output.name} ({output.type})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Template palette item
const TemplateItem: React.FC<{
  template: NodeTemplate;
  onDragStart: (template: NodeTemplate) => void;
}> = ({ template, onDragStart }) => {
  return (
    <motion.div
      className="p-3 bg-gray-50 rounded-lg cursor-grab border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
      draggable
      onDragStart={() => onDragStart(template)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {template.icon && (
            <span className="text-xl">{template.icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 truncate">
            {template.name}
          </h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {template.description}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
              {template.category}
            </span>
            {template.inputs.length > 0 && (
              <span className="text-xs text-green-600">
                {template.inputs.length} input{template.inputs.length !== 1 ? 's' : ''}
              </span>
            )}
            {template.outputs.length > 0 && (
              <span className="text-xs text-blue-600">
                {template.outputs.length} output{template.outputs.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Connection line component
const ConnectionLine: React.FC<{
  source: { x: number; y: number };
  target: { x: number; y: number };
  isValid?: boolean;
  isTemp?: boolean;
}> = ({ source, target, isValid = true, isTemp = false }) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const style = {
    left: source.x,
    top: source.y,
    width: distance,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 50%'
  };

  return (
    <div
      className={`absolute pointer-events-none ${isTemp ? 'opacity-60' : ''} ${
        isValid ? 'stroke-blue-500' : 'stroke-red-500'
      }`}
      style={style}
    >
      <svg width={distance} height="2" className="overflow-visible">
        <line
          x1="0"
          y1="0"
          x2={distance}
          y2="0"
          strokeWidth="2"
          stroke={isValid ? '#3b82f6' : '#ef4444'}
          strokeDasharray={isTemp ? '5,5' : 'none'}
          markerEnd="url(#arrowhead)"
        />
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={isValid ? '#3b82f6' : '#ef4444'}
            />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

export const DragDropEditor: React.FC<DragDropEditorProps> = ({
  nodes,
  connections,
  templates,
  onNodesChange,
  onConnectionsChange,
  onAddNode,
  onMoveNode,
  onAddConnection,
  onDeleteConnection,
  className = ''
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<NodeTemplate | null>(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const [tempConnection, setTempConnection] = useState<{
    sourceNodeId: string;
    sourceOutputId: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, args) => {
        // Custom coordinate getter for keyboard navigation
        return { x: 0, y: 0 };
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setIsOverCanvas(over?.id === 'canvas');
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (draggedTemplate && over?.id === 'canvas' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: event.delta.x + rect.width / 2,
        y: event.delta.y + rect.height / 2
      };
      await onAddNode(draggedTemplate, position);
    }

    setActiveId(null);
    setDraggedTemplate(null);
    setIsOverCanvas(false);
  }, [draggedTemplate, onAddNode]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Deselect nodes and connections when clicking empty canvas
    if (event.target === event.currentTarget) {
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      setTempConnection(null);
    }
  }, []);

  const handleNodeClick = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
    setTempConnection(null);
  }, []);

  const handleConnectionClick = useCallback((connectionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedConnectionId(connectionId);
    setSelectedNodeId(null);
    setTempConnection(null);
  }, []);

  const handleOutputClick = useCallback((nodeId: string, outputId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (tempConnection) {
      // Complete the connection
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.inputs.some(input => input.id === tempConnection.sourceOutputId)) {
        await onAddConnection({
          sourceNodeId: tempConnection.sourceNodeId,
          sourceOutputId: tempConnection.sourceOutputId,
          targetNodeId: nodeId,
          targetInputId: outputId
        });
      }
      setTempConnection(null);
    } else {
      // Start a new connection
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTempConnection({
          sourceNodeId: nodeId,
          sourceOutputId: outputId,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    }
  }, [tempConnection, nodes, onAddConnection]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (tempConnection) {
      setTempConnection(prev => prev ? {
        ...prev,
        x: event.clientX,
        y: event.clientY
      } : null);
    }
  }, [tempConnection]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    const updatedConnections = connections.filter(c =>
      c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
    );

    onNodesChange(updatedNodes);
    onConnectionsChange(updatedConnections);
    setSelectedNodeId(null);
  }, [nodes, connections, onNodesChange, onConnectionsChange]);

  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    const updatedConnections = connections.filter(c => c.id !== connectionId);
    onConnectionsChange(updatedConnections);
    setSelectedConnectionId(null);
  }, [connections, onConnectionsChange]);

  const handleMoveNode = useCallback(async (nodeId: string, position: { x: number; y: number }) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, position } : node
    );
    onNodesChange(updatedNodes);
    onMoveNode(nodeId, position);
  }, [nodes, onNodesChange, onMoveNode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedConnectionId) {
          handleDeleteConnection(selectedConnectionId);
        }
      } else if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        setTempConnection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, handleDeleteNode, handleDeleteConnection]);

  // Calculate connection points
  const getConnectionPoints = () => {
    const points: Array<{
      id: string;
      x: number;
      y: number;
      nodeId: string;
      type: 'input' | 'output';
      portId: string;
    }> = [];

    nodes.forEach(node => {
      const nodeElement = document.getElementById(`node-${node.id}`);
      if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();

        if (canvasRect) {
          const x = rect.left - canvasRect.left;
          const y = rect.top - canvasRect.top;

          // Add input points
          node.inputs.forEach((input, index) => {
            points.push({
              id: `${node.id}-input-${input.id}`,
              x: x,
              y: y + 20 + (index * 15),
              nodeId: node.id,
              type: 'input',
              portId: input.id
            });
          });

          // Add output points
          node.outputs.forEach((output, index) => {
            points.push({
              id: `${node.id}-output-${output.id}`,
              x: x + rect.width,
              y: y + 20 + (index * 15),
              nodeId: node.id,
              type: 'output',
              portId: output.id
            });
          });
        }
      }
    });

    return points;
  };

  const connectionPoints = getConnectionPoints();

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Template Palette */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Node Templates</h3>

        <div className="space-y-2">
          {templates.map(template => (
            <TemplateItem
              key={template.id}
              template={template}
              onDragStart={setDraggedTemplate}
            />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={canvasRef}
            id="canvas"
            className="w-full h-full bg-gray-100 relative"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          >
            {/* Connection lines */}
            {connections.map(connection => {
              const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
              const targetNode = nodes.find(n => n.id === connection.targetNodeId);

              if (!sourceNode || !targetNode) return null;

              return (
                <div key={connection.id}>
                  <ConnectionLine
                    source={{ x: sourceNode.position.x + 180, y: sourceNode.position.y + 30 }}
                    target={{ x: targetNode.position.x, y: targetNode.position.y + 30 }}
                    isValid={true}
                    onClick={(e) => handleConnectionClick(connection.id, e)}
                    className={`cursor-pointer ${
                      selectedConnectionId === connection.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  />
                </div>
              );
            })}

            {/* Temporary connection line */}
            {tempConnection && (
              <ConnectionLine
                source={{
                  x: tempConnection.x,
                  y: tempConnection.y
                }}
                target={{
                  x: tempConnection.x,
                  y: tempConnection.y
                }}
                isValid={true}
                isTemp={true}
              />
            )}

            {/* Workflow nodes */}
            <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {nodes.map(node => (
                <SortableWorkflowNode
                  key={node.id}
                  node={node}
                  isDragging={activeId === node.id}
                  onDelete={handleDeleteNode}
                  onConfigure={(nodeId) => console.log('Configure node:', nodeId)}
                />
              ))}
            </SortableContext>

            {/* Drop zone indicator */}
            {isOverCanvas && (
              <div className="absolute inset-0 bg-blue-50 bg-opacity-50 border-2 border-dashed border-blue-400 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">Drop to add node</span>
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeId && draggedTemplate ? (
              <div className="px-4 py-3 bg-white rounded-lg border-2 border-blue-500 shadow-lg opacity-80">
                <div className="flex items-center space-x-2">
                  {draggedTemplate.icon && <span className="text-lg">{draggedTemplate.icon}</span>}
                  <span className="font-medium">{draggedTemplate.name}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Canvas toolbar */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 flex space-x-2">
          <button
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => console.log('Save workflow')}
          >
            Save
          </button>
          <button
            className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            onClick={() => console.log('Execute workflow')}
          >
            Execute
          </button>
          <button
            className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={() => console.log('Validate workflow')}
          >
            Validate
          </button>
        </div>

        {/* Selection info */}
        {(selectedNodeId || selectedConnectionId) && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
            <h4 className="font-medium text-sm mb-1">
              {selectedNodeId ? 'Selected Node' : 'Selected Connection'}
            </h4>
            <p className="text-xs text-gray-600">
              {selectedNodeId ? 'Press Delete to remove' : 'Press Delete to remove'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropEditor;