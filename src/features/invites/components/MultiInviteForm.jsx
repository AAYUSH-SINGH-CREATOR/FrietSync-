import { useState } from 'react';
import {
    FiPlus,
    FiX,
    FiCalendar,
    FiChevronDown,
    FiCheckCircle,
    FiAlertCircle,
} from 'react-icons/fi';
import {
    sendSequentialInvites,
    getFriendlyErrorMessage,
} from '../services/inviteApi';

const ROLE_OPTIONS = [
    { value: 'CONTRIBUTOR', label: 'Contributor' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
    { value: 'TEAM_LEAD', label: 'Team Lead' },
    { value: 'REPORTER', label: 'src/features/sprints/services/sprintsApi.jsReporter' },
];

const MAX_MEMBERS = 6;

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultExpiryDate = (daysAhead = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
  return formatLocalDate(d);
};

const getTodayString = () => formatLocalDate(new Date());

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
    const [failedEmail, setFailedEmail] = useState('');

    const todayStr = getTodayString();

    const handleAddMember = () => {
        if (members.length >= MAX_MEMBERS) return;
        setMembers((prev) => [...prev, createEmptyMember()]);
        if (statusMessage.type === 'error') {
            setStatusMessage({ type: '', text: '' });
        }
    };

    const handleRemoveMember = (index) => {
        if (members.length <= 1) {
            setMembers([createEmptyMember()]);
            setFailedEmail('');
            return;
        }
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
        if (failedEmail) {
            setFailedEmail('');
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

    const uniqueEmails = new Set(validMembers.map((member) => member.email.trim().toLowerCase()));
    if (uniqueEmails.size !== validMembers.length) {
      setStatusMessage({ type: 'error', text: 'Each email address can only be invited once per submission.' });
      return;
    }

    const invalidExpiry = validMembers.find((member) => !member.expiresDate || member.expiresDate < todayStr);
    if (invalidExpiry) {
      setStatusMessage({ type: 'error', text: `Choose a valid future expiration date for ${invalidExpiry.email.trim()}.` });
      return;
    }

        setIsSubmitting(true);
        setStatusMessage({ type: '', text: '' });
        setFailedEmail('');
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
            const failedTargetEmail = failed.item.email.trim();
            const friendlyErr = getFriendlyErrorMessage(failed.rawError, 'invite');

            const isSelfInvite =
                friendlyErr.toLowerCase().includes('yourself') ||
                (failed.rawError?.message || '').toLowerCase().includes('yourself') ||
                (failed.rawError?.data?.message || '').toLowerCase().includes('yourself');

            const errorDisplay = isSelfInvite
                ? successCount > 0
                    ? `Sent ${successCount} invite(s). Failed for ${failedTargetEmail}: You can't invite yourself.`
                    : "You can't invite yourself."
                : successCount > 0
                    ? `Sent ${successCount} invite(s). Failed to invite ${failedTargetEmail}: ${friendlyErr}`
                    : `Failed to invite ${failedTargetEmail}: ${friendlyErr}`;


            setStatusMessage({
                type: 'error',
                text: errorDisplay,
            });
            setFailedEmail(failedTargetEmail);

            const successfulEmails = successful.map((s) => s.item.email.trim().toLowerCase());
            setMembers((prev) => {
                const remaining = prev.filter((m) => !successfulEmails.includes(m.email.trim().toLowerCase()));
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
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all ${statusMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-[#34D399] border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-[#F87171] border border-red-200 dark:border-rose-800/60'
                        }`}
                >
                    {statusMessage.type === 'success' ? (
                        <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
                    ) : (
                        <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
                    )}
                    <span className="font-medium">{statusMessage.text}</span>
                </div>
            )}

            <div className="space-y-3">
                {members.map((member, index) => (
                    <div
                        key={member.id}
                        className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5"
                    >
                        <button type="button" onClick={() => handleRemoveMember(index)} disabled={isSubmitting} title={members.length === 1 ? 'Reset invitation row' : 'Remove invitation'} aria-label={members.length === 1 ? 'Reset invitation row' : 'Remove invitation'} className="self-start lg:self-auto p-2 text-[#ff8181] hover:bg-[#ff8181]/10 rounded-full transition disabled:opacity-40"><FiX size={17} /></button>
                        <div
                            className={`flex-1 flex items-center border rounded-full bg-white dark:bg-[#242424] overflow-hidden transition ${failedEmail && member.email.trim() === failedEmail
                                    ? 'border-red-400 dark:border-rose-500/80 ring-2 ring-red-100 dark:ring-rose-950/50 bg-red-50/15 dark:bg-rose-950/20'
                                    : 'border-slate-300 dark:border-[#3a3a3a] focus-within:border-sky-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/50'
                                }`}
                        >
                            <input
                                type="email"
                                placeholder="Enter email"
                                value={member.email}
                                disabled={isSubmitting}
                                onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                                className="flex-1 min-w-0 px-4 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] bg-transparent outline-none"
                            />
                        </div>

                        <div className="relative border border-slate-300 dark:border-[#555] rounded-full bg-white dark:bg-[#242424] focus-within:border-sky-500 dark:focus-within:border-sky-400 transition lg:w-44">
                            <select value={member.role} disabled={isSubmitting} onChange={(e) => handleMemberChange(index, 'role', e.target.value)} className="w-full appearance-none rounded-full px-4 py-2.5 pr-9 text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#e0e0e0] bg-transparent outline-none cursor-pointer">
                                {ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9]">{opt.label}</option>)}
                            </select>
                            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#858585] pointer-events-none text-xs" />
                        </div>

                        <div
                            title="Invitation Expiration Date (Sent in UTC)"
                            className="flex items-center border border-slate-300 dark:border-[#555] rounded-full px-3 py-2 bg-white dark:bg-[#242424] focus-within:border-sky-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/50 transition shrink-0 lg:w-52"
                        >
                            <FiCalendar className="text-slate-400 dark:text-[#858585] mr-2 shrink-0" size={15} />
                            <input
                                type="date"
                                value={member.expiresDate}
                                min={todayStr}
                                disabled={isSubmitting}
                                onChange={(e) => handleMemberChange(index, 'expiresDate', e.target.value)}
                                className="w-full min-w-0 text-xs font-medium text-slate-700 dark:text-[#F1F5F9] outline-none bg-transparent cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
                <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={members.length >= MAX_MEMBERS || isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1d1d1d] hover:bg-slate-50 dark:hover:bg-[#292929] text-slate-800 dark:text-[#e0e0e0] border border-slate-300 dark:border-[#777] text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                    <FiPlus size={14} className="stroke-[2.5]" />
                    <span>Add</span>
                </button>

                <div className="flex items-center gap-2.5">
                    {showCancel && onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-[#e0e0e0] hover:bg-slate-100 dark:hover:bg-[#242424] transition cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50"
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
                                    Send Invites{filledCount > 1 ? ` (${filledCount})` : ''}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default MultiInviteForm;

