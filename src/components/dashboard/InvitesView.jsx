import { useState, useEffect, useCallback } from 'react';
import {
  FiMail,
  FiShield,
  FiCheck,
  FiXCircle,
  FiInbox,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  sendInvite,
  getMyInvites,
  acceptInvite,
  rejectInvite,
  getFriendlyErrorMessage,
} from '../../services/inviteApi';

const ROLE_OPTIONS = [
  'PROJECT_MANAGER',
  'TEAM_LEAD',
  'CONTRIBUTOR',
  'REPORTER',
];

const InvitesView = ({ onInvitesUpdated }) => {
  const [invites, setInvites] = useState([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const [sendEmail, setSendEmail] = useState('');
  const [sendRole, setSendRole] = useState('CONTRIBUTOR');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  const fetchInvites = useCallback(() => {
    setIsLoadingInvites(true);
    setInviteError('');
    getMyInvites()
      .then((data) => {
        setInvites(Array.isArray(data) ? data : []);
        if (onInvitesUpdated && Array.isArray(data)) {
          onInvitesUpdated(data.length);
        }
      })
      .catch((err) => {
        setInviteError(getFriendlyErrorMessage(err, 'invites'));
      })
      .finally(() => {
        setIsLoadingInvites(false);
      });
  }, [onInvitesUpdated]);

  useEffect(() => {
    let isMounted = true;
    getMyInvites()
      .then((data) => {
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          setInvites(list);
          setIsLoadingInvites(false);
          if (onInvitesUpdated) onInvitesUpdated(list.length);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setInviteError(getFriendlyErrorMessage(err, 'invites'));
          setIsLoadingInvites(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onInvitesUpdated]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!sendEmail.trim()) return;

    setIsSending(true);
    setSendSuccess('');
    setSendError('');

    try {
      await sendInvite({ email: sendEmail.trim(), role: sendRole });
      setSendSuccess(`Invitation sent successfully to ${sendEmail.trim()}!`);
      setSendEmail('');
      fetchInvites();
    } catch (err) {
      setSendError(getFriendlyErrorMessage(err, 'invite'));
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (invite) => {
    const inviteId = invite._id || invite.id || invite.inviteId;
    setProcessingId(inviteId);
    setInviteError('');
    setActionSuccess('');
    try {
      await acceptInvite(inviteId);
      setActionSuccess(`Accepted invitation to join as ${invite.role || 'Member'}!`);
      setInvites((prev) => {
        const updated = prev.filter((item) => (item._id || item.id || item.inviteId) !== inviteId);
        if (onInvitesUpdated) onInvitesUpdated(updated.length);
        return updated;
      });
    } catch (err) {
      setInviteError(getFriendlyErrorMessage(err, 'accept-invite'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invite) => {
    const inviteId = invite._id || invite.id || invite.inviteId;
    setProcessingId(inviteId);
    setInviteError('');
    setActionSuccess('');
    try {
      await rejectInvite(inviteId);
      setActionSuccess('Invitation declined.');
      setInvites((prev) => {
        const updated = prev.filter((item) => (item._id || item.id || item.inviteId) !== inviteId);
        if (onInvitesUpdated) onInvitesUpdated(updated.length);
        return updated;
      });
    } catch (err) {
      setInviteError(getFriendlyErrorMessage(err, 'reject-invite'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Workspace Invitations
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Invite new team members and review pending invitations to collaborate on FrietSync.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/50">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Invite Team Member</h2>
          <p className="text-xs text-slate-500 mb-5">
            Send an invitation link with assigned permissions.
          </p>

          {sendSuccess && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
              <FiCheckCircle className="shrink-0 text-emerald-600" size={17} />
              <span>{sendSuccess}</span>
            </div>
          )}

          {sendError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
              <FiAlertCircle className="shrink-0 text-red-500" size={17} />
              <span>{sendError}</span>
            </div>
          )}

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail size={16} />
                </span>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="invite-role" className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Assign Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiShield size={16} />
                </span>
                <select
                  id="invite-role"
                  value={sendRole}
                  onChange={(e) => setSendRole(e.target.value)}
                  className="w-full pl-10 pr-9 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 bg-white transition appearance-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                Determines access control and project creation permissions.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full mt-2 py-3 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Invite...</span>
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/50 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Received Invitations</h2>
              <p className="text-xs text-slate-500">
                Invitations sent to your email to join workspaces.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchInvites}
              disabled={isLoadingInvites}
              title="Refresh invites"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <FiRefreshCw size={16} className={isLoadingInvites ? 'animate-spin' : ''} />
            </button>
          </div>

          {actionSuccess && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
              <FiCheck size={16} className="text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {inviteError && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <FiAlertCircle size={16} className="text-red-500" />
              <span>{inviteError}</span>
            </div>
          )}

          <div className="flex-1 space-y-3">
            {isLoadingInvites && invites.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <span className="w-7 h-7 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin inline-block mb-3" />
                <p className="text-sm">Loading invitations...</p>
              </div>
            ) : invites.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 mx-auto flex items-center justify-center mb-3">
                  <FiInbox size={26} />
                </div>
                <p className="text-sm font-semibold text-slate-700">No pending invitations</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  When a team lead or project manager invites you, it will appear here.
                </p>
              </div>
            ) : (
              invites.map((invite) => {
                const inviteId = invite._id || invite.id || invite.inviteId;
                const isProcessing = processingId === inviteId;

                return (
                  <div
                    key={inviteId}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-sky-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {invite.workspaceName || invite.senderEmail || 'Workspace Invite'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800">
                          {invite.role || 'CONTRIBUTOR'}
                        </span>
                      </div>
                      {invite.senderEmail && (
                        <p className="text-xs text-slate-500 mt-1">
                          Invited by: <span className="text-slate-700 font-medium">{invite.senderEmail}</span>
                        </p>
                      )}
                      {invite.createdAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(invite)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <FiXCircle size={14} />
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleAccept(invite)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 shadow-sm shadow-sky-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {isProcessing ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <FiCheck size={14} />
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
    </div>
  );
};

export default InvitesView;

