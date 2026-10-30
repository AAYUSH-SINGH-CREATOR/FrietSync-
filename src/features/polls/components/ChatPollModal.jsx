import { useState, useEffect } from 'react';
import { FiX, FiBarChart2, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { getProjectPolls, getPollDetails } from '../services/pollApi';
import PollCard from './PollCard';
import CreatePollModal from './CreatePollModal';

const ChatPollModal = ({
  isOpen,
  onClose,
  activeChat,
  currentUserId,
  pollId,
  onShareToChat,
}) => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const projectId = activeChat?.id;
  const projectName = activeChat?.name || 'Project';

  useEffect(() => {
    if (!isOpen || !projectId) return undefined;
    let isMounted = true;
    (pollId ? getPollDetails(pollId).then((poll) => poll ? [poll] : []) : getProjectPolls(projectId))
      .then((data) => {
        if (isMounted) {
          setPolls(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPolls([]);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [isOpen, projectId, pollId, refreshTrigger]);

  if (!isOpen) return null;

  const reloadPolls = () => {
    setIsLoading(true);
    setRefreshTrigger((c) => c + 1);
  };

  const handlePollUpdated = (updated) => {
    const targetId = updated?.id || updated?._id || updated?.pollId;
    if (!targetId) return;
    setPolls((prev) => prev.map((p) => ((p.id || p._id || p.pollId) === targetId ? { ...p, ...updated } : p)));
  };

  const handlePollCreated = (created) => {
    if (created) {
      setPolls((prev) => [created, ...prev]);
      if (onShareToChat) {
        onShareToChat(created);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[#303030] dark:bg-[#1a1a1d] overflow-hidden">
        {}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-6 dark:border-[#2b2b2e]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <FiBarChart2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg leading-tight">
                Project Polls · {projectName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#999]">Vote or propose new decisions for this project</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reloadPolls}
              title="Refresh polls"
              className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-[#333] dark:text-[#aaa] dark:hover:bg-[#252528] cursor-pointer"
            >
              <FiRefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition cursor-pointer"
            >
              <FiPlus size={14} /> New Poll
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252528] cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <FiRefreshCw className="inline animate-spin mr-2" /> Loading project polls...
            </div>
          ) : polls.length > 0 ? (
            polls.map((poll) => (
              <PollCard
                key={poll.id || poll._id}
                poll={poll}
                currentUserId={currentUserId}
                canManage={true}
                onPollUpdated={handlePollUpdated}
                onShareToChat={(p) => {
                  onShareToChat?.(p);
                  onClose();
                }}
              />
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-[#252528] dark:text-[#777]">
                <FiBarChart2 size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No polls yet in {projectName}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#888]">Create a poll to get instant team consensus in chat.</p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition cursor-pointer"
              >
                <FiPlus size={14} /> Create First Poll
              </button>
            </div>
          )}
        </div>

        <CreatePollModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          projectId={projectId}
          onPollCreated={handlePollCreated}
        />
      </div>
    </div>
  );
};

export default ChatPollModal;
