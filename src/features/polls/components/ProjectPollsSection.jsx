import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiBarChart2, FiPlus, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { getProjectPolls, getFriendlyErrorMessage } from '../services/pollApi';
import PollCard from './PollCard';
import CreatePollModal from './CreatePollModal';

const ProjectPollsSection = ({
  projectId,
  projectName = 'this project',
  canManage = false,
  currentUserId,
  onShareToChat,
}) => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!projectId) return undefined;
    let isMounted = true;
    getProjectPolls(projectId)
      .then((data) => {
        if (isMounted) {
          setPolls(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getFriendlyErrorMessage(err, 'poll'));
          setPolls([]);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [projectId, refreshTrigger]);

  const loadPolls = useCallback(() => {
    setIsLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  const handlePollUpdated = (updated) => {
    const targetId = updated?.id || updated?._id || updated?.pollId;
    if (!targetId) return;
    setPolls((prev) => prev.map((p) => ((p.id || p._id || p.pollId) === targetId ? { ...p, ...updated } : p)));
  };

  const handlePollCreated = (created) => {
    if (created) {
      setPolls((prev) => [created, ...prev]);
    }
  };

  const filteredPolls = useMemo(() => {
    return polls.filter((p) => {
      const isClosed = p.status === 'CLOSED' || p.closed === true || (p.closesAt && new Date(p.closesAt) < new Date());
      if (filter === 'active') return !isClosed;
      if (filter === 'closed') return isClosed;
      return true;
    });
  }, [polls, filter]);

  const activeCount = polls.filter((p) => !(p.status === 'CLOSED' || p.closed === true || (p.closesAt && new Date(p.closesAt) < new Date()))).length;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7">
      {}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-[#303030]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <FiBarChart2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9]">Project Polls & Decisions</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-[#252528] dark:text-[#bbb]">{polls.length}</span>
              {activeCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {activeCount} active
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#999]">Vote on technical approaches and collaborate on key team decisions.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={loadPolls} disabled={isLoading} title="Refresh polls" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-[#333] dark:bg-[#202020] dark:text-[#ddd] cursor-pointer"><FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition cursor-pointer"
          >
            <FiPlus size={15} /> Create Poll
          </button>
        </div>
      </div>

      {}
      {polls.length > 0 && (
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs dark:border-[#303030] dark:bg-[#232326]">
          {['all', 'active', 'closed'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1 font-semibold transition capitalize cursor-pointer ${
                filter === key
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1a1a1d] dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2"><FiAlertCircle size={15} /><span>{error}</span></div>
          <button type="button" onClick={loadPolls} className="font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      {}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[0, 1].map((n) => <div key={n} className="h-44 rounded-2xl bg-slate-100 dark:bg-[#252528] animate-pulse" />)}
        </div>
      ) : filteredPolls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPolls.map((poll) => (
            <PollCard
              key={poll.id || poll._id}
              poll={poll}
              currentUserId={currentUserId}
              canManage={canManage}
              onPollUpdated={handlePollUpdated}
              onShareToChat={onShareToChat}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-8 text-center dark:bg-[#1e1e22]/50">
          <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
            <FiBarChart2 size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {filter !== 'all' ? `No ${filter} polls found` : `No polls in ${projectName} yet`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#999]">
            Create a poll to propose solutions, vote on next steps, or collect team opinions.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition cursor-pointer"
          >
            <FiPlus size={14} /> Create First Poll
          </button>
        </div>
      )}

      <CreatePollModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        onPollCreated={handlePollCreated}
      />
    </section>
  );
};

export default ProjectPollsSection;
