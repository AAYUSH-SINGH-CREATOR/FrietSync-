import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiTrash2 } from 'react-icons/fi';
import { deleteProject, getFriendlyErrorMessage } from '../services/projectApi';

const DeleteProjectModal = ({ isOpen, onClose, project, onProjectDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const projectId = project.id || project._id;
  const projectName = project.name || 'this project';

  const handleDelete = async () => {
    if (!projectId) {
      setErrorMessage('Missing project identifier.');
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deleteProject(projectId);
      if (onProjectDeleted) {
        onProjectDeleted(projectId);
      }
      onClose();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'project'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-6 sm:p-8 transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-[#F87171] flex items-center justify-center shadow-2xs shrink-0">
              <FiAlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
                Delete Project
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-[#b3b3b3] mt-0.5">
                This action is irreversible.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 dark:text-[#b3b3b3] hover:text-gray-700 dark:hover:text-[#F1F5F9] hover:bg-gray-100 dark:hover:bg-[#242424] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center gap-2.5">
            <FiAlertTriangle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-[#e0e0e0] leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-900 dark:text-[#F1F5F9] font-bold">
              &ldquo;{projectName}&rdquo;
            </strong>
            ?
          </p>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-[#FBBF24] text-xs leading-relaxed">
            Deleting this project will permanently remove it from the workspace along with its member associations, tracked timeline, and tasks.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-[#303030]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-[#e0e0e0] hover:bg-slate-100 dark:hover:bg-[#242424] transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting Project...</span>
              </>
            ) : (
              <>
                <FiTrash2 size={16} />
                <span>Delete Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectModal;
