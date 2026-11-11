import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiTrash2,
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiEdit3,
  FiSquare,
  FiCircle,
  FiType,
  FiNavigation,
  FiCheck,
  FiX,
  FiMaximize2,
  FiLayers,
  FiCheckSquare,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi';
import { getCanvas } from '../services/canvasService';
import { useCanvasSocket } from '../hooks/useCanvasSocket';
import { normalizeElement, generateTempId } from '../utils/canvasHelpers';
import { TOOLS, SHAPES, CANVAS_COLORS, ELEMENT_TYPES } from '../utils/canvasConstants';
import { notifySuccess, notifyError } from '../../../utils/toast';
import { getProjectIssues } from '../../issues/services/issueApi';

const CanvasEditorPage = () => {
  const { projectId, canvasId } = useParams();
  const navigate = useNavigate();

  const [canvas, setCanvas] = useState(null);
  const [elements, setElements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingElementId, setDraggingElementId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [arrowStartElementId, setArrowStartElementId] = useState(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [projectIssues, setProjectIssues] = useState([]);

  const svgRef = useRef(null);

  const {
    connectionStatus,
    renameCanvas: socketRenameCanvas,
    deleteCanvas: socketDeleteCanvas,
    createElement: socketCreateElement,
    updateElement: socketUpdateElement,
    deleteElement: socketDeleteElement,
    convertToIssue: socketConvertToIssue,
  } = useCanvasSocket(canvasId, (event) => {
    if (event.type === 'ELEMENTS_UPSERTED') {
      if (Array.isArray(event.elements)) {
        setElements((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          for (const incoming of event.elements) {
            const normalized = normalizeElement(incoming);
            if (draggingElementId !== normalized.id) {
              map.set(normalized.id, normalized);
            }
          }
          return Array.from(map.values());
        });
      }
    } else if (event.type === 'ELEMENTS_DELETED') {
      if (Array.isArray(event.elementIds)) {
        setElements((prev) => prev.filter((e) => !event.elementIds.includes(e.id)));
      }
    } else if (event.type === 'CANVAS_RENAMED') {
      setCanvas((prev) => (prev ? { ...prev, name: event.name } : prev));
    } else if (event.type === 'CANVAS_DELETED') {
      notifyError('This canvas was deleted by another user.');
      navigate(`/dashboard/projects/${projectId}/canvas`);
    }
  });

  const loadCanvasData = useCallback(() => {
    if (!canvasId) return;
    setIsLoading(true);
    setError('');
    getCanvas(canvasId)
      .then(({ canvas: c, elements: els }) => {
        setCanvas(c);
        setRenameValue(c?.name || '');
        setElements(Array.isArray(els) ? els.map(normalizeElement) : []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load canvas.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [canvasId]);

  useEffect(() => {
    loadCanvasData();
    getProjectIssues(projectId, { page: 0, size: 50 })
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.content) ? res.content : Array.isArray(res?.issues) ? res.issues : [];
        setProjectIssues(list);
      })
      .catch(() => {});
  }, [canvasId, projectId]);

  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  const handleCanvasMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.classList.contains('canvas-bg')) {
      if (activeTool === TOOLS.SELECT) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedElementId(null);
      } else {
        const rect = svgRef.current.getBoundingClientRect();
        const clickX = (e.clientX - rect.left - pan.x) / (rect.width * zoom);
        const clickY = (e.clientY - rect.top - pan.y) / (rect.height * zoom);

        const clampedX = Math.max(0.02, Math.min(0.85, clickX));
        const clampedY = Math.max(0.02, Math.min(0.85, clickY));

        let newType = ELEMENT_TYPES.STICKY_NOTE;
        let shape = SHAPES.RECTANGLE;
        let text = 'New Sticky Note';
        let color = '#fde68a';
        let width = 0.18;
        let height = 0.14;

        if (activeTool === TOOLS.SHAPE) {
          newType = ELEMENT_TYPES.SHAPE;
          shape = SHAPES.RECTANGLE;
          text = '';
          color = '#bfdbfe';
        } else if (activeTool === TOOLS.TEXT) {
          newType = ELEMENT_TYPES.TEXT;
          text = 'Click to edit text';
          color = '#1e293b';
          width = 0.2;
          height = 0.08;
        }

        const maxZ = elements.reduce((acc, el) => Math.max(acc, el.zIndex || 0), 0);

        const payload = {
          type: newType,
          shape,
          x: clampedX,
          y: clampedY,
          width,
          height,
          rotation: 0,
          zIndex: maxZ + 1,
          text,
          color,
        };

        socketCreateElement(payload);
        setActiveTool(TOOLS.SELECT);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingElementId) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / (rect.width * zoom) - dragOffset.x;
      const y = (e.clientY - rect.top - pan.y) / (rect.height * zoom) - dragOffset.y;

      setElements((prev) =>
        prev.map((el) => (el.id === draggingElementId ? { ...el, x: Math.max(0, Math.min(0.9, x)), y: Math.max(0, Math.min(0.9, y)) } : el))
      );
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (draggingElementId) {
      const el = elements.find((item) => item.id === draggingElementId);
      if (el) {
        socketUpdateElement(el.id, {
          shape: el.shape,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          endX: el.endX,
          endY: el.endY,
          fromElementId: el.fromElementId,
          toElementId: el.toElementId,
          rotation: el.rotation,
          zIndex: el.zIndex,
          text: el.text,
          color: el.color,
        });
      }
      setDraggingElementId(null);
    }
  };

  const handleElementMouseDown = (e, el) => {
    e.stopPropagation();
    if (activeTool === TOOLS.ARROW) {
      if (!arrowStartElementId) {
        setArrowStartElementId(el.id);
        notifySuccess('Select target element for arrow connection.');
      } else if (arrowStartElementId !== el.id) {
        const startEl = elements.find((item) => item.id === arrowStartElementId);
        const payload = {
          type: ELEMENT_TYPES.ARROW,
          shape: 'line',
          x: startEl ? startEl.x + (startEl.width || 0.15) / 2 : 0.1,
          y: startEl ? startEl.y + (startEl.height || 0.1) / 2 : 0.1,
          width: 0.1,
          height: 0.1,
          endX: el.x + (el.width || 0.15) / 2,
          endY: el.y + (el.height || 0.1) / 2,
          fromElementId: arrowStartElementId,
          toElementId: el.id,
          zIndex: 999,
          color: '#64748b',
          text: '',
        };
        socketCreateElement(payload);
        setArrowStartElementId(null);
        setActiveTool(TOOLS.SELECT);
        notifySuccess('Arrow connection created.');
      }
      return;
    }

    setSelectedElementId(el.id);
    if (activeTool === TOOLS.SELECT) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = (e.clientX - rect.left - pan.x) / (rect.width * zoom);
        const clickY = (e.clientY - rect.top - pan.y) / (rect.height * zoom);
        setDraggingElementId(el.id);
        setDragOffset({ x: clickX - el.x, y: clickY - el.y });
      }
    }
  };

  const handleUpdateSelected = (fields) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...fields } : el))
    );
    const target = elements.find((e) => e.id === selectedElementId);
    if (target) {
      const updated = { ...target, ...fields };
      socketUpdateElement(selectedElementId, {
        shape: updated.shape,
        x: updated.x,
        y: updated.y,
        width: updated.width,
        height: updated.height,
        endX: updated.endX,
        endY: updated.endY,
        fromElementId: updated.fromElementId,
        toElementId: updated.toElementId,
        rotation: updated.rotation,
        zIndex: updated.zIndex,
        text: updated.text,
        color: updated.color,
      });
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    socketDeleteElement(selectedElementId);
    setElements((prev) => prev.filter((e) => e.id !== selectedElementId));
    setSelectedElementId(null);
    notifySuccess('Element deleted.');
  };

  const handleBringToFront = () => {
    if (!selectedElement) return;
    const maxZ = elements.reduce((acc, el) => Math.max(acc, el.zIndex || 0), 0);
    handleUpdateSelected({ zIndex: maxZ + 1 });
  };

  const handleRenameCanvasSubmit = (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    socketRenameCanvas(renameValue.trim());
    setCanvas((prev) => (prev ? { ...prev, name: renameValue.trim() } : prev));
    setIsRenaming(false);
    notifySuccess('Canvas renamed.');
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="p-8 text-center space-y-4">
        <FiAlertCircle className="mx-auto text-rose-500" size={40} />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{error || 'Canvas not found'}</h2>
        <button
          onClick={() => navigate(`/dashboard/projects/${projectId}/canvas`)}
          className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer"
        >
          Back to Canvases
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] select-none overflow-hidden bg-slate-100 dark:bg-[#151515]">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1d1d1d] border-b border-slate-200 dark:border-[#303030] z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/projects/${projectId}/canvas`)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Back to Canvases"
          >
            <FiArrowLeft size={18} />
          </button>

          {isRenaming ? (
            <form onSubmit={handleRenameCanvasSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                className="px-2.5 py-1 text-sm bg-slate-50 dark:bg-[#282828] border border-sky-500 rounded-lg text-slate-900 dark:text-white"
              />
              <button type="submit" className="p-1.5 bg-sky-600 text-white rounded-lg cursor-pointer"><FiCheck size={14} /></button>
              <button type="button" onClick={() => setIsRenaming(false)} className="p-1.5 bg-slate-200 dark:bg-[#303030] text-slate-700 dark:text-white rounded-lg cursor-pointer"><FiX size={14} /></button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white cursor-pointer hover:text-sky-600" onClick={() => setIsRenaming(true)} title="Click to rename">
                {canvas.name}
              </h1>
              <button onClick={() => setIsRenaming(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><FiEdit3 size={14} /></button>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#282828] text-xs font-medium text-slate-600 dark:text-slate-300">
            {connectionStatus === 'connected' ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <FiWifi size={13} /> Live
              </span>
            ) : connectionStatus === 'reconnecting' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 animate-pulse">
                <FiWifi size={13} /> Reconnecting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-500">
                <FiWifiOff size={13} /> Offline
              </span>
            )}
            <span className="text-slate-300 dark:text-[#444]">|</span>
            <span>{elements.length} elements</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-[#282828] rounded-xl p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#353535] text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Zoom out"
            >
              <FiZoomOut size={15} />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#353535] text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Zoom in"
            >
              <FiZoomIn size={15} />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#353535] text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Reset view"
            >
              <FiRotateCcw size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 cursor-pointer"
            title="Delete Canvas"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5 p-2 bg-white dark:bg-[#1d1d1d] border border-slate-200 dark:border-[#303030] rounded-2xl shadow-lg">
          {[
            { id: TOOLS.SELECT, label: 'Select / Move', icon: FiNavigation },
            { id: TOOLS.STICKY_NOTE, label: 'Sticky Note', icon: FiEdit3 },
            { id: TOOLS.SHAPE, label: 'Rectangle Shape', icon: FiSquare },
            { id: TOOLS.TEXT, label: 'Text Box', icon: FiType },
            { id: TOOLS.ARROW, label: 'Connector Arrow', icon: FiNavigation },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setActiveTool(id); setArrowStartElementId(null); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                activeTool === id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282828]'
              }`}
              title={label}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        <div
          className="flex-1 relative cursor-crosshair overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:24px_24px]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            ref={svgRef}
            className="w-full h-full absolute inset-0"
            onMouseDown={handleCanvasMouseDown}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {elements
                .filter((el) => el.type === ELEMENT_TYPES.ARROW || el.fromElementId)
                .map((arrow) => {
                  const fromEl = elements.find((e) => e.id === arrow.fromElementId);
                  const toEl = elements.find((e) => e.id === arrow.toElementId);
                  if (!fromEl || !toEl) return null;

                  const x1 = (fromEl.x + (fromEl.width || 0.16) / 2) * 1000;
                  const y1 = (fromEl.y + (fromEl.height || 0.12) / 2) * 1000;
                  const x2 = (toEl.x + (toEl.width || 0.16) / 2) * 1000;
                  const y2 = (toEl.y + (toEl.height || 0.12) / 2) * 1000;

                  return (
                    <g key={arrow.id}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={arrow.color || '#64748b'}
                        strokeWidth="3"
                        strokeDasharray={arrow.shape === 'dashed' ? '5,5' : undefined}
                      />
                      <circle cx={x2} cy={y2} r="5" fill={arrow.color || '#64748b'} />
                    </g>
                  );
                })}

              {elements
                .filter((el) => el.type !== ELEMENT_TYPES.ARROW && !el.fromElementId)
                .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                .map((el) => {
                  const isSelected = el.id === selectedElementId;
                  const posX = el.x * 1000;
                  const posY = el.y * 1000;
                  const width = (el.width || 0.18) * 1000;
                  const height = (el.height || 0.14) * 1000;

                  return (
                    <g
                      key={el.id}
                      transform={`translate(${posX}, ${posY}) rotate(${el.rotation || 0})`}
                      onMouseDown={(e) => handleElementMouseDown(e, el)}
                      className="cursor-move group"
                    >
                      {el.type === ELEMENT_TYPES.SHAPE ? (
                        <rect
                          width={width}
                          height={height}
                          rx={el.shape === 'rounded_rectangle' ? 12 : 0}
                          fill={el.color || '#bfdbfe'}
                          stroke={isSelected ? '#0284c7' : '#94a3b8'}
                          strokeWidth={isSelected ? 3 : 1}
                          className="shadow-md transition-all"
                        />
                      ) : el.type === ELEMENT_TYPES.TEXT ? (
                        <text
                          x="10"
                          y="30"
                          fill={el.color || '#1e293b'}
                          fontSize="18"
                          fontWeight="bold"
                          className="font-sans select-none"
                        >
                          {el.text || 'Text element'}
                        </text>
                      ) : (
                        <g>
                          <rect
                            width={width}
                            height={height}
                            rx={8}
                            fill={el.color || '#fde68a'}
                            stroke={isSelected ? '#0284c7' : 'rgba(0,0,0,0.1)'}
                            strokeWidth={isSelected ? 3 : 1}
                            className="shadow-lg filter drop-shadow-md"
                          />
                          <foreignObject x="10" y="10" width={width - 20} height={height - 20}>
                            <div xmlns="http://www.w3.org/1999/xhtml" className="w-full h-full overflow-hidden text-slate-900 text-sm font-medium leading-snug break-words">
                              {el.text || 'Sticky note'}
                            </div>
                          </foreignObject>
                          {el.linkedIssue && (
                            <g transform={`translate(${width - 28}, 8)`}>
                              <rect width="20" height="20" rx="4" fill="#0284c7" />
                              <text x="4" y="14" fill="white" fontSize="11" fontWeight="bold">#</text>
                            </g>
                          )}
                        </g>
                      )}

                      {isSelected && (
                        <rect
                          x="-4"
                          y="-4"
                          width={width + 8}
                          height={height + 8}
                          rx={10}
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                          className="animate-pulse pointer-events-none"
                        />
                      )}
                    </g>
                  );
                })}
            </g>
          </svg>
        </div>

        <div className="w-80 bg-white dark:bg-[#1d1d1d] border-l border-slate-200 dark:border-[#303030] p-5 flex flex-col justify-between z-10 shadow-lg overflow-y-auto">
          {selectedElement ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#282828]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {selectedElement.type.replace('_', ' ')} Inspector
                </h3>
                <button
                  onClick={() => setSelectedElementId(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              {selectedElement.type !== ELEMENT_TYPES.ARROW && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Content / Text</label>
                  <textarea
                    rows={3}
                    value={selectedElement.text || ''}
                    onChange={(e) => handleUpdateSelected({ text: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#3a3a3a] rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    placeholder="Type element text..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {CANVAS_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleUpdateSelected({ color: col })}
                      className={`h-8 rounded-lg border transition cursor-pointer ${
                        selectedElement.color === col ? 'ring-2 ring-sky-500 scale-105' : 'border-slate-300 dark:border-[#444]'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleBringToFront}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#282828] hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                >
                  <FiLayers size={15} />
                  <span>Bring to Front</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-semibold text-xs transition cursor-pointer"
                >
                  <FiCheckSquare size={15} />
                  <span>{selectedElement.linkedIssue ? 'View Linked Issue' : 'Convert to Issue'}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#282828]">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold text-xs transition cursor-pointer"
                >
                  <FiTrash2 size={15} />
                  <span>Delete Element</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500 space-y-2">
              <FiMaximize2 size={28} />
              <p className="text-xs font-medium">Select an element on the canvas to inspect and edit its properties.</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-[#282828] text-[11px] text-slate-400 text-center">
            FrietSync Live Collaborative Canvas
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1d1d1d] rounded-2xl border border-slate-200 dark:border-[#303030] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Canvas?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-white">"{canvas.name}"</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#282828] text-slate-700 dark:text-white font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  socketDeleteCanvas();
                  notifySuccess('Canvas deleted.');
                  navigate(`/dashboard/projects/${projectId}/canvas`);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1d1d1d] rounded-2xl border border-slate-200 dark:border-[#303030] p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Convert Element to Issue</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Turn <strong className="text-slate-800 dark:text-white">"{selectedElement?.text || 'Selected Element'}"</strong> into a tracked FrietSync project issue.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await socketConvertToIssue(selectedElementId, {
                      title: selectedElement?.text || 'Canvas Issue',
                      description: 'Created from collaborative canvas element.',
                      priority: 'MEDIUM',
                    });
                    notifySuccess('Issue created and linked successfully.');
                    setIsConvertModalOpen(false);
                    if (res?.issue) {
                      handleUpdateSelected({ linkedIssue: res.issue });
                    }
                  } catch (err) {
                    notifyError(err.message || 'Failed to convert to issue.');
                  }
                }}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition cursor-pointer"
              >
                Create New Issue from Element
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#282828] text-slate-700 dark:text-white font-medium text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasEditorPage;
