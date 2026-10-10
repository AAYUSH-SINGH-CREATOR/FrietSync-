import { useEffect } from 'react';
import { FiX, FiCheck, FiXCircle, FiInbox, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { useInvitations } from '../../hooks/useInvitations';

const INVITE_SUCCESS_MESSAGES = {
  accept: (invite) => `Accepted invitation to join as ${invite.role || 'Member'}!`,
  reject: () => 'Invitation declined.',
};

const InvitesBellModal = ({ isOpen, onClose, onInviteAction }) => {
  const {
    invites,
    isLoading,
    errorMessage,
    processingId,
    actionSuccess,
    loadInvites: handleRefresh,
    acceptInvitation: handleAccept,
    rejectInvitation: handleReject,
  } = useInvitations({
    enabled: isOpen,
    initialLoading: true,
    onInviteAction,
    clearSuccessOnAction: false,
    successMessages: INVITE_SUCCESS_MESSAGES,
  });

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-7 sm:p-9 md:p-10 max-h-[88vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invitations</h2>
            {invites.length > 0 && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 tracking-wide">
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
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer ml-1"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
            <FiCheck className="shrink-0 text-emerald-600" size={18} />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
            <FiAlertCircle size={18} className="shrink-0 text-red-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-1 sm:pr-2">
          {isLoading && invites.length === 0 ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-gray-400">
              <span className="w-8 h-8 border-3 border-sky-600/30 border-t-sky-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">Loading your invitations...</p>
            </div>
          ) : invites.length === 0 ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-gray-400 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-4 shadow-xs">
                <FiInbox size={30} />
              </div>
              <p className="text-base font-semibold text-gray-800">No invitations right now</p>
              <p className="text-sm text-gray-500 mt-1.5 max-w-sm leading-relaxed">
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
                  className="p-5 sm:p-6 rounded-2xl border border-gray-200/90 bg-white hover:border-sky-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-base font-bold text-gray-900">
                        {invite.workspaceName || invite.senderEmail || invite.email || 'Workspace Invite'}
                      </p>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-100">
                        {invite.role || 'CONTRIBUTOR'}
                      </span>
                    </div>
                    {invite.senderEmail && (
                      <p className="text-sm text-gray-600 mt-2">
                        Invited by: <span className="text-gray-900 font-semibold">{invite.senderEmail}</span>
                      </p>
                    )}
                    {invite.createdAt && (
                      <p className="text-xs text-gray-400 mt-1">
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
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FiXCircle size={16} />
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAccept(invite)}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-md shadow-sky-600/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
