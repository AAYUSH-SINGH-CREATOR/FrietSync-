import { useState, useMemo } from 'react';
import { FiLock, FiClock, FiCheck, FiShare2, FiBarChart2 } from 'react-icons/fi';
import { voteInPoll, closePoll, getFriendlyErrorMessage } from '../services/pollApi';

const PollCard = ({
  poll,
  currentUserId,
  canManage = false,
  onPollUpdated,
  onShareToChat,
}) => {
  const [isVoting, setIsVoting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pollId = poll?.id || poll?._id || poll?.pollId;
  const isClosed = poll?.status === 'CLOSED' || poll?.closed === true || (poll?.closesAt && new Date(poll.closesAt) < new Date());

  // Check if current user voted
  const localVotedKey = `frietSync_poll_${pollId}_voted`;
  const savedVotedOptionId = typeof window !== 'undefined' ? localStorage.getItem(localVotedKey) : null;
  const userVotedOptionId = poll?.userVotedOptionId || poll?.votedOptionId || savedVotedOptionId || (
    poll?.options?.find((o) => o.hasVoted || (Array.isArray(o.voterIds) && currentUserId && o.voterIds.includes(currentUserId)))?.id
  );

  const totalVotes = useMemo(() => {
    if (typeof poll?.totalVotes === 'number') return poll.totalVotes;
    return (poll?.options || []).reduce((acc, o) => acc + (o.voteCount || o.votes || 0), 0);
  }, [poll]);

  const handleVote = async (optionId) => {
    if (!pollId || isClosed || isVoting) return;
    setErrorMsg('');
    setIsVoting(true);
    setSelectedOptionId(optionId);
    try {
      localStorage.setItem(localVotedKey, optionId);
      const updated = await voteInPoll(pollId, optionId);
      onPollUpdated?.(updated || { ...poll, userVotedOptionId: optionId });
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err, 'poll'));
    } finally {
      setIsVoting(false);
    }
  };

  const handleClosePoll = async () => {
    if (!pollId || isClosing || isClosed) return;
    if (!window.confirm('Are you sure you want to close this poll? Further votes will not be allowed.')) return;
    setIsClosing(true);
    setErrorMsg('');
    try {
      const updated = await closePoll(pollId);
      onPollUpdated?.(updated || { ...poll, status: 'CLOSED', closed: true });
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err, 'poll'));
    } finally {
      setIsClosing(false);
    }
  };

  const formatDeadline = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`rounded-2xl border bg-white p-4 transition-all shadow-xs dark:bg-[#1e1e22] ${
      isClosed
        ? 'border-slate-200 dark:border-[#303030] opacity-95'
        : 'border-slate-200/90 dark:border-[#333] hover:border-sky-300 dark:hover:border-sky-700'
    }`}>
      {/* Top badges row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            isClosed
              ? 'bg-slate-100 text-slate-600 dark:bg-[#2b2b2e] dark:text-[#aaa]'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
          }`}>
            {isClosed ? <FiLock size={11} /> : <FiClock size={11} />}
            {isClosed ? 'Closed' : 'Active Poll'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-[#2b2b2e] dark:text-[#999]">
            {poll?.mode === 'MULTI' ? 'Multi Choice' : 'Single Choice'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onShareToChat && (
            <button
              type="button"
              onClick={() => onShareToChat(poll)}
              title="Share poll in chat"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40 cursor-pointer"
            >
              <FiShare2 size={12} /> Share
            </button>
          )}
          {canManage && !isClosed && (
            <button
              type="button"
              onClick={handleClosePoll}
              disabled={isClosing}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-[#38383e] dark:text-[#aaa] dark:hover:bg-rose-950/30 dark:hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
            >
              {isClosing ? 'Closing...' : 'Close Poll'}
            </button>
          )}
        </div>
      </div>

      {/* Question & Description */}
      <div className="mt-2.5">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base leading-snug">
          {poll?.question || 'Untitled Poll'}
        </h4>
        {poll?.description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-[#999] leading-relaxed">
            {poll.description}
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Options List with Progress Bars */}
      <div className="mt-3.5 space-y-2">
        {(poll?.options || []).map((opt, idx) => {
          const optId = opt.id || opt._id || opt.optionId || String(idx);
          const optText = opt.text || opt.label || opt.title || opt.optionText || (typeof opt === 'string' ? opt : `Option ${idx + 1}`);
          const count = opt.voteCount ?? opt.votes ?? opt.count ?? 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = userVotedOptionId === optId || selectedOptionId === optId;

          return (
            <button
              key={optId}
              type="button"
              disabled={isClosed || isVoting}
              onClick={() => handleVote(optId)}
              className={`group relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500/50 dark:border-sky-400 dark:bg-sky-950/20'
                  : 'border-slate-200/80 bg-slate-50/60 hover:border-sky-300 hover:bg-slate-100/60 dark:border-[#303030] dark:bg-[#252528] dark:hover:border-[#48484e]'
              } ${isClosed ? 'cursor-default' : ''}`}
            >
              {/* Animated Progress Fill */}
              <div
                style={{ width: `${percentage}%` }}
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  isSelected
                    ? 'bg-sky-200/60 dark:bg-sky-800/40'
                    : 'bg-slate-200/70 dark:bg-[#343438]'
                }`}
              />

              {/* Foreground Content */}
              <div className="relative flex items-center justify-between gap-3 text-xs font-medium">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                    isSelected
                      ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500'
                      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#2a2a2e]'
                  }`}>
                    {isSelected && <FiCheck size={10} className="stroke-[3]" />}
                  </span>
                  <span className={`truncate ${isSelected ? 'font-bold text-sky-900 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200'}`}>
                    {optText}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold">
                  <span className={isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}>
                    {percentage}%
                  </span>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-[#888]">
                    ({count})
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-[#2d2d32] dark:text-[#777]">
        <div className="flex items-center gap-1.5">
          <FiBarChart2 size={12} />
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total</span>
          {userVotedOptionId && <span className="text-sky-600 dark:text-sky-400 font-semibold">• You voted</span>}
        </div>
        {poll?.closesAt && (
          <span title={poll.closesAt}>
            {isClosed ? 'Closed' : 'Closes'}: {formatDeadline(poll.closesAt)}
          </span>
        )}
      </div>
    </div>
  );
};

export default PollCard;
