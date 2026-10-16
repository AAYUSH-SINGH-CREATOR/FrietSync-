import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiSettings,
  FiLayers,
  FiEdit2,
  FiLogOut,
  FiAlertTriangle,
  FiCheckCircle,
  FiAlertCircle,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  getMyWorkspace,
  updateWorkspace,
  leaveWorkspace,
  getFriendlyErrorMessage,
} from '../services/workspaceApi';

const SettingsView = () => {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const fetchWorkspaceData = useCallback(() => {
    setIsLoading(true);
    setStatusMessage({ type: '', text: '' });
    getMyWorkspace()
      .then((ws) => {
        if (ws && (ws.name || ws.id || ws._id)) {
          setWorkspace(ws);
          setRenameInput(ws.name || '');
        } else {
          setWorkspace(null);
          setRenameInput('');
        }
      })
      .catch((err) => {
        setStatusMessage({
          type: 'error',
          text: getFriendlyErrorMessage(err, 'workspace'),
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    getMyWorkspace()
      .then((ws) => {
        if (isMounted) {
          if (ws && (ws.name || ws.id || ws._id)) {
            setWorkspace(ws);
            setRenameInput(ws.name || '');
          } else {
            setWorkspace(null);
            setRenameInput('');
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStatusMessage({
            type: 'error',
            text: getFriendlyErrorMessage(err, 'workspace'),
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!renameInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Workspace name cannot be empty.' });
      return;
    }

    if (renameInput.trim() === workspace?.name) {
      setStatusMessage({ type: 'info', text: 'Workspace name is already up to date.' });
      return;
    }

    setIsUpdating(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const updated = await updateWorkspace({
        name: renameInput.trim(),
        workspaceId: workspace?.id || workspace?._id,
      });
      const newName = updated?.name || renameInput.trim();
      setWorkspace((prev) => ({ ...prev, name: newName }));
      setStatusMessage({
        type: 'success',
        text: `Workspace renamed to "${newName}" successfully!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'workspace'),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    setIsLeaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      await leaveWorkspace();
      setWorkspace(null);
      setShowLeaveConfirm(false);
      setStatusMessage({
        type: 'success',
        text: 'You have left the workspace. You can now create or join a new workspace.',
      });
      setTimeout(() => {
        navigate('/create-workspace');
      }, 1200);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'workspace'),
      });
    } finally {
      setIsLeaving(false);
    }
  };

   return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Manage your workspace name, preferences, and membership.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchWorkspaceData}
          disabled={isLoading}
          title="Refresh workspace details"
          className="w-10 h-10 rounded-2xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-[#293548] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] flex items-center justify-center shadow-xs transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <FiRefreshCw
            size={16}
            className={isLoading ? 'animate-spin text-sky-600 dark:text-[#60A5FA]' : ''}
          />
        </button>
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
              : statusMessage.type === 'error'
              ? 'bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171]'
              : 'bg-sky-50 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-800/60 text-sky-800 dark:text-[#60A5FA]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
            ) : statusMessage.type === 'error' ? (
              <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
            ) : (
              <FiSettings className="shrink-0 text-sky-600 dark:text-[#60A5FA]" size={17} />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage({ type: '', text: '' })}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading && (
        <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 border border-slate-200/80 dark:border-[#293548] shadow-xs animate-pulse space-y-4">
          <div className="h-6 w-44 bg-slate-100 dark:bg-[#1E293B] rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
          <div className="h-28 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl mt-4" />
        </div>
      )}

      {!isLoading && !workspace && (
        <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-[#293548] shadow-md shadow-slate-200/50 dark:shadow-none text-center">
          <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-4 shadow-xs">
            <FiLayers size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] mb-2">
            No Active Workspace Found
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed mb-6">
            You do not currently belong to any workspace. Create a new workspace to
            organize projects and collaborate with teammates.
          </p>
          <Link
            to="/create-workspace"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Create Workspace</span>
          </Link>
        </div>
      )}

      {!isLoading && workspace && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#172033] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-[#293548] shadow-xs">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-[#293548] mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs">
                <FiLayers size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                  {workspace.name || 'Current Workspace'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Single active workspace configuration
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-100 dark:border-[#293548]">
                <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-[#64748B] block mb-1">
                  Workspace Name
                </span>
                <span className="font-bold text-slate-800 dark:text-[#F1F5F9] text-base">
                  {workspace.name || 'Untitled Workspace'}
                </span>
              </div>

              {(workspace.id || workspace._id) && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-100 dark:border-[#293548]">
                  <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-[#64748B] block mb-1">
                    Workspace ID
                  </span>
                  <span className="font-mono text-slate-700 dark:text-[#CBD5E1] text-xs break-all">
                    {workspace.id || workspace._id}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#172033] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-[#293548] shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] flex items-center justify-center">
                <FiEdit2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                  Rename Workspace
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Update the display name of your team workspace.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateName} className="space-y-4 max-w-lg mt-4">
              <div>
                <label
                  htmlFor="rename-workspace"
                  className="block text-xs font-semibold uppercase text-slate-700 dark:text-[#CBD5E1] mb-1.5"
                >
                  Workspace Name
                </label>
                <input
                  id="rename-workspace"
                  type="text"
                  required
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="e.g. Platform Engineering"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] text-slate-800 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#64748B]"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating || !renameInput.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>

          <div className="bg-rose-50/40 dark:bg-rose-950/20 rounded-3xl p-6 sm:p-8 border border-rose-200/80 dark:border-rose-900/40">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-rose-700 dark:text-[#F87171] font-bold text-base mb-1">
                  <FiAlertTriangle size={18} />
                  <span>Leave Workspace</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] max-w-xl leading-relaxed">
                  Leaving this workspace will remove your access to all projects, tasks,
                  and sprint boards. In FrietSync you cannot create another workspace until
                  you leave your current one.
                </p>
              </div>

              {!showLeaveConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition cursor-pointer shrink-0"
                >
                  <FiLogOut size={16} />
                  <span>Leave Workspace</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(false)}
                    disabled={isLeaving}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#1E293B] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveWorkspace}
                    disabled={isLeaving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isLeaving ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Leaving...</span>
                      </>
                    ) : (
                      'Confirm & Leave'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
