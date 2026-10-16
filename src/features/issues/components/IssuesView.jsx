import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus,
  FiSearch,
  FiX,
  FiRefreshCw,
  FiFolder,
  FiAlertCircle,
  FiCheckCircle,
  FiFilter,
} from 'react-icons/fi';
import { AiOutlineBug } from 'react-icons/ai';
import { getProjectIssues, getFriendlyErrorMessage } from '../services/issueApi';
import { getMyProjects } from '../../projects/services/projectApi';
import IssueCard from './IssueCard';
import CreateIssueModal from './CreateIssueModal';
import IssueDetailsModal from './IssueDetailsModal';

const IssuesView = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [issues, setIssues] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [toastNotice, setToastNotice] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState(null);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice(null);
    }, 4500);
  }, []);

  useEffect(() => {
    let isMounted = true;

    getMyProjects()
      .then((projectList) => {
        if (!isMounted) return;
        const validProjects = Array.isArray(projectList) ? projectList : [];
        setProjects(validProjects);
      })
      .catch((err) => {
        if (!isMounted) return;
        setProjects([]);
        setError(getFriendlyErrorMessage(err, 'project'));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingProjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const pid = p.id || p._id || p.projectId;
      if (pid) map.set(String(pid), p.name || 'Project');
    });
    return map;
  }, [projects]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (isLoadingProjects) return;
    let isMounted = true;

    const fetchIssues = async () => {
      try {
        if (selectedProjectId === 'all') {
          if (projects.length === 0) {
            await Promise.resolve();
            if (isMounted) {
              setIssues([]);
              setIsLoadingIssues(false);
            }
            return;
          }

          const fetchPromises = projects.map(async (p) => {
            const pid = p.id || p._id || p.projectId;
            if (!pid) return [];
            try {
              const list = await getProjectIssues(pid);
              const safeList = Array.isArray(list) ? list : [];
              return safeList.map((item) => ({
                ...item,
                projectId: pid,
                projectName: p.name || 'Project',
              }));
            } catch {
              return [];
            }
          });

          const results = await Promise.allSettled(fetchPromises);
          if (!isMounted) return;

          const aggregated = [];
          results.forEach((res) => {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
              aggregated.push(...res.value);
            }
          });

          setIssues(aggregated);
          setError('');
        } else {
          const list = await getProjectIssues(selectedProjectId);
          if (!isMounted) return;

          const safeList = Array.isArray(list) ? list : [];
          const currentProjectName = projectMap.get(String(selectedProjectId)) || 'Project';
          const formatted = safeList.map((item) => ({
            ...item,
            projectId: selectedProjectId,
            projectName: currentProjectName,
          }));
          setIssues(formatted);
          setError('');
        }
      } catch (err) {
        if (!isMounted) return;
        setIssues([]);
        setError(getFriendlyErrorMessage(err, 'issue'));
      } finally {
        if (isMounted) {
          setIsLoadingIssues(false);
        }
      }
    };

    fetchIssues();

    return () => {
      isMounted = false;
    };
  }, [projects, selectedProjectId, isLoadingProjects, projectMap, refreshTrigger]);

  const handleRefreshIssues = () => {
    setIsLoadingIssues(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleIssueCreated = (created) => {
    const title = created?.title || 'New issue';
    showToast('success', `"${title}" was created successfully!`);
    handleRefreshIssues();
  };

  const counts = useMemo(() => {
    const all = issues.length;
    const critical = issues.filter(
      (i) => (i.priority || '').toUpperCase() === 'CRITICAL'
    ).length;
    const high = issues.filter(
      (i) => (i.priority || '').toUpperCase() === 'HIGH'
    ).length;
    const medium = issues.filter(
      (i) => (i.priority || '').toUpperCase() === 'MEDIUM'
    ).length;
    const low = issues.filter(
      (i) => (i.priority || '').toUpperCase() === 'LOW'
    ).length;

    return { all, critical, high, medium, low };
  }, [issues]);

  const priorityTabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'CRITICAL', label: 'Critical', count: counts.critical, dotColor: 'bg-rose-500' },
    { id: 'HIGH', label: 'High', count: counts.high, dotColor: 'bg-amber-500' },
    { id: 'MEDIUM', label: 'Medium', count: counts.medium, dotColor: 'bg-sky-500' },
    { id: 'LOW', label: 'Low', count: counts.low, dotColor: 'bg-slate-400' },
  ];

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (priorityFilter !== 'all') {
        if ((issue.priority || '').toUpperCase() !== priorityFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (issue.title || '').toLowerCase().includes(q);
        const descMatch = (issue.description || '').toLowerCase().includes(q);
        const projectMatch = (issue.projectName || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !projectMatch) {
          return false;
        }
      }

      return true;
    });
  }, [issues, priorityFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Issues
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#b3b3b3] mt-1">
            Track, prioritize, and resolve issues across your projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefreshIssues}
            disabled={isLoadingIssues}
            title="Refresh issues"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#1d1d1d] border border-slate-200/90 dark:border-[#303030] hover:bg-slate-50 dark:hover:bg-[#242424] text-slate-600 dark:text-[#e0e0e0] flex items-center justify-center shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={isLoadingIssues ? 'animate-spin text-sky-600 dark:text-[#60A5FA]' : ''}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer"
          >
            <FiPlus size={18} />
            <span>Create Issue</span>
          </button>
        </div>
      </div>

      {toastNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            toastNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-[#F87171]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastNotice.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
            ) : (
              <FiAlertCircle className="shrink-0 text-rose-600 dark:text-[#F87171]" size={17} />
            )}
            <span className="font-medium">{toastNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-xs font-semibold opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="shrink-0 text-rose-500 dark:text-[#F87171]" size={17} />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRefreshIssues}
            className="text-xs font-semibold underline text-rose-700 dark:text-[#F87171] hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/80 dark:bg-[#1d1d1d]/90 p-3 rounded-3xl border border-slate-200/80 dark:border-[#303030] shadow-xs backdrop-blur-xs">
          {/* Project Selector Dropdown */}
          <div className="flex items-center gap-2 min-w-0 sm:max-w-xs">
            <span className="text-xs font-bold text-slate-500 dark:text-[#b3b3b3] uppercase tracking-wider shrink-0 flex items-center gap-1.5 pl-1">
              <FiFolder size={14} className="text-sky-500" />
              <span>Project:</span>
            </span>
            <div className="relative flex-1 min-w-0">
              <select
                value={selectedProjectId}
                disabled={isLoadingProjects}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-slate-50/80 dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] text-xs sm:text-sm font-medium focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition appearance-none cursor-pointer truncate"
              >
                <option value="all">All Projects ({projects.length})</option>
                {projects.map((p) => {
                  const pid = p.id || p._id || p.projectId;
                  return (
                    <option key={pid} value={pid} className="dark:bg-[#242424]">
                      {p.name || 'Untitled Project'}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <FiFilter size={13} />
              </div>
            </div>
          </div>

          <div className="relative flex-1 md:max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search issues by title, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-slate-50/80 dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-[#242424]/80 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
          {priorityTabs.map((tab) => {
            const isSelected = priorityFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPriorityFilter(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-white dark:bg-[#1d1d1d] text-sky-600 dark:text-[#60A5FA] shadow-xs'
                    : 'text-slate-600 dark:text-[#b3b3b3] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
                }`}
              >
                {tab.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${tab.dotColor}`} />}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-sky-100 dark:bg-blue-950/60 text-sky-700 dark:text-[#60A5FA]'
                      : 'bg-slate-200/70 dark:bg-[#303030] text-slate-600 dark:text-[#e0e0e0]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingIssues ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#1d1d1d] rounded-3xl p-6 border border-slate-200/80 dark:border-[#303030] animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-16 bg-slate-100 dark:bg-[#242424] rounded-full" />
                <div className="h-5 w-20 bg-slate-100 dark:bg-[#242424] rounded-lg" />
              </div>
              <div className="h-6 w-3/4 bg-slate-100 dark:bg-[#242424] rounded-md" />
              <div className="h-10 bg-slate-50 dark:bg-[#242424]/60 rounded-md" />
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-[#242424] rounded" />
            </div>
          ))}
        </div>
      ) : filteredIssues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIssues.map((issue, idx) => {
            const issueKey = issue.id || issue._id || issue.issueId || `${issue.title || 'issue'}-${idx}`;
            return (
              <IssueCard
                key={issueKey}
                issue={issue}
                projectName={issue.projectName}
                onClick={(item) => setSelectedIssueForDetails(item)}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1d1d1d] rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-[#303030] shadow-xs text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-4 shadow-2xs">
            <AiOutlineBug size={32} />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] mb-1.5">
            {searchQuery
              ? 'No matching issues found'
              : priorityFilter !== 'all'
              ? `No ${priorityFilter.toLowerCase()} priority issues`
              : selectedProjectId === 'all'
              ? 'No issues created yet'
              : 'No issues in this project yet'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#b3b3b3] max-w-md mx-auto leading-relaxed mb-6">
            {searchQuery
              ? `No issues matched "${searchQuery}". Try a different search keyword.`
              : priorityFilter !== 'all'
              ? `There are currently no issues tagged with ${priorityFilter} priority.`
              : 'Get started by creating your first issue to track tasks, bugs, or feature improvements.'}
          </p>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition cursor-pointer"
          >
            <FiPlus size={17} />
            <span>Create New Issue</span>
          </button>
        </div>
      )}

      <CreateIssueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projects={projects}
        defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || projects[0]?._id || ''}
        onIssueCreated={handleIssueCreated}
      />

      <IssueDetailsModal
        isOpen={!!selectedIssueForDetails}
        onClose={() => setSelectedIssueForDetails(null)}
        issueId={selectedIssueForDetails?.id || selectedIssueForDetails?._id || selectedIssueForDetails?.issueId}
        initialIssue={selectedIssueForDetails}
        projectName={selectedIssueForDetails?.projectName}
      />
    </div>
  );
};

export default IssuesView;

