import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import MultiInviteForm from './MultiInviteForm';

const InviteModal = ({ isOpen, onClose, onInviteSent }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSuccess = (count) => {
    if (onInviteSent) onInviteSent(count);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#172033] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#293548] p-6 sm:p-8 max-h-[92vh] overflow-y-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#293548] mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
              Invite Team Members
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-[#94A3B8] mt-1 leading-relaxed">
              Add up to 6 members at once with assigned roles and expiration dates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-[#F1F5F9] hover:bg-gray-100 dark:hover:bg-[#1E293B] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={20} />
          </button>
        </div>

        <MultiInviteForm
          onSuccess={handleSuccess}
          onCancel={onClose}
          showCancel={true}
        />
      </div>
    </div>
  );
};

export default InviteModal;
