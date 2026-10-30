import { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Handle, Position, Background, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiInfo, FiAlertCircle, FiRefreshCw, FiChevronLeft } from 'react-icons/fi';
import { getProjectDependencyGraph, getFriendlyErrorMessage } from '../services/issueApi';
import { getPriorityBadge, getStatusBadge, formatIssueDate } from '../utils/issueUtils';

// ─── Node ────────────────────────────────────────────────────────────────────

const GraphNode = ({ data }) => {
  const issue = data.issue;
  const priorityColor = {
    CRITICAL: 'border-rose-500 dark:border-rose-400',
    HIGH:     'border-amber-500 dark:border-amber-400',
    MEDIUM:   'border-sky-500 dark:border-sky-400',
    LOW:      'border-slate-400 dark:border-slate-500',
  }[issue.priority] || 'border-slate-300 dark:border-slate-600';

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div className={`bg-white dark:bg-[#1e1e1e] border-2 ${priorityColor} rounded-xl shadow-lg p-3 min-w-[260px] max-w-[300px]`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`${getStatusBadge(issue.status)} px-2 py-0.5 text-[10px] font-semibold rounded-md`}>
              {issue.status}
            </span>
            <span className={`${getPriorityBadge(issue.priority)} px-2 py-0.5 text-[10px] font-semibold rounded-md`}>
              {issue.priority}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">#{issue.issueNumber}</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-snug">
          {issue.title}
        </h3>
        {(issue.startDate || issue.dueDate) && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-white/5">
            {issue.startDate && (
              <div>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500">Start</span>
                <span>{formatIssueDate(issue.startDate)}</span>
              </div>
            )}
            {issue.dueDate && (
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 dark:text-slate-500">Due</span>
                <span>{formatIssueDate(issue.dueDate)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

// ─── Custom Controls (must live inside ReactFlowProvider) ─────────────────────

const FlowControls = ({ panZoomEnabled, setPanZoomEnabled }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const btnCls = 'w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition cursor-pointer';
  const divider = <div className="h-px bg-slate-200 dark:bg-[#2d2d2d]" />;

  return (
    <>
      {/* Zoom controls */}
      <Panel position="bottom-left" style={{ margin: '12px' }}>
        <div className="flex flex-col bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2d2d2d] rounded-lg shadow-md overflow-hidden">
          <button type="button" onClick={() => zoomIn({ duration: 200 })} title="Zoom in" className={btnCls}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          </button>
          {divider}
          <button type="button" onClick={() => zoomOut({ duration: 200 })} title="Zoom out" className={btnCls}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
          {divider}
          <button type="button" onClick={() => fitView({ duration: 300, padding: 0.2 })} title="Fit view" className={btnCls}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
            </svg>
          </button>
        </div>
      </Panel>

      {/* Pan/Zoom toggle */}
      <Panel position="top-right" style={{ margin: '12px' }}>
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2d2d2d] rounded-lg px-2.5 py-1.5 shadow-md">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={panZoomEnabled}
              onChange={(e) => setPanZoomEnabled(e.target.checked)}
              className="w-3 h-3 cursor-pointer accent-sky-500"
            />
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Pan / Zoom</span>
          </label>
        </div>
      </Panel>
    </>
  );
};

// ─── Node / Edge type maps (stable references outside component) ──────────────

const NODE_TYPES = { issueNode: GraphNode };
const EDGE_TYPES = {};

// ─── Inner graph (needs ReactFlowProvider context) ────────────────────────────

const GraphInner = ({
  nodes, edges,
  panZoomEnabled, setPanZoomEnabled,
  selectedEdge, selectedNode,
  onNodeClick, onEdgeClick, onPaneClick,
  formatDateTime,
  getStatusBadge, getPriorityBadge, formatIssueDate,
}) => {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      panOnScroll={panZoomEnabled}
      zoomOnScroll={panZoomEnabled}
      panOnDrag={panZoomEnabled}
      zoomOnPinch={panZoomEnabled}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background
        color="#cbd5e1"
        gap={20}
        size={1}
        style={{ backgroundColor: 'var(--rf-bg)' }}
      />

      <FlowControls panZoomEnabled={panZoomEnabled} setPanZoomEnabled={setPanZoomEnabled} />

      {/* Details sidebar */}
      {(selectedEdge || selectedNode) && (
        <Panel position="top-left" style={{ margin: '12px', maxWidth: '280px', maxHeight: '80%', overflowY: 'auto' }}>
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2d2d2d] rounded-xl shadow-xl p-3.5">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedEdge ? 'Link Details' : 'Issue Details'}
              </h3>
              <button
                onClick={onPaneClick}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {selectedEdge && (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Source Issue</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    #{selectedEdge.sourceIssueNumber}: {selectedEdge.sourceTitle}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Target Issue</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    #{selectedEdge.targetIssueNumber}: {selectedEdge.targetTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Created by</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedEdge.createdByName || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Created at</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {formatDateTime(selectedEdge.createdAt)}
                  </span>
                </div>
              </div>
            )}

            {selectedNode && (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Issue #{selectedNode.issueNumber}</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">
                    {selectedNode.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${getStatusBadge(selectedNode.status)} px-2 py-0.5 rounded-md text-[10px] font-semibold`}>
                    {selectedNode.status}
                  </span>
                  <span className={`${getPriorityBadge(selectedNode.priority)} px-2 py-0.5 rounded-md text-[10px] font-semibold`}>
                    {selectedNode.priority}
                  </span>
                </div>
                {selectedNode.startDate && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400">Start Date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatIssueDate(selectedNode.startDate)}
                    </span>
                  </div>
                )}
                {selectedNode.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Due Date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatIssueDate(selectedNode.dueDate)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Stats badge */}
      <Panel position="bottom-right" style={{ margin: '12px' }}>
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2d2d2d] rounded-lg px-2.5 py-1 shadow-md pointer-events-none">
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {nodes.length} issues
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              {edges.length} dependencies
            </span>
          </div>
        </div>
      </Panel>
    </ReactFlow>
  );
};

// ─── Public component ─────────────────────────────────────────────────────────

const DependencyGraph = ({ projectId, onBack, className = '' }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [panZoomEnabled, setPanZoomEnabled] = useState(true);

  const loadGraph = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectDependencyGraph(projectId);
      const graphData = response?.data || response;
      const { nodes: apiNodes = [], edges: apiEdges = [] } = graphData;

      const flowNodes = apiNodes.map((node, index) => ({
        id: String(node.id),
        type: 'issueNode',
        position: {
          x: 60 + (index % 3) * 380,
          y: 60 + Math.floor(index / 3) * 200,
        },
        data: { issue: node },
      }));

      const flowEdges = apiEdges.map((edge) => ({
        id: String(edge.id),
        source: String(edge.sourceIssueId),
        target: String(edge.targetIssueId),
        type: 'smoothstep',
        animated: false,
        data: {
          sourceIssueNumber: edge.sourceIssueNumber,
          targetIssueNumber: edge.targetIssueNumber,
          sourceTitle: edge.sourceTitle,
          targetTitle: edge.targetTitle,
          createdByName: edge.createdByName,
          createdAt: edge.createdAt,
        },
        label: `#${edge.sourceIssueNumber} → #${edge.targetIssueNumber}`,
        labelStyle: { fontSize: 10, fill: '#94a3b8' },
        labelBgStyle: { fill: 'transparent' },
        style: { stroke: '#64748b', strokeWidth: 1.5 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'dependency-graph') || 'Failed to load dependency graph');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const handleEdgeClick = useCallback((_, edge) => {
    setSelectedEdge(edge.data);
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback((_, node) => {
    setSelectedNode(node.data.issue);
    setSelectedEdge(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedEdge(null);
    setSelectedNode(null);
  }, []);

  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }, []);

  // ── States ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={`h-full w-full min-h-[260px] flex items-center justify-center bg-white dark:bg-[#141416] rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
        <div className="text-center p-6">
          <div className="w-9 h-9 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading dependency graph…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Analyzing issue dependencies</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full w-full min-h-[260px] flex items-center justify-center bg-white dark:bg-[#141416] rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
        <div className="text-center max-w-md p-6">
          <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-3">
            <FiAlertCircle className="text-rose-600 dark:text-rose-400" size={22} />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Failed to load dependency graph</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadGraph}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 px-4 py-2 text-xs font-semibold text-white transition cursor-pointer"
          >
            <FiRefreshCw size={12} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className={`h-full w-full min-h-[260px] flex items-center justify-center bg-white dark:bg-[#141416] rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
        <div className="text-center max-w-md p-6">
          <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
            <FiInfo className="text-slate-500 dark:text-slate-400" size={22} />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">No dependencies found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Create issue dependencies to visualize their relationships.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <FiChevronLeft size={12} /> Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Graph ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={`h-full w-full bg-slate-50 dark:bg-[#141416] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}
      style={{ '--rf-bg': 'transparent' }}
    >
      <ReactFlowProvider>
        <GraphInner
          nodes={nodes}
          edges={edges}
          panZoomEnabled={panZoomEnabled}
          setPanZoomEnabled={setPanZoomEnabled}
          selectedEdge={selectedEdge}
          selectedNode={selectedNode}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          formatDateTime={formatDateTime}
          getStatusBadge={getStatusBadge}
          getPriorityBadge={getPriorityBadge}
          formatIssueDate={formatIssueDate}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default DependencyGraph;
