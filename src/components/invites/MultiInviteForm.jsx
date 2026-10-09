import { useState } from 'react';
import {
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiChevronDown,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  sendSequentialInvites,
  getFriendlyErrorMessage,
} from '../../services/inviteApi';

const ROLE_OPTIONS = [
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'REPORTER', label: 'Reporter' },
];

const MAX_MEMBERS = 6;

const getDefaultExpiryDate = (daysAhead = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

const getTodayString = () => new Date().toISOString().slice(0, 10);

const createEmptyMember = () => ({
  id: `${Date.now()}-${Math.random()}`,
  email: '',
  role: 'CONTRIBUTOR',
  expiresDate: getDefaultExpiryDate(7),
});

const MultiInviteForm = ({ onSuccess, onCancel, showCancel = false }) => {
  const [members, setMembers] = useState([createEmptyMember()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const todayStr = getTodayString();

  const handleAddMember = () => {
    if (members.length >= MAX_MEMBERS) return;
    setMembers((prev) => [...prev, createEmptyMember()]);
    if (statusMessage.type === 'error') {
      setStatusMessage({ type: '', text: '' });
    }
  };

  const handleRemoveMember = (index) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index, field, value) => {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    if (statusMessage.type === 'error') {
      setStatusMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validMembers = members.filter((m) => m.email.trim() !== '');

    if (validMembers.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter at least one email address.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const m of validMembers) {
      if (!emailRegex.test(m.email.trim())) {
        setStatusMessage({
          type: 'error',
          text: `Invalid email address format: "${m.email.trim()}".`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    setStatusMessage({ type: '', text: '' });
    setProgress({ current: 0, total: validMembers.length });

    const { successful, failed } = await sendSequentialInvites(
      validMembers,
      ({ current, total }) => {
        setProgress({ current, total });
      }
    );

    setIsSubmitting(false);

    if (failed) {
      const successCount = successful.length;
      const failedEmail = failed.item.email;
      const friendlyErr = getFriendlyErrorMessage(failed.rawError, 'invite');

      setStatusMessage({
        type: 'error',
        text:
          successCount > 0
            ? `Sent ${successCount} invite(s). Failed to invite ${failedEmail}: ${friendlyErr}`
            : `Failed to invite ${failedEmail}: ${friendlyErr}`,
      });

      const successfulEmails = successful.map((s) => s.item.email.trim());
      setMembers((prev) => {
        const remaining = prev.filter((m) => !successfulEmails.includes(m.email.trim()));
        return remaining.length > 0 ? remaining : [createEmptyMember()];
      });

      if (successCount > 0 && onSuccess) {
        onSuccess(successCount);
      }
    } else {
      const totalCount = successful.length;
      setStatusMessage({
        type: 'success',
        text:
          totalCount === 1
            ? 'Invitation sent successfully!'
            : `All ${totalCount} invitations sent successfully!`,
      });

      setMembers([createEmptyMember()]);

      if (onSuccess) {
        onSuccess(totalCount);
      }
    }
  };

  const filledCount = members.filter((m) => m.email.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {statusMessage.text && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <FiCheckCircle className="shrink-0 text-emerald-600" size={17} />
          ) : (
            <FiAlertCircle className="shrink-0 text-red-500" size={17} />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex-1 flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition shadow-2xs">
              <input
                type="email"
                placeholder="Add email here"
                value={member.email}
                disabled={isSubmitting}
                onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                className="flex-1 min-w-0 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
              />

              <div className="h-6 w-px bg-slate-200 shrink-0" />

              <div className="relative shrink-0">
                <select
                  value={member.role}
                  disabled={isSubmitting}
                  onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                  className="px-3 sm:px-3.5 py-2.5 pr-7 text-xs sm:text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer appearance-none hover:bg-slate-50 transition"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FiChevronDown
                  className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"
                />
              </div>
            </div>

            <div
              title="Invitation Expiration Date (Sent in UTC)"
              className="flex items-center border border-slate-300 rounded-xl px-2.5 sm:px-3 py-2 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition shadow-2xs shrink-0 sm:w-44"
            >
              <FiCalendar className="text-slate-400 mr-2 shrink-0" size={15} />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase mr-1.5 shrink-0">
                Expires:
              </span>
              <input
                type="date"
                value={member.expiresDate}
                min={todayStr}
                disabled={isSubmitting}
                onChange={(e) => handleMemberChange(index, 'expiresDate', e.target.value)}
                className="w-full text-xs font-medium text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>

            {members.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveMember(index)}
                disabled={isSubmitting}
                title="Remove invitation"
                aria-label="Remove invitation"
                className="self-center p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer shrink-0 disabled:opacity-40"
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleAddMember}
          disabled={members.length >= MAX_MEMBERS || isSubmitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
        >
          <FiPlus size={14} className="stroke-[2.5]" />
          <span>Add another</span>
          {members.length >= MAX_MEMBERS && (
            <span className="text-[11px] text-slate-400 font-normal ml-0.5">
              (Max {MAX_MEMBERS})
            </span>
          )}
        </button>

        <div className="flex items-center gap-2.5">
          {showCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  Sending {progress.total > 0 ? `(${progress.current}/${progress.total})` : ''}...
                </span>
              </>
            ) : (
              <span>
                Invite{filledCount > 1 ? ` (${filledCount})` : ''}
              </span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MultiInviteForm;

