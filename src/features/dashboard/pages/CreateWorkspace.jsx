import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiLayers,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiLock,
  FiHome,
  FiRotateCcw,
} from 'react-icons/fi';
import {
  createWorkspace,
  getMyWorkspace,
  restoreWorkspace,
  getFriendlyErrorMessage,
} from '../services/workspaceApi';
import logo from '../../../assets/logo.svg';

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState('');
  const [existingWorkspace, setExistingWorkspace] = useState(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
    let isMounted = true;
    getMyWorkspace()
      .then((ws) => {
        if (isMounted) {
          if (ws && (ws.name || ws.id || ws._id)) {
            setExistingWorkspace(ws);
          }
          setIsCheckingExisting(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsCheckingExisting(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);


  const handleCreate = async (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setErrorMessage('Workspace name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createWorkspace({ name: workspaceName.trim() });
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'workspace'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await restoreWorkspace(existingWorkspace?.id || existingWorkspace?._id);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'workspace'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaedf1] dark:bg-[#292929] flex flex-col justify-center items-center px-4 py-8 font-sans transition-colors duration-200">
      <div className="flex items-center gap-2.5 mb-8">
        <img src={logo} alt="FrietSync Logo" className="w-9 h-9 object-contain" />
        <span className="text-2xl font-black text-sky-600 dark:text-[#60A5FA] tracking-tight">
          FrietSync
        </span>
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-[#1d1d1d] rounded-3xl p-6 sm:p-10 shadow-xl dark:shadow-none border border-slate-200/80 dark:border-[#303030] animate-fadeIn">
        {isCheckingExisting ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-sky-600/30 border-t-sky-600 dark:border-blue-400/30 dark:border-t-[#60A5FA] rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500 dark:text-[#b3b3b3]">
              Checking workspace status...
            </p>
          </div>
        ) : existingWorkspace ? (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-[#FBBF24] mx-auto flex items-center justify-center shadow-xs">
              <FiLock size={28} />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                Active Workspace Detected
              </h2>
              <p className="text-sm text-slate-500 dark:text-[#b3b3b3] mt-2 leading-relaxed">
                You are currently a member of{' '}
                <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">
                  &ldquo;{existingWorkspace.name || 'Unnamed Workspace'}&rdquo;
                </span>
                . In FrietSync, each user can only belong to one workspace at a time.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#242424]/70 border border-slate-200 dark:border-[#303030] text-left text-xs text-slate-600 dark:text-[#e0e0e0] space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-[#F1F5F9]">
                <FiCheckCircle className="text-emerald-500 dark:text-[#34D399]" size={14} />
                <span>To create a new workspace:</span>
              </div>
              <p className="pl-5 text-slate-500 dark:text-[#b3b3b3]">
                Go to <span className="font-medium text-slate-700 dark:text-[#e0e0e0]">Settings</span> on your dashboard and click{' '}
                <span className="font-medium text-rose-600 dark:text-[#F87171]">&ldquo;Leave Workspace&rdquo;</span>. Once you leave, you can create a new one.
              </p>
            </div>

            {Boolean(existingWorkspace?.deletionRequestedAt || existingWorkspace?.permanentlyDeleteAt) && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-left text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold">Workspace Scheduled for Deletion</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Your workspace is currently in a 30-day grace period. You can restore it to continue working with your team.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
              {Boolean(existingWorkspace?.deletionRequestedAt || existingWorkspace?.permanentlyDeleteAt) && (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <FiRotateCcw size={16} />
                  <span>{isSubmitting ? 'Restoring...' : 'Restore Workspace'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer"
              >
                <FiHome size={16} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-3 shadow-2xs">
                <FiLayers size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                Create Your Workspace
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#b3b3b3] mt-1 max-w-sm mx-auto">
                Set up a centralized hub for your team to collaborate on projects, sprints, and tasks.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center gap-2.5">
                <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="workspace-name"
                  className="block text-xs font-semibold uppercase text-slate-700 dark:text-[#e0e0e0] mb-1.5"
                >
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  required
                  placeholder="e.g. Platform Engineering or Test Workspace"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#242424] border border-slate-200 dark:border-[#3a3a3a] text-slate-800 dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#858585]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !workspaceName.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Workspace</span>
                      <FiArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/dashboard"
                className="text-xs font-medium text-slate-500 dark:text-[#b3b3b3] hover:text-slate-800 dark:hover:text-[#F1F5F9] transition"
              >
                Skip for now &rarr; Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWorkspace;

