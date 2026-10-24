import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCode,
  FiExternalLink,
  FiGithub,
  FiGitCommit,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUsers,
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

  let additions = Number(item.additions ?? item.linesAdded ?? item.added ?? 0);
  let deletions = Number(item.deletions ?? item.linesDeleted ?? item.deleted ?? 0);
  if (Array.isArray(item.weeks) && additions === 0 && deletions === 0) {
    item.weeks.forEach((week) => {
      additions += Number(week.a || 0);
      deletions += Number(week.d || 0);
    });
  }

  return {
    id: item.id || username || index,
    username,
    avatarUrl,
    htmlUrl,
    commits,
    additions,
    deletions,
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

const ContributorRow = ({ contributor, index, totalCommits }) => {
  const percentage = totalCommits > 0 ? Math.round((contributor.commits / totalCommits) * 100) : 0;
  const avatarColor = getAvatarColor(contributor.username, index);

  return (
    <article className="flex flex-col justify-between gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition hover:border-slate-300 dark:border-[#2d2d34] dark:bg-[#1b1b1f] dark:hover:border-[#3b3b44] sm:flex-row sm:items-center sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-slate-400 dark:text-slate-500">#{index + 1}</span>
        {contributor.avatarUrl ? (
          <img src={contributor.avatarUrl} alt={contributor.username} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover shadow-2xs dark:border-slate-700" />
        ) : (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs ${avatarColor}`}>{getInitials(contributor.username)}</span>
        )}
        <div className="min-w-0">
          {contributor.htmlUrl ? (
            <a href={contributor.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[220px] items-center gap-1.5 truncate text-xs font-bold text-slate-900 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-400 sm:text-sm">
              <span className="truncate">{contributor.username}</span><FiExternalLink size={12} className="shrink-0 text-slate-400" />
            </a>
          ) : (
            <span className="block truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">{contributor.username}</span>
          )}
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
          <span className="rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">+{formatNumber(contributor.additions)}</span>
          <span className="rounded-md border border-rose-200/60 bg-rose-50 px-2 py-0.5 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-400">-{formatNumber(contributor.deletions)}</span>
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
    additions: summary.additions + contributor.additions,
    deletions: summary.deletions + contributor.deletions,
  }), { commits: 0, additions: 0, deletions: 0 }), [contributions]);

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
            <SummaryMetric symbol="++" label="Additions" value={isLoading ? '—' : `+${formatNumber(totals.additions)}`} tone="border-emerald-100 bg-emerald-50 font-bold text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/50 dark:text-emerald-400" />
            <SummaryMetric symbol="--" label="Deletions" value={isLoading ? '—' : `-${formatNumber(totals.deletions)}`} tone="border-rose-100 bg-rose-50 font-bold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/50 dark:text-rose-400" />
            <SummaryMetric icon={FiUsers} label="Contributors" value={isLoading ? '—' : contributions.length} tone="border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-900/40 dark:bg-purple-950/50 dark:text-purple-400" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contributors Activity Breakdown</h3>
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#27272e]" />)
            ) : contributions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">No commit activity recorded yet in this repository.</div>
            ) : (
              contributions.map((contributor, index) => (
                <ContributorRow key={contributor.id} contributor={contributor} index={index} totalCommits={totals.commits} />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectContributionsSection;
