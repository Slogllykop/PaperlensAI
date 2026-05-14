/** biome-ignore-all lint/style/noNonNullAssertion: Intended */
"use client";

import {
    Background,
    BackgroundVariant,
    Controls,
    type Edge,
    Handle,
    type Node,
    type NodeProps,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import type { MindMap, MindMapNode } from "@/lib/types";

// Custom node data
type MindMapNodeData = {
    label: string;
    depth: number;
    hasChildren: boolean;
    isCollapsed: boolean;
    onToggle: (nodeId: string) => void;
    nodeId: string;
};
type MindMapFlowNode = Node<MindMapNodeData, "mindmap">;

function MindMapNodeComponent({ data }: NodeProps<MindMapFlowNode>) {
    const isRoot = data.depth === 0;
    const isMainBranch = data.depth === 1;

    let shapeClasses = "";
    let colorClasses = "";
    let maxWidth = 180;

    if (isRoot) {
        shapeClasses = "rounded-full px-6 py-4";
        colorClasses =
            "border-primary/40 bg-primary text-primary-foreground font-bold text-base shadow-md";
        maxWidth = 260;
    } else if (isMainBranch) {
        shapeClasses = "rounded-xl px-4 py-2.5";
        colorClasses =
            "border-primary/30 bg-primary/10 text-foreground font-semibold text-sm shadow-sm";
        maxWidth = 220;
    } else {
        shapeClasses = "rounded-full px-4 py-1.5";
        colorClasses =
            "border-border/50 bg-card/90 text-muted-foreground text-xs font-medium";
        maxWidth = 160;
    }

    return (
        <div className="relative">
            <div
                className={`border text-center transition-all hover:scale-105 ${shapeClasses} ${colorClasses}`}
                style={{ maxWidth }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    className="opacity-0"
                />
                <span className="leading-snug">{data.label}</span>
                <Handle
                    type="source"
                    position={Position.Right}
                    className="opacity-0"
                />
            </div>

            {/* Collapse/expand toggle */}
            {data.hasChildren && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onToggle(data.nodeId);
                    }}
                    className="nodrag nopan -right-2.5 -translate-y-1/2 absolute top-1/2 flex size-5 items-center justify-center rounded-full border border-border/60 bg-card font-bold text-[10px] text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    title={
                        data.isCollapsed ? "Expand branch" : "Collapse branch"
                    }
                >
                    {data.isCollapsed ? "+" : "−"}
                </button>
            )}
        </div>
    );
}

// Define nodeTypes outside component to avoid re-renders
const nodeTypes = { mindmap: MindMapNodeComponent };

// Convert tree to flat nodes/edges, respecting collapsed state
function treeToFlow(
    root: MindMapNode,
    collapsedIds: Set<string>,
    onToggle: (nodeId: string) => void,
) {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Pre-calculate heights (skipping collapsed subtrees)
    function getSubtreeHeight(node: MindMapNode): number {
        if (collapsedIds.has(node.id)) return 1;
        if (!node.children || node.children.length === 0) return 1;
        return node.children.reduce(
            (acc, child) => acc + getSubtreeHeight(child),
            0,
        );
    }

    function traverse(
        node: MindMapNode,
        depth: number,
        parentId: string | null,
        yBase: number,
    ) {
        const xSpacing = 320;
        const ySpacing = 100;

        const subtreeHeight = getSubtreeHeight(node);
        const x = depth * xSpacing;
        const y = yBase + (subtreeHeight * ySpacing) / 2 - ySpacing / 2;

        const hasChildren = !!(node.children && node.children.length > 0);
        const isCollapsed = collapsedIds.has(node.id);

        nodes.push({
            id: node.id,
            type: "mindmap",
            position: { x, y },
            data: {
                label: node.label,
                depth,
                hasChildren,
                isCollapsed,
                onToggle,
                nodeId: node.id,
            },
        });

        if (parentId) {
            edges.push({
                id: `e-${parentId}-${node.id}`,
                source: parentId,
                target: node.id,
                type: "smoothstep",
                animated: depth === 1,
                style: {
                    stroke: "var(--primary)",
                    opacity: 0.4,
                    strokeWidth: depth === 1 ? 2.5 : 1.5,
                },
            });
        }

        // Only traverse children if not collapsed
        if (!isCollapsed) {
            const children = node.children;
            if (children && children.length > 0) {
                let currentYBase = yBase;
                children.forEach((child) => {
                    traverse(child, depth + 1, node.id, currentYBase);
                    currentYBase += getSubtreeHeight(child) * ySpacing;
                });
            }
        }
    }

    traverse(root, 0, null, 0);
    return { nodes, edges };
}

interface MindMapViewProps {
    mindMap: MindMap;
}

function MindMapInner({ mindMap }: MindMapViewProps) {
    const { theme } = useTheme();
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    const handleToggle = useCallback((nodeId: string) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = treeToFlow(
            mindMap.root,
            collapsedIds,
            handleToggle,
        );
        setNodes(newNodes);
        setEdges(newEdges);
    }, [mindMap.root, collapsedIds, handleToggle, setNodes, setEdges]);

    return (
        <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border/50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.3}
                maxZoom={1.5}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                colorMode={theme === "dark" ? "dark" : "light"}
            >
                <Background
                    gap={20}
                    size={1}
                    variant={BackgroundVariant.Dots}
                />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

export function MindMapView({ mindMap }: MindMapViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <h2 className="mb-3 font-bold text-lg">Mind Map</h2>
            <ReactFlowProvider>
                <MindMapInner mindMap={mindMap} />
            </ReactFlowProvider>
        </motion.div>
    );
}
