import React, { useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface GraphNode {
  id: string;
  label: string;
  prerequisites?: string[];
  isCompleted?: boolean;
  isLocked?: boolean;
  icon?: React.ReactNode;
  customClass?: string;
  [key: string]: any; // Allow passing extra metadata
}

interface GenericGraphProps {
  nodes: GraphNode[];
  width?: number;
  height?: number;
  onSelectNode?: (node: GraphNode) => void;
  className?: string;
}

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
}

/**
 * Deterministic layered DAG graph layout resolver (Sugiyama style) (KISS).
 */
function calculateGraphLayout(nodes: GraphNode[], width: number, height: number): LayoutNode[] {
  if (nodes.length === 0) return [];

  const layers: Map<string, number> = new Map();

  // 1. Initialize depth layer at 0 for all nodes
  for (const node of nodes) {
    layers.set(node.id, 0);
  }

  // 2. Resolve depth layer based on prerequisites (longest path algorithm)
  let changed = true;
  let iterations = 0;
  const maxIterations = nodes.length * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    for (const node of nodes) {
      const currentDepth = layers.get(node.id) || 0;
      let targetDepth = 0;

      const preReqs = node.prerequisites || [];
      for (const preReqId of preReqs) {
        const preReqDepth = layers.get(preReqId) ?? -1;
        if (preReqDepth !== -1) {
          targetDepth = Math.max(targetDepth, preReqDepth + 1);
        }
      }

      if (targetDepth !== currentDepth) {
        layers.set(node.id, targetDepth);
        changed = true;
      }
    }
  }

  // 3. Group node IDs by layer depth
  const layerGroups: Map<number, string[]> = new Map();
  for (const [id, depth] of layers.entries()) {
    if (!layerGroups.has(depth)) {
      layerGroups.set(depth, []);
    }
    layerGroups.get(depth)!.push(id);
  }

  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  const totalLayers = sortedLayers.length;

  const layoutNodes: LayoutNode[] = [];

  // 4. Assign dynamic spatial coordinates (x, y) centered vertically
  const paddingX = 100;
  const paddingY = 80;
  const availableWidth = width - paddingX * 2;
  const availableHeight = height - paddingY * 2;

  const stepX = totalLayers > 1 ? availableWidth / (totalLayers - 1) : availableWidth;

  sortedLayers.forEach((layerDepth, layerIndex) => {
    const nodeIds = layerGroups.get(layerDepth) || [];
    const totalNodesInLayer = nodeIds.length;

    nodeIds.forEach((id, nodeIndex) => {
      const node = nodes.find((n) => n.id === id)!;

      // Calculate dynamic X (horizontal column progress)
      const x = paddingX + layerIndex * stepX;

      // Calculate dynamic Y (vertical spread within layer column, centered)
      let y = height / 2;
      if (totalNodesInLayer > 1) {
        const stepY = availableHeight / (totalNodesInLayer - 1);
        y = paddingY + nodeIndex * stepY;
      }

      layoutNodes.push({
        ...node,
        x,
        y,
      });
    });
  });

  return layoutNodes;
}

export function GenericGraph({
  nodes,
  width = 800,
  height = 600,
  onSelectNode,
  className,
}: GenericGraphProps) {
  const layoutedNodes = calculateGraphLayout(nodes, width, height);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.height = `${height}px`;
    }
  }, [height]);

  const setNodeStyle = (x: number, y: number) => (el: HTMLDivElement | null) => {
    if (el) {
      el.style.position = 'absolute';
      el.style.left = `${x - 24}px`;
      el.style.top = `${y - 24}px`;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden shadow-xl bg-gaming-base border border-gaming-border rounded-lg',
        className
      )}
    >
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-gaming-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gaming-grid)_1px,transparent_1px)] bg-[size:theme(spacing.16)_theme(spacing.16)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-bg-card),transparent_70%)]"></div>

      {/* SVG Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="line-gradient-completed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-status-completed)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-status-completed)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="line-gradient-locked" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-status-locked)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-status-locked)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {layoutedNodes.map((node) => {
          if (!node.prerequisites) return null;

          return node.prerequisites.map((preReqId) => {
            const preReqNode = layoutedNodes.find((n) => n.id === preReqId);
            if (!preReqNode) return null;

            const isPathCompleted = node.isCompleted && preReqNode.isCompleted;
            const isPathLocked = node.isLocked || preReqNode.isLocked;

            return (
              <line
                key={`${preReqId}-${node.id}`}
                x1={preReqNode.x}
                y1={preReqNode.y}
                x2={node.x}
                y2={node.y}
                stroke={
                  isPathCompleted ? 'url(#line-gradient-completed)' : 'url(#line-gradient-locked)'
                }
                strokeWidth={3}
                strokeDasharray={isPathLocked ? '6 6' : undefined}
                className="transition-all duration-500"
              />
            );
          });
        })}
      </svg>

      {/* Node Renderers */}
      {layoutedNodes.map((node) => (
        <div
          key={node.id}
          ref={setNodeStyle(node.x, node.y)}
          className="flex flex-col items-center gap-2 group z-10"
        >
          <button
            onClick={() => onSelectNode?.(node)}
            disabled={node.isLocked}
            className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300',
              node.customClass
                ? node.customClass
                : node.isLocked
                  ? 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed'
                  : node.isCompleted
                    ? 'bg-status-completed/10 border-status-completed text-status-completed hover:border-status-completed cursor-pointer hover:scale-110 shadow-lg'
                    : 'bg-gaming-card hover:scale-110 cursor-pointer shadow-md'
            )}
          >
            {node.icon}
          </button>

          <div className="absolute top-14 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gaming-base border border-gaming-border px-2 py-1 rounded-sm text-xs text-text-muted font-semibold whitespace-nowrap shadow-md">
            {node.label} {node.isLocked && '🔒'}
          </div>
        </div>
      ))}
    </div>
  );
}

export default GenericGraph;
