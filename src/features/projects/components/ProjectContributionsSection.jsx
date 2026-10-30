import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCode,
  FiExternalLink,
  FiGithub,
  FiGitCommit,
  FiGitPullRequest,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUsers,
  FiX,
  FiCalendar,
  FiCheck,
} from 'react-icons/fi';
import { getFriendlyErrorMessage, getProjectContributions } from '../services/projectApi';

const AVATAR_COLORS = [
  'bg-emerald-600', 'bg-sky-600', 'bg-pink-600', 'bg-purple-600',
  'bg-blue-600', 'bg-amber-600', 'bg-rose-600', 'bg-teal-600',
];

const getInitials = (name = '') => {
  const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
  if (words.length === 0) return 'U';
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getAvatarColor = (name = '', index = 0) => {
  const hash = [...(name || 'User')].reduce((sum, char) => sum + char.charCodeAt(0), index);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatNumber = (value = 0) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value.toLocaleString());
};

const getContributionList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.contributions)) return response.contributions;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getContributorName = (item, index) => (
  item.author?.login || item.author?.username || item.author?.name || item.username ||
  item.login || item.contributor || item.name || `Contributor ${index + 1}`
);

const parseContribution = (item, index) => {
  const username = getContributorName(item, index);
  const avatarUrl = item.author?.avatarUrl || item.author?.avatar_url || item.avatarUrl || item.avatar_url || null;
  const htmlUrl = item.author?.htmlUrl || item.author?.html_url || item.htmlUrl || item.html_url ||
    (!username.startsWith('Contributor ') ? `https://github.com/${username}` : null);
  const weeklyCommits = Array.isArray(item.weeks)
    ? item.weeks.reduce((total, week) => total + Number(week.c || 0), 0)
    : 0;
  const commits = Number(item.total ?? item.commits ?? item.commitCount ?? item.totalCommits ?? weeklyCommits);

  const pullRequests = Number(item.pullRequests ?? 0);
  const mergedPullRequests = Number(item.mergedPullRequests ?? 0);
  const githubLogin = item.githubLogin || item.username || username;
  const name = item.name || username;
  const userId = item.userId || item.id;
  const activity = item.activity || [];

  return {
    id: item.id || username || index,
    userId,
    username,
    name,
    githubLogin,
    avatarUrl,
    htmlUrl,
    commits,
    pullRequests,
    mergedPullRequests,
    activity,
  };
};

