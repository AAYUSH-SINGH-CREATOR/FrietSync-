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
} from '../services/inviteApi';

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
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                        <div
                            className={`flex-1 flex items-center border rounded-xl bg-white dark:bg-[#1E293B] overflow-hidden transition shadow-2xs ${failedEmail && member.email.trim() === failedEmail
                                    ? 'border-red-400 dark:border-rose-500/80 ring-2 ring-red-100 dark:ring-rose-950/50 bg-red-50/15 dark:bg-rose-950/20'
                                    : 'border-slate-300 dark:border-[#334155] focus-within:border-sky-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/50'
                                }`}
                        >
                            <input
                                type="email"
                                placeholder="Add email here"
                                value={member.email}
                                disabled={isSubmitting}
                                onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                                className="flex-1 min-w-0 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#64748B] bg-transparent outline-none"
                            />

                            <div className="h-6 w-px bg-slate-200 dark:bg-[#334155] shrink-0" />

                            <div className="relative shrink-0">
                                <select
                                    value={member.role}
                                    disabled={isSubmitting}
                                    onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                                    className="px-3 sm:px-3.5 py-2.5 pr-7 text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#CBD5E1] bg-transparent outline-none cursor-pointer appearance-none hover:bg-slate-50 dark:hover:bg-[#253247]/50 transition"
                                >
                                    {ROLE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9]">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown
                                    className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B] pointer-events-none text-xs"
                                />
                            </div>
                        </div>

                        <div
                            title="Invitation Expiration Date (Sent in UTC)"
                            className="flex items-center border border-slate-300 dark:border-[#334155] rounded-xl px-2.5 sm:px-3 py-2 bg-white dark:bg-[#1E293B] focus-within:border-sky-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/50 transition shadow-2xs shrink-0 sm:w-44"
                        >
                            <FiCalendar className="text-slate-400 dark:text-[#64748B] mr-2 shrink-0" size={15} />
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase mr-1.5 shrink-0">
                                Expires:
                            </span>
                            <input
                                type="date"
                                value={member.expiresDate}
                                min={todayStr}
                                disabled={isSubmitting}
                                onChange={(e) => handleMemberChange(index, 'expiresDate', e.target.value)}
                                className="w-full text-xs font-medium text-slate-700 dark:text-[#F1F5F9] outline-none bg-transparent cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                        {members.length > 1 && (
                            <button
                                type="button"
                                onClick={() => handleRemoveMember(index)}
                                disabled={isSubmitting}
                                title="Remove invitation"
                                aria-label="Remove invitation"
                                className="self-center p-2 rounded-xl text-slate-400 dark:text-[#64748B] hover:text-red-500 dark:hover:text-[#F87171] hover:bg-red-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0 disabled:opacity-40"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#253247] active:bg-slate-300 dark:active:bg-[#293548] text-slate-700 dark:text-[#CBD5E1] border border-transparent dark:border-[#334155] text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                    <FiPlus size={14} className="stroke-[2.5]" />
                    <span>Add another</span>
                    {members.length >= MAX_MEMBERS && (
                        <span className="text-[11px] text-slate-400 dark:text-[#64748B] font-normal ml-0.5">
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
                            className="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50"
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

