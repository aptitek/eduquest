import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ViewportPortal,
  getBezierPath,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  useReactFlow,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { HoldToConfirmButton } from '../atoms/HoldToConfirmButton';
import { AvatarDeck, type AvatarDeckMember } from './AvatarDeck';
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
  displayLabel?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  marker?: React.ReactNode;
  annularSegments?: GraphNodeAnnularSegment[];
  customClass?: string;
  customStyle?: React.CSSProperties;
  fogState?: 'fog' | 'clear';
  metadata?: TMetadata;
}

export interface GraphNodeAnnularSegment {
  id: string;
  color: string;
  value: number;
  total: number;
  label?: string;
  iconUrl?: string;
  kind?: 'guild' | 'solo';
  members?: GraphNodeAnnularMember[];
}

export type GraphNodeAnnularMember = AvatarDeckMember;

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  strokeDasharray?: string;
  animation?: 'none' | 'flow' | 'pulse';
}

interface GenericGraphProps<TMetadata = unknown> {
  nodes: GraphNode<TMetadata>[];
  edges?: GraphEdge[];
  width?: number;
  height?: number | string;
  onSelectNode?: (node: GraphNode<TMetadata>) => void;
  onNodeMove?: (node: GraphNode<TMetadata>, position: { x: number; y: number }) => void;
  onConnectNodes?: (edge: GraphEdge) => void;
  onDeleteEdges?: (edges: GraphEdge[]) => void;
  allowLockedSelection?: boolean;
  editable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  renderNode?: (node: GraphNode<TMetadata>) => React.ReactNode;
  className?: string;
}

interface LayoutNode<TMetadata = unknown> extends GraphNode<TMetadata> {
  x: number;
  y: number;
}

interface GraphFlowNodeData<TMetadata = unknown> extends Record<string, unknown> {
  graphNode: LayoutNode<TMetadata>;
  allowLockedSelection: boolean;
  onSelectNode?: (node: GraphNode<TMetadata>) => void;
  renderNode?: (node: GraphNode<TMetadata>) => React.ReactNode;
}

type GraphFlowNode<TMetadata = unknown> = Node<GraphFlowNodeData<TMetadata>, 'graph-node'>;

interface GraphFlowEdgeData extends Record<string, unknown> {
  graphEdge: GraphEdge;
  deletable: boolean;
  onDeleteEdge?: (edge: GraphEdge) => void;
}

type GraphFlowEdge = Edge<GraphFlowEdgeData, 'graph-edge'>;

