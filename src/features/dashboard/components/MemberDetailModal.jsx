import { useState, useEffect } from 'react';
import {
  FiX,
  FiUser,
  FiMail,
  FiBriefcase,
  FiGithub,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiDownload,
  FiActivity,
  FiLayers,
  FiList,
  FiClock,
  FiCheckSquare,
  FiGitPullRequest,
  FiCode,
  FiExternalLink,
} from 'react-icons/fi';
import {
  getUserRecord,
  getUserRecordSprints,
  getUserRecordIssues,
  getUserRecordActivity,
} from '../services/workspaceApi';
import { downloadUserRecordPdf } from '../utils/userRecordPdf';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiUser },
  { id: 'sprints', label: 'Sprints', icon: FiLayers },
  { id: 'issues', label: 'Issues', icon: FiList },
  { id: 'activity', label: 'Activity', icon: FiActivity },
];

const getInitials = (name = '') => {
  return (
    name
      .trim()
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'U'
  );
};

const getAvatarColor = (name = '') => {
  const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1'];
  const hash = [...(name || 'User')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StatCard = ({ icon: Icon, label, value, subtext, colorClass }) => (
  <div className="p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-semibold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">{label}</span>
      <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={14} />
      </span>
    </div>
    <p className="text-lg font-bold text-slate-900 dark:text-white">{value ?? '-'}</p>
    {subtext && <p className="text-[10px] text-slate-500 dark:text-[#888] mt-0.5">{subtext}</p>}
  </div>
);

const MemberDetailModal = ({ member, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [record, setRecord] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const memberId = member?.id || member?.userId || member?._id;

  const loadData = async () => {
    if (!memberId) return;
    setIsLoading(true);
    setError('');
    try {
      const [recordData, sprintsData, issuesData, activityData] = await Promise.all([
        getUserRecord(memberId),
        getUserRecordSprints(memberId),
        getUserRecordIssues(memberId),
        getUserRecordActivity(memberId),
      ]);
      setRecord(recordData);
      setSprints(Array.isArray(sprintsData) ? sprintsData : sprintsData?.items || []);
      setIssues(Array.isArray(issuesData) ? issuesData : issuesData?.items || []);
      setActivity(activityData);
    } catch (err) {
      setError(err.message || 'Failed to load member details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      loadData();
    }
    return () => {
      setRecord(null);
      setSprints([]);
      setIssues([]);
      setActivity(null);
      setError('');
      setActiveTab('overview');
    };
  }, [isOpen, memberId]);

  const handleDownloadPdf = async () => {
    if (!memberId) return;
    setIsDownloading(true);
    setDownloadError('');
    try {
      const data = record ? { member, record, sprints, issues, activity } : await Promise.all([
        getUserRecord(memberId),
        getUserRecordSprints(memberId),
        getUserRecordIssues(memberId),
        getUserRecordActivity(memberId),
      ]).then(([recordData, sprintData, issueData, activityData]) => ({
        member,
        record: recordData,
        sprints: Array.isArray(sprintData) ? sprintData : sprintData?.items || [],
        issues: Array.isArray(issueData) ? issueData : issueData?.items || [],
        activity: activityData,
      }));
      downloadUserRecordPdf(data);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setDownloadError(err.message || 'Could not generate the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !member) return null;

  const memberName = member.name || member.fullName || member.user?.name || 'Unknown';
  const memberEmail = member.email || member.user?.email || '';
  const memberRole = record?.role || member.role || member.workspaceRole || 'CONTRIBUTOR';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <section role="dialog" aria-modal="true" aria-label={`${memberName} record`} className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#35353d] dark:bg-[#171717]">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#303038]">
          <div className="flex items-center gap-3 min-w-0">
            {member.avatar || member.profilePictureUrl ? (
              <img
                src={member.avatar || member.profilePictureUrl}
                alt={memberName}
                className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: getAvatarColor(memberName) }}
              >
                {getInitials(memberName)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{memberName}</h2>
              <p className="text-xs text-slate-500 dark:text-[#94a3b8] truncate">{memberEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              title="Refresh data"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#28282e] transition disabled:opacity-50 cursor-pointer"
            >
              <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close member record"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#28282e] transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav aria-label="Member record sections" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-100 px-4 py-2 dark:border-[#2e2e34]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                  : 'text-slate-600 dark:text-[#999] hover:bg-slate-100 dark:hover:bg-[#28282e]'
              }`}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {downloadError && (
            <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {downloadError}
            </p>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FiAlertCircle size={32} className="text-rose-500 mb-2" />
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-3 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'overview' && record ? (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
                  <div className="flex items-center gap-2 mb-1">
                    <FiBriefcase size={12} className="text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-[#94a3b8] uppercase">Role</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{memberRole}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle size={12} className="text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-[#94a3b8] uppercase">Job Title</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{record.jobTitle || '-'}</p>
                </div>
              </div>

              {record.bio && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-[#94a3b8] uppercase">Bio</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{record.bio}</p>
                </div>
              )}

              {record.githubUrl && (
                <a
                  href={record.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] hover:bg-slate-50 dark:hover:bg-[#28282e] transition cursor-pointer"
                >
                  <FiGithub size={16} className="text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{record.githubUrl}</span>
                  <FiExternalLink size={12} className="text-slate-400 shrink-0" />
                </a>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={FiCheckSquare}
                  label="Projects"
                  value={record.projectCount}
                  subtext="Active projects"
                  colorClass="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                />
                <StatCard
                  icon={FiList}
                  label="Issues Created"
                  value={record.issues?.created}
                  subtext="Total created"
                  colorClass="bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                />
                <StatCard
                  icon={FiCheckCircle}
                  label="Issues Resolved"
                  value={record.issues?.resolved}
                  subtext={`Avg ${record.issues?.averageHoursToResolve?.toFixed(1)}h`}
                  colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                />
                <StatCard
                  icon={FiAlertCircle}
                  label="Reopened"
                  value={record.issues?.reopened}
                  subtext="Issues reopened"
                  colorClass="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                />
              </div>

              {/* Sprint Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard
                  icon={FiLayers}
                  label="Committed"
                  value={record.sprints?.committed}
                  colorClass="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                />
                <StatCard
                  icon={FiCheckCircle}
                  label="Completed"
                  value={record.sprints?.completed}
                  colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                />
                <StatCard
                  icon={FiClock}
                  label="Active"
                  value={record.sprints?.active}
                  colorClass="bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                />
                <StatCard
                  icon={FiLayers}
                  label="Planned"
                  value={record.sprints?.planned}
                  colorClass="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                />
                <StatCard
                  icon={FiActivity}
                  label="Completion"
                  value={record.sprints?.completionRate ? `${record.sprints.completionRate.toFixed(0)}%` : '-'}
                  colorClass="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                />
              </div>

              {/* GitHub Activity */}
              {activity && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">GitHub Activity</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                      <FiCode size={16} className="mx-auto mb-1 text-slate-500" />
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{activity.commits || 0}</p>
                      <p className="text-[10px] text-slate-500">Commits</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                      <FiGitPullRequest size={16} className="mx-auto mb-1 text-slate-500" />
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{activity.pullRequests || 0}</p>
                      <p className="text-[10px] text-slate-500">PRs</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                      <FiGitPullRequest size={16} className="mx-auto mb-1 text-emerald-500" />
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{activity.mergedPullRequests || 0}</p>
                      <p className="text-[10px] text-slate-500">Merged</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                      <FiActivity size={16} className="mx-auto mb-1 text-slate-500" />
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{activity.githubReviews || 0}</p>
                      <p className="text-[10px] text-slate-500">Reviews</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'sprints' ? (
            <div>
              {sprints.length === 0 ? (
                <div className="text-center py-12">
                  <FiLayers size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No sprint data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sprints.map((sprint) => (
                    <div
                      key={sprint.sprintId}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {sprint.name || `Sprint ${sprint.sprintNumber}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#888]">
                          {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          sprint.completed
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sprint.status === 'ACTIVE'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {sprint.completed ? 'Completed' : sprint.status || 'Planned'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'issues' ? (
            <div>
              {issues.length === 0 ? (
                <div className="text-center py-12">
                  <FiList size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No issues assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((issue) => (
                    <div
                      key={issue.issueId}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                            {issue.projectId?.slice(0, 4)}-{issue.issueNumber}
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {issue.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              issue.status === 'OPEN'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : issue.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {issue.status}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              issue.priority === 'HIGH'
                                ? 'bg-rose-100 text-rose-700'
                                : issue.priority === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {issue.priority}
                          </span>
                          {issue.reopened && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
                              Reopened
                            </span>
                          )}
                        </div>
                      </div>
                      {issue.hoursToResolve && (
                        <span className="text-[10px] text-slate-500 dark:text-[#888] shrink-0 ml-2">
                          {issue.hoursToResolve.toFixed(1)}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'activity' && activity ? (
            <div className="space-y-4">
              {/* GitHub Stats */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">GitHub Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                    <FiCode size={18} className="mx-auto mb-1 text-slate-500" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{activity.commits || 0}</p>
                    <p className="text-[10px] text-slate-500">Commits</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                    <FiGitPullRequest size={18} className="mx-auto mb-1 text-sky-500" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{activity.pullRequests || 0}</p>
                    <p className="text-[10px] text-slate-500">Pull Requests</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                    <FiGitPullRequest size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{activity.mergedPullRequests || 0}</p>
                    <p className="text-[10px] text-slate-500">Merged PRs</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]">
                    <FiActivity size={18} className="mx-auto mb-1 text-purple-500" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{activity.githubReviews || 0}</p>
                    <p className="text-[10px] text-slate-500">Reviews</p>
                  </div>
                </div>
              </div>

              {/* Repositories */}
              {activity.githubRepositories?.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Repositories</h3>
                  <div className="space-y-2">
                    {activity.githubRepositories.map((repo, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#26262b]"
                      >
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {repo.repository}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>{repo.commits} commits</span>
                          <span>{repo.pullRequests} PRs</span>
                          <span>{repo.mergedPullRequests} merged</span>
                          <span>{repo.reviews} reviews</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue Reviews */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] text-center">
                  <FiCheckCircle size={24} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{activity.issueReviewsApproved || 0}</p>
                  <p className="text-xs text-slate-500">Issue Reviews Approved</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] text-center">
                  <FiAlertCircle size={24} className="mx-auto mb-2 text-rose-500" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{activity.issueReviewsRejected || 0}</p>
                  <p className="text-xs text-slate-500">Issue Reviews Rejected</p>
                </div>
              </div>

              {/* Design Activity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{activity.designSubmissions || 0}</p>
                  <p className="text-xs text-slate-500">Design Submissions</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{activity.designReviews || 0}</p>
                  <p className="text-xs text-slate-500">Design Reviews</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No data available</div>
          )}
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-[#303038]">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading || isLoading}
            title={isDownloading ? 'Preparing PDF' : 'Download the complete member record as a PDF'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload size={13} className={isDownloading ? 'animate-pulse' : ''} />
            {isDownloading ? 'Preparing PDF…' : 'Download Record'}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default MemberDetailModal;