const SummaryMetric = ({ icon: Icon, label, value, tone, symbol }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 shadow-2xs dark:border-[#2d2d34] dark:bg-[#1b1b1f]">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
      {Icon ? <Icon size={18} /> : <span className="text-xs font-bold">{symbol}</span>}
    </div>
    <div className="min-w-0">
      <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="block text-xl font-bold leading-tight text-slate-900 dark:text-white sm:text-2xl">{value}</span>
    </div>
  </div>
);

const ContributorDetailsModal = ({ contributor, onClose }) => {
  if (!contributor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#2d2d34] dark:bg-[#171717]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-[#2d2d34]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Contributor Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#25252c] dark:hover:text-white"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {contributor.avatarUrl ? (
              <img
                src={contributor.avatarUrl}
                alt={contributor.username}
                className="h-16 w-16 rounded-full border-2 border-slate-200 object-cover shadow-md dark:border-slate-700"
              />
            ) : (
              <span className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-md ${getAvatarColor(contributor.username, 0)}`}>
                {getInitials(contributor.username)}
              </span>
            )}
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{contributor.name || contributor.username}</p>
              {contributor.githubLogin && (
                <p className="text-sm text-slate-500 dark:text-slate-400">@{contributor.githubLogin}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-[#2d2d34] dark:bg-[#1b1b1f]">
              <FiGitCommit size={20} className="mb-2 text-sky-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{contributor.commits}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Commits</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-[#2d2d34] dark:bg-[#1b1b1f]">
              <FiGitPullRequest size={20} className="mb-2 text-purple-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{contributor.pullRequests}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Pull Requests</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-[#2d2d34] dark:bg-[#1b1b1f]">
              <FiCheck size={20} className="mb-2 text-emerald-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{contributor.mergedPullRequests}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Merged PRs</span>
            </div>
          </div>

          {contributor.activity && contributor.activity.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiCalendar size={16} className="text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</h4>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2d2d34] dark:bg-[#1b1b1f]">
                {contributor.activity.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0 dark:border-[#2d2d34]">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date'}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.commits} {item.commits === 1 ? 'commit' : 'commits'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contributor.githubLogin && (
            <a
              href={`https://github.com/${contributor.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#2d2d34] dark:bg-[#25252c] dark:text-slate-300 dark:hover:bg-[#2b2b32]"
            >
              <FiGithub size={16} />
              View GitHub Profile
              <FiExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const ContributorRow = ({ contributor, index, totalCommits, onOpenDetails }) => {
  const percentage = totalCommits > 0 ? Math.round((contributor.commits / totalCommits) * 100) : 0;
  const avatarColor = getAvatarColor(contributor.username, index);

  return (
    <article
      onClick={() => onOpenDetails?.(contributor)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(contributor); } }}
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col justify-between gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition hover:border-sky-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-[#2d2d34] dark:bg-[#1b1b1f] dark:hover:border-sky-700 dark:hover:bg-[#1f1f24] sm:flex-row sm:items-center sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-slate-400 dark:text-slate-500">#{index + 1}</span>
        {contributor.avatarUrl ? (
          <img src={contributor.avatarUrl} alt={contributor.username} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover shadow-2xs dark:border-slate-700" />
        ) : (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs ${avatarColor}`}>{getInitials(contributor.username)}</span>
        )}
        <div className="min-w-0">
          <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate text-xs font-bold text-slate-900 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-400 sm:text-sm">
            <span className="truncate">{contributor.username}</span>
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {contributor.commits} {contributor.commits === 1 ? 'commit' : 'commits'}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-[#2b2b34] sm:w-28">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-500" style={{ width: `${Math.max(percentage, 4)}%` }} />
          </div>
          <span className="w-9 text-right font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{percentage}%</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-md border border-purple-200/60 bg-purple-50 px-2 py-0.5 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-400" title="Pull requests">
            <FiGitPullRequest size={10} />{formatNumber(contributor.pullRequests)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400" title="Merged pull requests">
            <FiCheck size={10} />{formatNumber(contributor.mergedPullRequests)}
          </span>
        </div>
      </div>
    </article>
  );
};

const ProjectContributionsSection = ({
  projectId,
  linkedRepo,
  canManage = false,
  onOpenLinkModal,
  onUnlinkRepo,
  isUnlinkingRepo = false,
}) => {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedContributor, setSelectedContributor] = useState(null);

  const owner = linkedRepo?.owner || '';
  const repository = linkedRepo?.repository || linkedRepo?.repo || '';
  const fullName = owner && repository ? `${owner}/${repository}` : '';
  const repositoryUrl = fullName ? `https://github.com/${fullName}` : null;

  useEffect(() => {
    let isCurrent = true;
    if (!projectId) return undefined;

    const loadContributions = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await getProjectContributions(projectId);
        if (!isCurrent) return;
        const parsed = getContributionList(response).map(parseContribution);
        parsed.sort((left, right) => right.commits - left.commits);
        setContributions(parsed);
      } catch (error) {
        if (!isCurrent) return;
        setErrorMessage(getFriendlyErrorMessage(error, 'project') || 'Unable to load GitHub contributions for this repository.');
        setContributions([]);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadContributions();
    return () => { isCurrent = false; };
  }, [projectId, linkedRepo, refreshKey]);

  const totals = useMemo(() => contributions.reduce((summary, contributor) => ({
    commits: summary.commits + contributor.commits,
    pullRequests: summary.pullRequests + contributor.pullRequests,
    mergedPullRequests: summary.mergedPullRequests + contributor.mergedPullRequests,
  }), { commits: 0, pullRequests: 0, mergedPullRequests: 0 }), [contributions]);

  const refresh = () => setRefreshKey((key) => key + 1);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-colors dark:border-[#2d2d34] dark:bg-[#171717]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-[#2d2d34]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-100 text-slate-900 shadow-2xs dark:border-[#33333d] dark:bg-[#25252c] dark:text-white">
            <FiGithub size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">GitHub Contributions</h2>
              {contributions.length > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-[#27272e] dark:text-slate-300">{contributions.length}</span>}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {fullName ? `Contribution summaries and code metrics for ${fullName}` : 'Track code activity, commit velocity, and contributor summaries'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {repositoryUrl && (
            <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32] dark:hover:text-white">
              <FiExternalLink size={13} /><span className="hidden sm:inline">View Repository</span>
            </a>
          )}
          {linkedRepo && (
            <button type="button" onClick={refresh} disabled={isLoading} title="Refresh contributions" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32]">
              <FiRefreshCw size={14} className={isLoading ? 'animate-spin text-sky-500' : ''} />
            </button>
          )}
          {canManage && linkedRepo && (
            <button type="button" onClick={onUnlinkRepo} disabled={isUnlinkingRepo} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/60">
              <FiTrash2 size={13} /><span>{isUnlinkingRepo ? 'Unlinking…' : 'Unlink Repo'}</span>
            </button>
          )}
          {canManage && !linkedRepo && (
            <button type="button" onClick={onOpenLinkModal} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700">
              <FiPlus size={14} /><span>Link Repository</span>
            </button>
          )}
        </div>
      </header>

      {!linkedRepo && contributions.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center dark:border-[#32323a] dark:bg-[#1b1b1f]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-[#25252c] dark:text-slate-400"><FiCode size={22} /></div>
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">No GitHub repository linked to this project</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Link a repository to view contributor summaries, lines of code changed, and commit velocity directly inside your project dashboard.</p>
          </div>
          {canManage && <button type="button" onClick={onOpenLinkModal} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"><FiPlus size={14} />Link GitHub Repository</button>}
        </div>
      ) : errorMessage && contributions.length === 0 ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300 sm:text-sm">
          <span className="flex items-center gap-2"><FiAlertCircle size={18} className="shrink-0" />{errorMessage}</span>
          <button type="button" onClick={refresh} className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-700">Retry</button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <SummaryMetric icon={FiGitCommit} label="Total Commits" value={isLoading ? '—' : formatNumber(totals.commits)} tone="border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/40 dark:bg-sky-950/50 dark:text-sky-400" />
            <SummaryMetric icon={FiGitPullRequest} label="Pull Requests" value={isLoading ? '—' : formatNumber(totals.pullRequests)} tone="border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-900/40 dark:bg-purple-950/50 dark:text-purple-400" />
            <SummaryMetric icon={FiCheck} label="Merged PRs" value={isLoading ? '—' : formatNumber(totals.mergedPullRequests)} tone="border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/50 dark:text-emerald-400" />
            <SummaryMetric icon={FiUsers} label="Contributors" value={isLoading ? '—' : contributions.length} tone="border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900/40 dark:bg-indigo-950/50 dark:text-indigo-400" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contributors Activity Breakdown</h3>
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#27272e]" />)
            ) : contributions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">No commit activity recorded yet in this repository.</div>
            ) : (
              contributions.map((contributor, index) => (
                <ContributorRow
                  key={contributor.id}
                  contributor={contributor}
                  index={index}
                  totalCommits={totals.commits}
                  onOpenDetails={setSelectedContributor}
                />
              ))
            )}
          </div>
        </div>
      )}
      {selectedContributor && (
        <ContributorDetailsModal
          contributor={selectedContributor}
          onClose={() => setSelectedContributor(null)}
        />
      )}
    </section>
  );
};

export default ProjectContributionsSection;