const NODE_SIZE = 48;
const ANNULAR_RING_SIZE = 84;
const ANNULAR_RING_RADIUS = 31;
const ANNULAR_RING_CENTER = ANNULAR_RING_SIZE / 2;
const ANNULAR_RING_GAP_START = 315;
const ANNULAR_RING_GAP_END = 585;
const ANNULAR_SEGMENT_GAP = 1.4;
const GRAPH_EDGE_ANIMATION_STYLES = `
@keyframes graph-edge-flow {
  to {
    stroke-dashoffset: -56;
  }
}

@keyframes graph-edge-pulse {
  0%, 100% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.95;
  }
}

.graph-edge-flow {
  animation: graph-edge-flow 1.8s linear infinite;
  stroke-dasharray: 10 18;
  stroke-linecap: round;
}

.graph-edge-pulse {
  animation: graph-edge-pulse 2.4s ease-in-out infinite;
  stroke-linecap: round;
}

@media (prefers-reduced-motion: reduce) {
  .graph-edge-flow,
  .graph-edge-pulse,
  .graph-fog-cloud {
    animation: none;
  }
}

@keyframes graph-fog-drift {
  0% {
    transform: translate3d(-28px, 0, 0);
  }
  50% {
    transform: translate3d(34px, -10px, 0);
  }
  100% {
    transform: translate3d(-28px, 0, 0);
  }
}

@keyframes graph-fog-drift-reverse {
  0% {
    transform: translate3d(34px, 6px, 0);
  }
  50% {
    transform: translate3d(-30px, -8px, 0);
  }
  100% {
    transform: translate3d(34px, 6px, 0);
  }
}

.graph-fog-cloud {
  transform-box: fill-box;
  transform-origin: center;
  animation: graph-fog-drift 18s ease-in-out infinite;
}

.graph-fog-cloud-reverse {
  animation-name: graph-fog-drift-reverse;
  animation-duration: 24s;
}
`;

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
  onNodeMove,
  onConnectNodes,
  onDeleteEdges,
  allowLockedSelection = false,
  editable = false,
  connectable = false,
  deletable = false,
  renderNode,
  className,
}: GenericGraphProps<TMetadata>) {
  const fogMaskId = useId();
  const layoutHeight = typeof height === 'number' ? height : 600;
  const layoutedNodes = useMemo(() => calculateGraphLayout(nodes, width, layoutHeight), [layoutHeight, nodes, width]);
  const fogNodes = useMemo(() => layoutedNodes.filter((node) => node.fogState === 'fog'), [layoutedNodes]);
  const clearFogNodes = useMemo(() => layoutedNodes.filter((node) => node.fogState === 'clear'), [layoutedNodes]);
  const renderedEdges = useMemo<GraphEdge[]>(
    () =>
      edges ||
      layoutedNodes.flatMap((node) =>
        (node.prerequisites || []).map((preReqId) => ({
          id: `${preReqId}-${node.id}`,
          from: preReqId,
          to: node.id,
        }))
      ),
    [edges, layoutedNodes]
  );

  const initialFlowNodes = useMemo(
    () =>
      layoutedNodes
        .filter((node) => !node.isHidden)
        .map<GraphFlowNode<TMetadata>>((node) => ({
          id: node.id,
          type: 'graph-node',
          position: { x: node.x - NODE_SIZE / 2, y: node.y - NODE_SIZE / 2 },
          draggable: editable && !node.isLocked,
          selectable: allowLockedSelection || !node.isLocked,
          connectable: connectable && !node.isLocked,
          data: {
            graphNode: node,
            allowLockedSelection,
            onSelectNode,
            renderNode,
          },
        })),
    [allowLockedSelection, connectable, editable, layoutedNodes, onSelectNode, renderNode]
  );

  const initialFlowEdges = useMemo(() => {
    const visibleNodeIds = new Set(initialFlowNodes.map((node) => node.id));

    return renderedEdges.flatMap<GraphFlowEdge>((edge) => {
      if (edge.isHidden || !visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) return [];

      const isCompleted = edge.isCompleted;
      const isLocked = edge.isLocked;
      const stroke = edge.color || (isCompleted ? 'var(--color-status-completed)' : 'var(--color-status-locked)');

      return {
        id: edge.id,
        type: 'graph-edge',
        source: edge.from,
        target: edge.to,
        animated: edge.animation !== 'none' && Boolean(edge.animation || isCompleted),
        reconnectable: connectable,
        data: {
          graphEdge: edge,
          deletable,
          onDeleteEdge: (deletedEdge) => onDeleteEdges?.([deletedEdge]),
        },
        style: {
          stroke,
          strokeOpacity: edge.opacity ?? (isCompleted ? 0.55 : 0.3),
          strokeWidth: edge.strokeWidth ?? 3,
          strokeDasharray: edge.strokeDasharray ?? (isLocked ? '6 6' : undefined),
        },
      };
    });
  }, [connectable, deletable, initialFlowNodes, onDeleteEdges, renderedEdges]);

  const [flowNodes, setFlowNodes] = useState(initialFlowNodes);
  const [flowEdges, setFlowEdges] = useState(initialFlowEdges);

  useEffect(() => {
    setFlowNodes(initialFlowNodes);
  }, [initialFlowNodes]);

  useEffect(() => {
    setFlowEdges(initialFlowEdges);
  }, [initialFlowEdges]);

  const onNodesChange = useCallback((changes: NodeChange<GraphFlowNode<TMetadata>>[]) => {
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setFlowEdges((currentEdges) => applyEdgeChanges(changes, currentEdges) as GraphFlowEdge[]);
  }, []);

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      onDeleteEdges?.(
        deletedEdges.map((edge) => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
        }))
      );
    },
    [onDeleteEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const edgeId = `${connection.source}-${connection.target}`;
      const graphEdge: GraphEdge = {
        id: edgeId,
        from: connection.source,
        to: connection.target,
      };

      setFlowEdges((currentEdges) => [
        ...currentEdges,
        {
          id: edgeId,
          type: 'graph-edge',
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          reconnectable: connectable,
          data: {
            graphEdge,
            deletable,
            onDeleteEdge: (deletedEdge) => onDeleteEdges?.([deletedEdge]),
          },
          style: {
            stroke: 'var(--color-status-locked)',
            strokeOpacity: 0.3,
            strokeWidth: 3,
          },
        },
      ]);
      onConnectNodes?.(graphEdge);
    },
    [connectable, deletable, onConnectNodes, onDeleteEdges]
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: GraphFlowNode<TMetadata>) => {
      onNodeMove?.(node.data.graphNode, {
        x: Math.round(node.position.x + NODE_SIZE / 2),
        y: Math.round(node.position.y + NODE_SIZE / 2),
      });
    },
    [onNodeMove]
  );

  const nodeTypes = useMemo(() => ({ 'graph-node': GraphFlowNodeRenderer }), []);
  const edgeTypes = useMemo(() => ({ 'graph-edge': GraphFlowEdgeRenderer }), []);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg border border-gaming-border bg-gaming-base shadow-xl',
        className
      )}
      style={{ height, minWidth: 0 }}
    >
      <style>{GRAPH_EDGE_ANIMATION_STYLES}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-bg-card),transparent_70%)]" />
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={editable ? onNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onConnect={connectable ? handleConnect : undefined}
        onEdgesDelete={deletable ? handleEdgesDelete : undefined}
        onNodeDragStop={editable ? handleNodeDragStop : undefined}
        nodesDraggable={editable}
        nodesConnectable={connectable}
        edgesFocusable={deletable}
        edgesReconnectable={connectable}
        deleteKeyCode={deletable ? ['Backspace', 'Delete'] : null}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        className="text-text-primary"
      >
        <Background color="var(--color-gaming-grid)" gap={64} />
        {fogNodes.length > 0 ? (
          <ViewportPortal>
            <GraphFogLayer
              maskId={fogMaskId}
              fogNodes={fogNodes}
              clearNodes={clearFogNodes}
              width={width}
              height={layoutHeight}
            />
          </ViewportPortal>
        ) : null}
        {editable ? <Controls className="!border-gaming-border !bg-gaming-card !shadow-lg" /> : null}
      </ReactFlow>
    </div>
  );
}

