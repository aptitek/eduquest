import React, { useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface GraphNode<TMetadata = unknown> {
  id: string;
  label: string;
  x?: number;
  y?: number;
  prerequisites?: string[];
  isCompleted?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
  isStormed?: boolean;
  icon?: React.ReactNode;
  customClass?: string;
  metadata?: TMetadata;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
}

interface GenericGraphProps<TMetadata = unknown> {
  nodes: GraphNode<TMetadata>[];
  edges?: GraphEdge[];
  width?: number;
  height?: number;
  onSelectNode?: (node: GraphNode<TMetadata>) => void;
  className?: string;
}

interface LayoutNode<TMetadata = unknown> extends GraphNode<TMetadata> {
  x: number;
  y: number;
}

/**
 * Deterministic layered DAG graph layout resolver (Sugiyama style) (KISS).
 */
function calculateGraphLayout<TMetadata>(
  nodes: GraphNode<TMetadata>[],
  width: number,
  height: number
): LayoutNode<TMetadata>[] {
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

  const layoutNodes: LayoutNode<TMetadata>[] = [];

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
        x: node.x ?? x,
        y: node.y ?? y,
      });
    });
  });

  return layoutNodes;
}

export function GenericGraph<TMetadata = unknown>({
  nodes,
  edges,
  width = 800,
  height = 600,
  onSelectNode,
  className,
}: GenericGraphProps<TMetadata>) {
  const layoutedNodes = calculateGraphLayout(nodes, width, height);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.height = `${height}px`;
      containerRef.current.style.minWidth = `${Math.min(width, 640)}px`;
    }
  }, [height, width]);

  const renderedEdges: GraphEdge[] =
    edges ||
    layoutedNodes.flatMap((node) =>
      (node.prerequisites || []).map((preReqId) => ({
        id: `${preReqId}-${node.id}`,
        from: preReqId,
        to: node.id,
      }))
    );

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
        'relative w-full overflow-auto shadow-xl bg-gaming-base border border-gaming-border rounded-lg',
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

        {renderedEdges.map((edge) => {
          const fromNode = layoutedNodes.find((node) => node.id === edge.from);
          const toNode = layoutedNodes.find((node) => node.id === edge.to);
          if (!fromNode || !toNode || edge.isHidden || fromNode.isHidden || toNode.isHidden) return null;

            return (
              <line
                key={edge.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={
                  edge.isCompleted || (fromNode.isCompleted && toNode.isCompleted)
                    ? 'url(#line-gradient-completed)'
                    : 'url(#line-gradient-locked)'
                }
                strokeWidth={3}
                strokeDasharray={edge.isLocked || fromNode.isLocked || toNode.isLocked ? '6 6' : undefined}
                className="transition-all duration-500"
              />
            );
        })}
      </svg>

      {/* Node Renderers */}
      {layoutedNodes.filter((node) => !node.isHidden).map((node) => (
        <div
          key={node.id}
          ref={setNodeStyle(node.x, node.y)}
          className="flex flex-col items-center gap-2 group z-10"
        >
          <button
            type="button"
            onClick={() => onSelectNode?.(node)}
            disabled={node.isLocked || node.isStormed}
            aria-label={node.label}
            title={node.label}
            className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300',
              node.customClass
                ? node.customClass
                : node.isLocked
                  ? 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed'
                  : node.isCompleted
                    ? 'bg-status-completed/10 border-status-completed text-status-completed hover:border-status-completed cursor-pointer motion-safe:hover:scale-110 shadow-lg'
                    : 'bg-gaming-card motion-safe:hover:scale-110 cursor-pointer shadow-md'
            )}
          >
            {node.icon}
          </button>

          <div className="absolute top-14 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gaming-base border border-gaming-border px-2 py-1 rounded-sm text-xs text-text-muted font-semibold whitespace-nowrap shadow-md">
            {node.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default GenericGraph;
