import { useState, useEffect, useCallback } from 'react';
import { FiX, FiMail, FiShield, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { sendInvite, getFriendlyErrorMessage } from '../../services/inviteApi';

const ROLE_OPTIONS = [
  { value: 'PROJECT_MANAGER', label: 'PROJECT_MANAGER' },
  { value: 'TEAM_LEAD', label: 'TEAM_LEAD' },
  { value: 'CONTRIBUTOR', label: 'CONTRIBUTOR' },
  { value: 'REPORTER', label: 'REPORTER' },
];

const InviteModal = ({ isOpen, onClose, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleClose = useCallback(() => {
    setEmail('');
    setRole('CONTRIBUTOR');
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter an email address.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await sendInvite({ email: email.trim(), role });
      setSuccessMessage(`Invitation successfully sent to ${email.trim()}!`);
      setEmail('');
      if (onInviteSent) onInviteSent();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'invite'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 backdrop-blur-xs animate-fadeIn"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-7 sm:p-9 md:p-10 transition-all"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex items-start justify-between pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invite Team Member</h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Send an invitation to collaborate with your team on FrietSync.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={20} />
          </button>
        </div>

       
        {successMessage && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
            <FiCheckCircle className="shrink-0 text-emerald-600" size={18} />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <FiAlertCircle className="shrink-0 text-red-500" size={18} />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="text-left">
            <label htmlFor="invite-email" className="block text-sm font-semibold text-gray-800 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <FiMail size={18} />
              </span>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none text-sm sm:text-base text-gray-900 placeholder:text-gray-400 transition"
              />
            </div>
          </div>

          <div className="text-left">
            <label htmlFor="invite-role" className="block text-sm font-semibold text-gray-800 mb-2">
              Assign Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <FiShield size={18} />
              </span>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-gray-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none text-sm sm:text-base text-gray-900 bg-white cursor-pointer transition appearance-none"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 text-xs">
                ▼
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 pl-1 leading-relaxed">
              Defines access permissions and role capabilities within the workspace.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-5 py-3 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-2xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-md shadow-sky-600/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
