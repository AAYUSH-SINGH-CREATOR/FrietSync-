import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiTrash2 } from 'react-icons/fi';
import { deleteProjectRelease, getFriendlyErrorMessage } from '../services/projectApi';

const DeleteReleaseModal = ({ isOpen, onClose, release, onReleaseDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !release) return null;

  const releaseId = release.id || release._id || release.releaseId;
  const releaseName = release.name || release.version || 'this release';

  const handleDelete = async () => {
    if (!releaseId) return;
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await deleteProjectRelease(releaseId);
      onReleaseDeleted?.(releaseId);
      onClose();
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'project'));
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
        className="relative w-full max-w-md bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-6 sm:p-8 transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-[#F87171] flex items-center justify-center shadow-2xs shrink-0">
              <FiAlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
                Delete Release
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#b3b3b3] mt-0.5">
                Remove release record and attachments.
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
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs">
            {errorMessage}
          </div>
        )}

        <p className="text-xs sm:text-sm text-slate-700 dark:text-[#e0e0e0] leading-relaxed mb-6">
          Are you sure you want to permanently delete release{' '}
          <strong className="text-slate-900 dark:text-[#F1F5F9] font-bold">
            &ldquo;{releaseName}&rdquo;
          </strong>
          ?
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#303030]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272727] transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isDeleting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiTrash2 size={14} />
            )}
            <span>Delete Release</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteReleaseModal;

