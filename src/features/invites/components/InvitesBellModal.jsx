import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiXCircle, FiInbox, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { getMyInvites, acceptInvite, rejectInvite, getFriendlyErrorMessage } from '../services/inviteApi';

const InvitesBellModal = ({ isOpen, onClose, onInviteAction }) => {
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const handleRefresh = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setActionSuccess('');
    try {
      const data = await getMyInvites();
      setInvites(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'invites'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    getMyInvites()
      .then((data) => {
        if (isMounted) {
          setInvites(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(getFriendlyErrorMessage(error, 'invites'));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  const handleAccept = async (invite) => {
    const inviteId = invite._id || invite.id || invite.inviteId;
    setProcessingId(inviteId);
    setErrorMessage('');
    try {
      await acceptInvite(inviteId);
      setActionSuccess(`Accepted invitation to join as ${invite.role || 'Member'}!`);
      setInvites((prev) => prev.filter((item) => (item._id || item.id || item.inviteId) !== inviteId));
      if (onInviteAction) onInviteAction();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'accept-invite'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invite) => {
    const inviteId = invite._id || invite.id || invite.inviteId;
    setProcessingId(inviteId);
    setErrorMessage('');
    try {
      await rejectInvite(inviteId);
      setActionSuccess('Invitation declined.');
      setInvites((prev) => prev.filter((item) => (item._id || item.id || item.inviteId) !== inviteId));
      if (onInviteAction) onInviteAction();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'reject-invite'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
   <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-7 sm:p-9 md:p-10 max-h-[88vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-5 border-b border-gray-100 dark:border-[#303030]">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-[#F1F5F9] tracking-tight">Invitations</h2>
            {invites.length > 0 && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-100 dark:bg-blue-900/40 text-sky-800 dark:text-[#d7d0ff] border border-transparent dark:border-blue-800/50 tracking-wide">
                {invites.length} PENDING
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh invitations"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 dark:text-[#b3b3b3] hover:text-gray-700 dark:hover:text-[#F1F5F9] hover:bg-gray-100 dark:hover:bg-[#242424] transition cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 dark:text-[#b3b3b3] hover:text-gray-700 dark:hover:text-[#F1F5F9] hover:bg-gray-100 dark:hover:bg-[#242424] transition cursor-pointer ml-1"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399] text-sm flex items-center gap-2.5">
            <FiCheck className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={18} />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-sm flex items-center gap-2.5">
            <FiAlertCircle size={18} className="shrink-0 text-red-500 dark:text-[#F87171]" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-1 sm:pr-2">
          {isLoading && invites.length === 0 ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-gray-400 dark:text-[#b3b3b3]">
              <span className="w-8 h-8 border-3 border-sky-600/30 dark:border-blue-500/30 border-t-sky-600 dark:border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600 dark:text-[#e0e0e0]">Loading your invitations...</p>
            </div>
          ) : invites.length === 0 ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-gray-400 dark:text-[#b3b3b3] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-500 dark:text-blue-400 border border-transparent dark:border-blue-800/40 flex items-center justify-center mb-4 shadow-xs">
                <FiInbox size={30} />
              </div>
              <p className="text-base font-semibold text-gray-800 dark:text-[#F1F5F9]">No invitations right now</p>
              <p className="text-sm text-gray-500 dark:text-[#b3b3b3] mt-1.5 max-w-sm leading-relaxed">
                When someone invites you to collaborate on FrietSync, it will show up here.
              </p>
            </div>
          ) : (
            invites.map((invite) => {
              const inviteId = invite._id || invite.id || invite.inviteId;
              const isProcessing = processingId === inviteId;

              return (
                <div
                  key={inviteId}
                  className="p-5 sm:p-6 rounded-2xl border border-gray-200/90 dark:border-[#303030] bg-white dark:bg-[#242424]/60 hover:border-sky-300 dark:hover:border-[#454545] hover:shadow-md dark:hover:bg-[#242424] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-base font-bold text-gray-900 dark:text-[#F1F5F9]">
                        {invite.workspaceName || invite.senderEmail || invite.email || 'Workspace Invite'}
                      </p>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-50 dark:bg-blue-950/50 text-sky-700 dark:text-[#d7d0ff] border border-sky-100 dark:border-blue-800/40">
                        {invite.role || 'CONTRIBUTOR'}
                      </span>
                    </div>
                    {invite.senderEmail && (
                      <p className="text-sm text-gray-600 dark:text-[#e0e0e0] mt-2">
                        Invited by: <span className="text-gray-900 dark:text-[#F1F5F9] font-semibold">{invite.senderEmail}</span>
                      </p>
                    )}
                    {invite.createdAt && (
                      <p className="text-xs text-gray-400 dark:text-[#b3b3b3] mt-1">
                        Received on {new Date(invite.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReject(invite)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-[#e0e0e0] bg-white dark:bg-[#1d1d1d] hover:bg-red-50 dark:hover:bg-rose-950/30 hover:text-red-600 dark:hover:text-[#F87171] border border-gray-200 dark:border-[#3a3a3a] hover:border-red-200 dark:hover:border-rose-800/50 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FiXCircle size={16} />
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAccept(invite)}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 shadow-md shadow-sky-600/25 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isProcessing ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiCheck size={16} />
                      )}
                      Accept
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitesBellModal;