function GraphFogLayer<TMetadata>({
  maskId,
  fogNodes,
  clearNodes,
  width,
  height,
}: {
  maskId: string;
  fogNodes: LayoutNode<TMetadata>[];
  clearNodes: LayoutNode<TMetadata>[];
  width: number;
  height: number;
}) {
  const expandedX = -240;
  const expandedY = -180;
  const expandedWidth = width + 480;
  const expandedHeight = height + 360;
  const fogBunches = buildFogBunches({
    fogNodes,
    clearNodes,
    expandedX,
    expandedY,
    expandedWidth,
    expandedHeight,
  });

  return (
    <svg
      width={expandedWidth}
      height={expandedHeight}
      viewBox={`${expandedX} ${expandedY} ${expandedWidth} ${expandedHeight}`}
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      <defs>
        <filter id={`${maskId}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      <g filter={`url(#${maskId}-blur)`}>
        {fogBunches.map((bunch) => (
          <g
            key={bunch.id}
            className={cn('graph-fog-cloud', bunch.reverse && 'graph-fog-cloud-reverse')}
            opacity={bunch.opacity}
          >
            {bunch.clouds.map((cloud) => (
              <ellipse
                key={cloud.id}
                cx={cloud.x}
                cy={cloud.y}
                rx={cloud.rx}
                ry={cloud.ry}
                fill={cloud.fill}
                opacity={cloud.opacity}
                transform={`rotate(${cloud.rotation} ${cloud.x} ${cloud.y})`}
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

interface FogCloud {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  opacity: number;
  fill: string;
  rotation: number;
  reverse?: boolean;
}

interface FogBunch {
  id: string;
  opacity: number;
  reverse?: boolean;
  alwaysCover?: boolean;
  clouds: FogCloud[];
}

function buildFogBunches<TMetadata>({
  fogNodes,
  clearNodes,
  expandedX,
  expandedY,
  expandedWidth,
  expandedHeight,
}: {
  fogNodes: LayoutNode<TMetadata>[];
  clearNodes: LayoutNode<TMetadata>[];
  expandedX: number;
  expandedY: number;
  expandedWidth: number;
  expandedHeight: number;
}) {
  const clearNodeCenterX =
    clearNodes.length > 0
      ? clearNodes.reduce((total, node) => total + node.x, 0) / clearNodes.length
      : expandedX + expandedWidth / 2;
  const avoidRightSide = clearNodeCenterX > expandedX + expandedWidth / 2;
  const ambientBunches = Array.from({ length: 18 }, (_, index): FogBunch | undefined => {
    const seed = index + 1;
    const row = Math.floor(index / 6);
    const column = index % 6;
    const cellWidth = expandedWidth / 6;
    const cellHeight = expandedHeight / 3;
    const biasOffset = avoidRightSide ? -cellWidth * 0.38 : cellWidth * 0.38;
    const x = expandedX + cellWidth * (column + 0.5) + biasOffset + seededRange(seed, -86, 86);
    const y = expandedY + cellHeight * (row + 0.5) + seededRange(seed * 3, -64, 64);
    const isOnAvoidedSide = avoidRightSide ? x > clearNodeCenterX - 80 : x < clearNodeCenterX + 80;

    if (isOnAvoidedSide && seededRange(seed * 19, 0, 1) < 0.58) return undefined;

    return buildFogBunch({
      id: `ambient-bunch-${index}`,
      x,
      y,
      seed,
      count: 3 + Math.floor(seededRange(seed * 5, 0, 4)),
      opacity: 0.46 + seededRange(seed * 13, 0, 0.18),
      reverse: index % 2 === 1,
    });
  });
  const localBunches = fogNodes.map((node, nodeIndex) =>
    buildFogBunch({
      id: `node-bunch-${node.id}`,
      x: node.x + seededRange((nodeIndex + 1) * 7, -42, 42),
      y: node.y + seededRange((nodeIndex + 1) * 11, -28, 42),
      seed: (nodeIndex + 1) * 23,
      count: 8,
      opacity: 0.72,
      reverse: nodeIndex % 2 === 1,
      local: true,
      alwaysCover: true,
    })
  );

  return [...ambientBunches, ...localBunches].flatMap((bunch) => {
    if (!bunch) return [];
    const clouds = bunch.alwaysCover ? bunch.clouds : bunch.clouds.flatMap((cloud) => avoidClearNodes(cloud, clearNodes));
    return clouds.length > 0 ? [{ ...bunch, clouds }] : [];
  });
}

function buildFogBunch({
  id,
  x,
  y,
  seed,
  count,
  opacity,
  reverse,
  alwaysCover = false,
  local = false,
}: {
  id: string;
  x: number;
  y: number;
  seed: number;
  count: number;
  opacity: number;
  reverse?: boolean;
  alwaysCover?: boolean;
  local?: boolean;
}): FogBunch {
  return {
    id,
    opacity,
    reverse,
    alwaysCover,
    clouds: [
      ...(local
        ? [
            {
              id: `${id}-cover`,
              x,
              y,
              rx: 210,
              ry: 62,
              opacity: 0.78,
              fill: 'var(--color-solarized-base1)',
              rotation: seededRange(seed * 29, -6, 6),
            } satisfies FogCloud,
          ]
        : []),
      ...Array.from({ length: count }, (_, index): FogCloud => {
      const cloudSeed = seed * 31 + index * 17;
      const spread = local ? 112 : 156;
      const size = seededRange(cloudSeed * 7, 0, 1);

      return {
        id: `${id}-${index}`,
        x: x + seededRange(cloudSeed, -spread, spread),
        y: y + seededRange(cloudSeed * 3, local ? -54 : -72, local ? 54 : 72),
        rx: (local ? 126 : 108) + size * (local ? 132 : 170),
        ry: (local ? 28 : 24) + seededRange(cloudSeed * 11, 0, local ? 38 : 34),
        opacity: 0.54 + seededRange(cloudSeed * 13, 0, 0.36),
        fill: index % 3 === 0 ? 'var(--color-solarized-base0)' : 'var(--color-solarized-base1)',
        rotation: seededRange(cloudSeed * 17, -10, 10),
      };
    }),
    ],
  };
}

function avoidClearNodes<TMetadata>(cloud: FogCloud, clearNodes: LayoutNode<TMetadata>[]) {
  if (clearNodes.length === 0) return [cloud];

  const nearestDistance = Math.min(
    ...clearNodes.map((node) => {
      const horizontalRadius = 112 + cloud.rx * 0.48;
      const verticalRadius = 76 + cloud.ry * 0.82;
      const dx = (cloud.x - node.x) / horizontalRadius;
      const dy = (cloud.y - node.y) / verticalRadius;
      return Math.sqrt(dx * dx + dy * dy);
    })
  );

  if (nearestDistance < 0.72) return [];
  if (nearestDistance < 1.02) {
    const scale = 0.68 + (nearestDistance - 0.72) * 0.74;
    return [
      {
        ...cloud,
        rx: cloud.rx * scale,
        ry: cloud.ry * scale,
        opacity: cloud.opacity * Math.min(1, scale),
      },
    ];
  }

  return [cloud];
}

function seededRange(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 999) * 10000;
  return min + (x - Math.floor(x)) * (max - min);
}

function GraphFlowNodeRenderer({ data, isConnectable }: NodeProps<GraphFlowNode>) {
  const node = data.graphNode;
  const isDisabled = !data.allowLockedSelection && node.isLocked;
  const handleClassName = cn(
    '!h-2 !w-2 !border-status-quest !bg-gaming-card',
    !isConnectable && '!opacity-0 pointer-events-none'
  );

  return (
    <div className="group/graph-node relative flex flex-col items-center gap-2">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className={handleClassName}
      />
      {node.annularSegments?.length ? (
        <AnnularNodeRing segments={node.annularSegments} hasAvatarGap={Boolean(node.marker)} />
      ) : null}
      <button
        type="button"
        onClick={() => data.onSelectNode?.(node)}
        disabled={isDisabled}
        aria-label={node.displayLabel || node.label}
        title={node.displayLabel || node.label}
        className={cn(
          'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300',
          node.customClass
            ? node.customClass
            : node.isLocked
              ? 'cursor-not-allowed border-status-locked bg-gaming-base text-text-muted'
              : node.isCompleted
                ? 'cursor-pointer border-status-completed bg-status-completed/10 text-status-completed shadow-lg hover:border-status-completed motion-safe:hover:scale-110'
                : 'cursor-pointer bg-gaming-card shadow-md motion-safe:hover:scale-110'
        )}
        style={node.customStyle}
      >
        {data.renderNode ? data.renderNode(node) : node.icon}
      </button>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className={handleClassName}
      />
      {node.badge ? (
        <div className="pointer-events-none absolute bottom-4 right-1 z-20 translate-x-1/2 translate-y-1/2">
          {node.badge}
        </div>
      ) : null}
      {node.marker ? (
        <div className="pointer-events-auto absolute -top-5 left-1/2 z-30 -translate-x-1/2">
          {node.marker}
        </div>
      ) : null}
      <div className="pointer-events-none absolute top-14 whitespace-nowrap rounded-sm border border-gaming-border bg-gaming-base px-2 py-1 text-xs font-semibold text-text-muted opacity-0 shadow-md transition-opacity duration-200 group-hover/graph-node:opacity-100">
        {node.displayLabel || node.label}
      </div>
    </div>
  );
}

function AnnularNodeRing({
  segments,
  hasAvatarGap,
}: {
  segments: GraphNodeAnnularSegment[];
  hasAvatarGap: boolean;
}) {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const activeSegment = segments.find((segment) => segment.id === activeSegmentId);
  const isExpanded = Boolean(activeSegment);
  const path = describeArc(
    ANNULAR_RING_CENTER,
    ANNULAR_RING_CENTER,
    ANNULAR_RING_RADIUS,
    ANNULAR_RING_GAP_START,
    ANNULAR_RING_GAP_END
  );
  let offset = 0;

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-1/2 z-0 h-[5.4rem] w-[5.4rem] -translate-x-1/2 -translate-y-1/2 overflow-visible"
      onPointerLeave={() => setActiveSegmentId(null)}
    >
      <svg
        viewBox={`0 0 ${ANNULAR_RING_SIZE} ${ANNULAR_RING_SIZE}`}
        aria-hidden="false"
        className={cn(
          'h-full w-full overflow-visible transition-transform duration-300',
          isExpanded
            ? 'scale-100'
            : 'scale-[0.765] group-hover/graph-node:scale-100 group-focus-within/graph-node:scale-100'
        )}
      >
        {hasAvatarGap ? (
          <path
            d={path}
            pathLength={100}
            fill="none"
            stroke="var(--color-gaming-grid)"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.55}
          />
        ) : (
          <circle
            cx={ANNULAR_RING_CENTER}
            cy={ANNULAR_RING_CENTER}
            r={ANNULAR_RING_RADIUS}
            pathLength={100}
            fill="none"
            stroke="var(--color-gaming-grid)"
            strokeWidth={4}
            opacity={0.55}
          />
        )}
        {segments.flatMap((segment) => {
          if (segment.total <= 0 || segment.value <= 0) return [];
          const length = Math.max(0, Math.min(100, (segment.value / segment.total) * 100));
          const visualLength = Math.max(0.5, length - (segments.length > 1 ? ANNULAR_SEGMENT_GAP : 0));
          const dashOffset = -offset;
          offset += length;
          const isActive = activeSegmentId === segment.id;
          const commonProps = {
            pathLength: 100,
            fill: 'none',
            stroke: segment.color,
            strokeWidth: isActive ? 8 : 6,
            strokeLinecap: 'butt' as const,
            strokeDasharray: `${visualLength} ${100 - visualLength}`,
            strokeDashoffset: dashOffset,
            className:
              'pointer-events-auto cursor-help opacity-90 outline-none transition-[opacity,stroke-width] duration-200 hover:opacity-100 focus:opacity-100',
            role: 'button',
            tabIndex: 0,
            onPointerEnter: () => setActiveSegmentId(segment.id),
            onFocus: () => setActiveSegmentId(segment.id),
            onBlur: () => setActiveSegmentId(null),
          };

          if (hasAvatarGap) {
            return <path key={segment.id} d={path} {...commonProps} />;
          }

          return (
            <circle
              key={segment.id}
              cx={ANNULAR_RING_CENTER}
              cy={ANNULAR_RING_CENTER}
              r={ANNULAR_RING_RADIUS}
              {...commonProps}
              strokeDashoffset={25 + dashOffset}
            />
          );
        })}
      </svg>
      {activeSegment ? <RingSectorPopover segment={activeSegment} /> : null}
    </div>
  );
}

function RingSectorPopover({ segment }: { segment: GraphNodeAnnularSegment }) {
  const count = segment.members?.length || segment.value;

  return (
    <div className="pointer-events-auto absolute left-full top-1/2 z-[70] ml-3 w-52 -translate-y-1/2 rounded-2xl border border-gaming-border bg-gaming-card/95 p-3 text-left shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gaming-border bg-gaming-base text-xs font-black text-text-primary"
          style={{ borderColor: segment.color }}
        >
          {segment.iconUrl ? (
            <img src={segment.iconUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitials(segment.label || 'Players')
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">
            {segment.kind === 'solo' ? 'Characters here' : segment.label || 'Guild'}
          </p>
          <p className="text-xs text-text-muted">{count} present</p>
        </div>
      </div>
      {segment.members?.length ? (
        <AvatarDeck members={segment.members} color={segment.color} className="min-w-0" />
      ) : null}
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function GraphFlowEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps<GraphFlowEdge>) {
  const { deleteElements } = useReactFlow<GraphFlowNode, GraphFlowEdge>();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = () => {
    if (data?.graphEdge) {
      data.onDeleteEdge?.(data.graphEdge);
    }
    void deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.graphEdge.animation && data.graphEdge.animation !== 'none' ? (
        <path
          d={edgePath}
          fill="none"
          markerEnd={markerEnd}
          pointerEvents="none"
          className={data.graphEdge.animation === 'flow' ? 'graph-edge-flow' : 'graph-edge-pulse'}
          style={{
            stroke: style?.stroke,
            strokeOpacity: data.graphEdge.animation === 'flow' ? 0.9 : 0.65,
            strokeWidth: Number(style?.strokeWidth || 3) + 1,
          }}
        />
      ) : null}
      {data?.deletable ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            <HoldToConfirmButton
              onConfirm={handleDelete}
              holdDuration={800}
              shape="round"
              variant="border border-status-danger bg-status-danger/10 text-status-danger hover:bg-status-danger hover:text-gaming-base focus:outline-none focus:ring-2 focus:ring-status-danger"
              className="h-7 w-7 shrink-0"
            >
              <X size={14} aria-hidden />
              <span className="sr-only">Delete edge</span>
            </HoldToConfirmButton>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export default GenericGraph;
