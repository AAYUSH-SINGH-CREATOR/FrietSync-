import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiFolder,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiClock,
  FiArrowRight,
  FiRefreshCw,
  FiAlertCircle,
  FiLayers,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import {
  listCanvases,
  createCanvas as createCanvasRequest,
  renameCanvas as renameCanvasRequest,
  deleteCanvas as deleteCanvasRequest,
} from '../services/canvasService';
import { useCanvasSocket } from '../hooks/useCanvasSocket';
import { formatRelativeTime } from '../utils/canvasHelpers';
import { notifySuccess, notifyError } from '../../../utils/toast';
import EmptyState from '../../../components/ui/EmptyState';
import { getProjectById } from '../../projects/services/projectApi';

const CanvasList = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [canvases, setCanvases] = useState([]);
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [deleteCanvasModal, setDeleteCanvasModal] = useState(null);
  const [renamingCanvasId, setRenamingCanvasId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useCanvasSocket(
    canvases[0]?.id,
    (event) => {
      if (event.type === 'CANVAS_RENAMED') {
        setCanvases((prev) =>
          prev.map((c) => (c.id === event.canvasId ? { ...c, name: event.name, updatedAt: event.occurredAt } : c))
        );
      } else if (event.type === 'CANVAS_DELETED') {
        setCanvases((prev) => prev.filter((c) => c.id !== event.canvasId));
      }
    }
  );

  const loadData = useCallback(() => {
    if (!projectId) return;
    setIsLoading(true);
    setError('');
    Promise.all([
      listCanvases(projectId),
      getProjectById(projectId).catch(() => null),
    ])
      .then(([canvasList, proj]) => {
        setCanvases(Array.isArray(canvasList) ? canvasList : []);
        setProject(proj);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load canvases.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCanvas = async (e) => {
    e.preventDefault();
    const name = newCanvasName.trim() || 'Untitled Canvas';
    try {
      const res = await createCanvasRequest(projectId, name);
      const createdCanvas = res?.canvas || res?.data?.canvas || res;
      notifySuccess(`Canvas "${name}" created successfully.`);
      setNewCanvasName('');
      setIsCreating(false);
      if (createdCanvas?.id) {
        navigate(`/dashboard/projects/${projectId}/canvas/${createdCanvas.id}`);
      } else {
        loadData();
      }
    } catch (err) {
      notifyError(err.message || 'Failed to create canvas.');
    }
  };

  const handleRenameSubmit = async (canvasId) => {
    if (!renameValue.trim()) {
      setRenamingCanvasId(null);
      return;
    }
    try {
      const updatedCanvas = await renameCanvasRequest(canvasId, renameValue.trim());
      setCanvases((prev) =>
        prev.map((c) => (c.id === canvasId ? { ...c, ...updatedCanvas, name: updatedCanvas?.name || renameValue.trim() } : c))
      );
      notifySuccess('Canvas renamed successfully.');
      setRenamingCanvasId(null);
    } catch (err) {
      notifyError(err.message || 'Failed to rename canvas.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCanvasModal) return;
    try {
      await deleteCanvasRequest(deleteCanvasModal.id);
      setCanvases((prev) => prev.filter((c) => c.id !== deleteCanvasModal.id));
      notifySuccess('Canvas deleted successfully.');
      setDeleteCanvasModal(null);
    } catch (err) {
      notifyError(err.message || 'Failed to delete canvas.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 px-3 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1">
            <button
              onClick={() => navigate(`/dashboard/projects/${projectId}`)}
              className="hover:underline cursor-pointer"
            >
              {project?.name || 'Project'}
            </button>
            <span>/</span>
            <span>Live Canvases</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FiLayers className="text-sky-600 dark:text-sky-400" size={28} />
            Collaborative Canvases
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#b3b3b3] mt-1">
            Brainstorm, map architecture, and collaborate in real-time with your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#1d1d1d] border border-slate-200 dark:border-[#303030] text-slate-600 dark:text-[#e0e0e0] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#242424] transition cursor-pointer"
            title="Refresh canvases"
          >
            <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition cursor-pointer"
          >
            <FiPlus size={18} />
            <span>New Canvas</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 text-red-700 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      {isCreating && (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Canvas</h3>
          <form onSubmit={handleCreateCanvas} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Canvas name (e.g. System Architecture, Sprint Planning)"
              value={newCanvasName}
              onChange={(e) => setNewCanvasName(e.target.value)}
              autoFocus
              className="flex-1 h-11 px-4 bg-white dark:bg-[#242424] border border-slate-200 dark:border-[#3a3a3a] rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-5 h-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition cursor-pointer"
              >
                Create & Open
              </button>
              <button
                type="button"
                onClick={() => { setIsCreating(false); setNewCanvasName(''); }}
                className="px-4 h-11 rounded-xl bg-slate-200 dark:bg-[#303030] hover:bg-slate-300 dark:hover:bg-[#3a3a3a] text-slate-700 dark:text-white font-medium text-sm transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-white dark:bg-[#1d1d1d] border border-slate-200 dark:border-[#303030] p-5 animate-pulse space-y-4">
              <div className="h-5 w-3/4 bg-slate-100 dark:bg-[#282828] rounded-md" />
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-[#282828] rounded-md" />
              <div className="pt-4 border-t border-slate-100 dark:border-[#282828] flex justify-between">
                <div className="h-4 w-20 bg-slate-100 dark:bg-[#282828] rounded-md" />
                <div className="h-8 w-24 bg-slate-100 dark:bg-[#282828] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && canvases.length === 0 && !error && (
        <EmptyState
          title="No Canvases Yet"
          subtitle="Create your first live collaborative canvas for this project to start brainstorming."
          illustration={null}
          onCreateProject={() => setIsCreating(true)}
        />
      )}

      {!isLoading && canvases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {canvases.map((canvas) => (
            <div
              key={canvas.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1d1d1d] p-5 shadow-xs transition hover:shadow-md hover:border-sky-400 dark:hover:border-sky-500 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  {renamingCanvasId === canvas.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        className="w-full px-2.5 py-1 text-sm bg-slate-50 dark:bg-[#242424] border border-sky-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameSubmit(canvas.id)}
                        className="p-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
                        title="Save"
                      >
                        <FiCheck size={14} />
                      </button>
                      <button
                        onClick={() => setRenamingCanvasId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#303030] text-slate-700 dark:text-white cursor-pointer"
                        title="Cancel"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-base font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-sky-600 dark:hover:text-sky-400"
                        onClick={() => navigate(`/dashboard/projects/${projectId}/canvas/${canvas.id}`)}
                        title={canvas.name}
                      >
                        {canvas.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Created by <span className="font-medium text-slate-700 dark:text-slate-300">{canvas.createdByName || 'Team Member'}</span>
                      </p>
                    </div>
                  )}

                  {renamingCanvasId !== canvas.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setRenamingCanvasId(canvas.id); setRenameValue(canvas.name); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-500 dark:text-slate-400 cursor-pointer"
                        title="Rename canvas"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCanvasModal(canvas)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
                        title="Delete canvas"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#282828] flex items-center justify-between text-xs">
                <div className="space-y-1 text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <FiLayers size={13} className="text-sky-500" />
                    <span>{canvas.elementCount ?? 0} elements</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FiClock size={13} />
                    <span>{formatRelativeTime(canvas.lastActivityAt || canvas.updatedAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/projects/${projectId}/canvas/${canvas.id}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-semibold transition cursor-pointer"
                >
                  <span>Open Canvas</span>
                  <FiArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteCanvasModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1d1d1d] rounded-2xl border border-slate-200 dark:border-[#303030] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Canvas?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-white">"{deleteCanvasModal.name}"</strong>? This action cannot be undone and all elements will be permanently removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCanvasModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#282828] hover:bg-slate-200 dark:hover:bg-[#323236] text-slate-700 dark:text-white font-medium text-xs sm:text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer shadow-md shadow-rose-600/20"
              >
                Delete Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasList;
