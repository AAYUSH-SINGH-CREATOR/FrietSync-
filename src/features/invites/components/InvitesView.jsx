import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatRoleLabel } from '../../../utils/formatRoleLabel';
import { useOutletContext } from 'react-router-dom';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import {
  FiCheck,
  FiX,
  FiInbox,
  FiRefreshCw,
  FiAlertCircle,
  FiFolder,
  FiClock,
  FiCheckCircle,
  FiSlash,
} from 'react-icons/fi';
import {
  getMyInvites,
  acceptInvite,
  rejectInvite,
  revokeInvite,
  getFriendlyErrorMessage,
} from '../services/inviteApi';
import MultiInviteForm from './MultiInviteForm';
import { canSendInvites } from '../utils/invitePermissions';

const AVATAR_COLORS = ['#4277d3', '#d95195', '#9569d3', '#c46653'];

const getInitials = (name = '') => name.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'M';
const getAvatarColor = (name = '') => {
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB');
};

const InvitesView = ({ onInvitesUpdated: propOnInvitesUpdated }) => {
  const outletContext = useOutletContext() || {};
  const onInvitesUpdated = propOnInvitesUpdated || outletContext.setPendingInviteCount;
  const canSendInvitesSection = !outletContext.isLoadingUserProfile && canSendInvites(outletContext.currentUserProfile);
  const [invites, setInvites] = useState([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  const fetchInvites = useCallback(() => {
    setIsLoadingInvites(true);
    setInviteError('');
    getMyInvites()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setInvites(list);
        onInvitesUpdated?.(list.filter((invite) => (invite.status || 'PENDING').toUpperCase() === 'PENDING').length);
      })
      .catch((err) => setInviteError(getFriendlyErrorMessage(err, 'invites')))
      .finally(() => setIsLoadingInvites(false));
  }, [onInvitesUpdated]);

  useEffect(() => {
    let isMounted = true;
    getMyInvites()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        setInvites(list);
        setIsLoadingInvites(false);
        onInvitesUpdated?.(list.filter((invite) => (invite.status || 'PENDING').toUpperCase() === 'PENDING').length);
      })
      .catch((err) => {
        if (!isMounted) return;
        setInviteError(getFriendlyErrorMessage(err, 'invites'));
        setIsLoadingInvites(false);
      });
    return () => { isMounted = false; };
  }, [onInvitesUpdated]);

  const stats = useMemo(() => ({
    total: invites.length,
    pending: invites.filter((invite) => (invite.status || 'PENDING').toUpperCase() === 'PENDING').length,
    accepted: invites.filter((invite) => (invite.status || '').toUpperCase() === 'ACCEPTED').length,
    rejected: invites.filter((invite) => ['REJECTED', 'DECLINED', 'REVOKED'].includes((invite.status || '').toUpperCase())).length,
  }), [invites]);

  const updateInviteStatus = (inviteId, status) => {
    const updated = invites.map((invite) =>
      (invite._id || invite.id || invite.inviteId) === inviteId ? { ...invite, status } : invite
    );
    setInvites(updated);
    onInvitesUpdated?.(updated.filter((invite) => (invite.status || 'PENDING').toUpperCase() === 'PENDING').length);
  };

  const handleInviteAction = async (invite, action) => {
    const inviteId = invite._id || invite.id || invite.inviteId;
    setProcessingId(inviteId);
    setInviteError('');
    setActionSuccess('');
    try {
      if (action === 'ACCEPTED') {
        await acceptInvite(inviteId);
        setActionSuccess(`Accepted invitation to join as ${formatRoleLabel(invite.role) || 'Member'}!`);
      } else {
        await rejectInvite(inviteId);
        setActionSuccess('Invitation declined.');
      }
      updateInviteStatus(inviteId, action);
    } catch (err) {
      setInviteError(getFriendlyErrorMessage(err, action === 'ACCEPTED' ? 'accept-invite' : 'reject-invite'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevokeInvite = async (invite) => {
    const inviteId = invite._id || invite.id || invite.inviteId;
    setProcessingId(inviteId);
    setInviteError('');
    setActionSuccess('');
    try {
      await revokeInvite(inviteId);
      setActionSuccess(`Invitation for ${invite.assigneeEmail || invite.email || 'user'} has been revoked.`);
      updateInviteStatus(inviteId, 'REVOKED');
      setConfirmRevokeId(null);
    } catch (err) {
      setInviteError(getFriendlyErrorMessage(err, 'revoke-invite'));
    } finally {
      setProcessingId(null);
    }
  };

  const statCards = [
    { label: 'Total invites', value: stats.total, icon: FiFolder, badge: '#23186e', iconColor: '#c8c2ff', note: 'All invitations' },
    { label: 'Pending invites', value: stats.pending, icon: FiClock, badge: '#9b98bf', iconColor: '#261d60', note: 'Needs your response' },
    { label: 'Rejected invites', value: stats.rejected, icon: FiAlertCircle, badge: '#ff8181', iconColor: '#451a1a', note: 'Across all projects' },
    { label: 'Accepted invites', value: stats.accepted, icon: FiCheckCircle, badge: '#02e871', iconColor: '#064d2a', note: 'Across all projects' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn px-3 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">Invites</h1>
          <p className="text-sm text-slate-500 dark:text-[#b3b3b3] mt-1">Manage your invites in one place. Review and respond to pending invitations.</p>
        </div>
        <button type="button" onClick={fetchInvites} disabled={isLoadingInvites} title="Refresh invites" aria-label="Refresh invites" className="mt-1 p-2.5 rounded-full border border-slate-200 dark:border-[#353535] bg-white dark:bg-[#1d1d1d] text-slate-600 dark:text-[#d1d5db] hover:bg-slate-50 dark:hover:bg-[#262626] transition disabled:opacity-50">
          <FiRefreshCw size={17} className={isLoadingInvites ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, badge, iconColor, note }) => (
          <section key={label} className="min-h-[142px] rounded-2xl border border-slate-200/80 dark:border-[#3a3a3a] bg-white dark:bg-[#1d1d1d] p-5">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: badge, color: iconColor }}><Icon size={18} /></span>
              <div><p className="text-sm text-slate-600 dark:text-[#d4d4d4]">{label}</p><p className="text-2xl leading-7 font-bold text-slate-900 dark:text-white">{value}</p></div>
            </div>
            <div className="border-t border-slate-200 dark:border-[#343434] mt-4 pt-3 text-[11px] text-slate-500 dark:text-[#a8a8a8]">{note}</div>
          </section>
        ))}
      </div>

      {canSendInvitesSection && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-[#3a3a3a] bg-white dark:bg-[#1d1d1d] p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9]">Invite to Frietsync</h2>
          <p className="text-xs text-slate-500 dark:text-[#b3b3b3] mt-1 mb-5">Invite upto 6 people with email</p>
          <MultiInviteForm onSuccess={fetchInvites} />
        </section>
      )}

      <section className="rounded-2xl border border-slate-200/80 dark:border-[#3a3a3a] bg-white dark:bg-[#1d1d1d] p-5 sm:p-7">
        <h2 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9] mb-4">My invites</h2>

        {actionSuccess && <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399] text-xs sm:text-sm flex items-center gap-2"><FiCheck size={16} /><span>{actionSuccess}</span></div>}
        {inviteError && <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center gap-2"><FiAlertCircle size={16} /><span>{inviteError}</span></div>}

        <div className="hidden md:grid grid-cols-[minmax(180px,1.3fr)_minmax(130px,0.8fr)_minmax(180px,1.3fr)_minmax(120px,0.8fr)_minmax(130px,1fr)] gap-4 rounded-xl bg-slate-100 dark:bg-[#292929] px-4 py-3 text-[11px] font-semibold text-slate-700 dark:text-[#e4e4e4]">
          <span>Assignee</span><span>Role</span><span>Project</span><span>Status</span><span>Expires</span>
        </div>

        {isLoadingInvites && invites.length === 0 ? (
          <LoadingScreen fullScreen label="Loading invitations" />
        ) : invites.length === 0 ? (
          <div className="py-14 text-center text-slate-400 dark:text-[#b3b3b3]"><div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-blue-950/40 text-sky-500 dark:text-blue-400 mx-auto flex items-center justify-center mb-3"><FiInbox size={23} /></div><p className="text-sm font-semibold text-slate-700 dark:text-[#F1F5F9]">No invitations found</p><p className="text-xs mt-1">Pending workspace invitations sent to your account will appear here.</p></div>
        ) : (
          <div className="mt-2 divide-y divide-slate-100 dark:divide-[#303030]">
            {invites.map((invite) => {
              const inviteId = invite._id || invite.id || invite.inviteId;
              const status = (invite.status || 'PENDING').toUpperCase();
              const isProcessing = processingId === inviteId;
              const assignee = invite.assigneeEmail || invite.recipientEmail || invite.email || invite.senderEmail || invite.name || 'Member';
              const project = invite.projectName || invite.workspaceName || invite.project?.name || invite.workspace?.name || 'Frietsync Workspace';
              const expiry = formatDate(invite.expiresAt || invite.expiresDate || invite.expirationDate);
              const statusStyle = status === 'ACCEPTED'
                ? 'bg-[#71ff94] text-[#12351d]'
                : status === 'REJECTED' || status === 'DECLINED'
                  ? 'bg-[#ff8181] text-[#471d1d]'
                  : status === 'REVOKED'
                    ? 'bg-slate-200 text-slate-700 dark:bg-[#343438] dark:text-[#ccc]'
                    : 'bg-[#ffff64] text-[#3c3c1e]';
              return (
                <div key={inviteId} className="rounded-xl px-3 sm:px-4 py-4 hover:bg-slate-50 dark:hover:bg-[#242424] transition">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,1.3fr)_minmax(130px,0.8fr)_minmax(180px,1.3fr)_minmax(120px,0.8fr)_minmax(130px,1fr)] gap-3 md:gap-4 md:items-center">
                    <div className="flex items-center gap-2.5 min-w-0"><span className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: getAvatarColor(assignee) }}>{getInitials(assignee)}</span><span className="truncate text-sm text-slate-800 dark:text-[#e5e5e5]">{assignee}</span></div>
                    <div className="flex items-center gap-2 md:block"><span className="md:hidden text-[11px] text-slate-500">Role</span><span className="text-xs text-slate-700 dark:text-[#ddd]">{formatRoleLabel(invite.role || 'CONTRIBUTOR')}</span></div>
                    <div className="flex items-center gap-2 md:block min-w-0"><span className="md:hidden text-[11px] text-slate-500">Project</span><span className="truncate block text-xs text-slate-700 dark:text-[#ddd]">{project}</span></div>
                    <div className="flex items-center gap-2 md:block"><span className="md:hidden text-[11px] text-slate-500">Status</span><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle}`}>{status.replaceAll('_', ' ')}</span></div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 md:block"><span className="md:hidden text-[11px] text-slate-500">Expires</span><span className="text-xs text-slate-700 dark:text-[#ddd]">{expiry}</span></div>
                      {status === 'PENDING' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => handleInviteAction(invite, 'ACCEPTED')} disabled={isProcessing} title="Accept invitation" aria-label="Accept invitation" className="p-1.5 rounded-full text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 disabled:opacity-50 cursor-pointer"><FiCheck size={16} /></button>
                          <button type="button" onClick={() => handleInviteAction(invite, 'REJECTED')} disabled={isProcessing} title="Decline invitation" aria-label="Decline invitation" className="p-1.5 rounded-full text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 disabled:opacity-50 cursor-pointer">{isProcessing ? <span className="block h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <FiX size={16} />}</button>
                          {canSendInvitesSection && (
                            <button type="button" onClick={() => setConfirmRevokeId(inviteId)} disabled={isProcessing} title="Revoke invitation" aria-label="Revoke invitation" className="p-1.5 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-50 cursor-pointer"><FiSlash size={15} /></button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {confirmRevokeId === inviteId && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/50 animate-fadeIn">
                      <div className="text-amber-900 dark:text-amber-200">
                        Are you sure you want to revoke this invitation for <strong className="font-semibold">{assignee}</strong>?
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(null)}
                          disabled={isProcessing}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white dark:text-[#bbb] dark:hover:bg-[#222] rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(invite)}
                          disabled={isProcessing}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? 'Revoking...' : 'Confirm Revoke'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default InvitesView;
