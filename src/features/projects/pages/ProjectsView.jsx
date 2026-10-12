import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiFolder,
  FiPlus,
  FiSearch,
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import { getMyProjects, getFriendlyErrorMessage } from '../services/projectApi';
import CreateProjectModal from '../components/CreateProjectModal';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status) => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
        label: 'Active',
      };
    case 'PLANNING':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#FBBF24] border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        label: 'Planning',
      };
    case 'COMPLETED':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-[#60A5FA] border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500',
        label: 'Completed',
      };
    case 'ON_HOLD':
      return {
        bg: 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
        dot: 'bg-slate-500',
        label: 'On Hold',
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
        dot: 'bg-slate-400',
        label: status || 'General',
      };
  }
};

const getRemainingDaysInfo = (deadlineStr, status) => {
  if (!deadlineStr || (status || '').toUpperCase() === 'COMPLETED') return null;
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    if (isNaN(deadline.getTime())) return null;

    const diffDays = Math.round((deadline - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)}d overdue`,
        className: 'text-rose-600 dark:text-[#F87171] bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Due today',
        className: 'text-amber-600 dark:text-[#FBBF24] bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      };
    }
    return {
      text: `${diffDays}d left`,
      className: 'text-sky-600 dark:text-[#60A5FA] bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
    };
  } catch {
    return null;
  }
};

const ProjectsView = ({ filter: propFilter, onFilterChange: propOnFilterChange }) => {
  const outletContext = useOutletContext() || {};
  const filter = propFilter || outletContext.projectFilter || 'all';
  const onFilterChange = propOnFilterChange || outletContext.setProjectFilter;
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const reloadProjects = useCallback(() => {
    setIsLoading(true);
    setError('');
    getMyProjects()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.projects)
          ? data.projects
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setProjects(list);
      })
      .catch((err) => {
        setProjects([]);
        setError(getFriendlyErrorMessage(err, 'project'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    getMyProjects()
      .then((data) => {
        if (isMounted) {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.projects)
            ? data.projects
            : Array.isArray(data?.data)
            ? data.data
            : [];
          setProjects(list);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProjects([]);
          setError(getFriendlyErrorMessage(err, 'project'));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProjectCreated = (created) => {
    const createdName = created?.name || created?.project?.name || 'Project';
    setSuccessNotice(`"${createdName}" was created successfully!`);
    reloadProjects();
    setTimeout(() => {
      setSuccessNotice('');
    }, 4500);
  };

  const counts = useMemo(() => {
    const all = projects.length;
    const active = projects.filter(
      (p) => (p.status || '').toUpperCase() === 'ACTIVE'
    ).length;
    const completed = projects.filter(
      (p) => (p.status || '').toUpperCase() === 'COMPLETED'
    ).length;
    return { all, active, completed };
  }, [projects]);

  const filterTabs = [
    { id: 'all', label: 'All Projects', count: counts.all },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = (project.status || '').toUpperCase();
      if (filter === 'active' && status !== 'ACTIVE') return false;
      if (filter === 'completed' && status !== 'COMPLETED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (project.name || '').toLowerCase();
        const desc = (project.description || '').toLowerCase();
        const pm = (
          project.projectManagerEmail ||
          project.projectManager?.email ||
          ''
        ).toLowerCase();
        const lead = (
          project.teamLeadEmail ||
          project.teamLead?.email ||
          ''
        ).toLowerCase();
        return (
          name.includes(q) ||
          desc.includes(q) ||
          pm.includes(q) ||
          lead.includes(q)
        );
      }
      return true;
    });
  }, [projects, filter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Manage all your projects in one place. Track progress, schedules, and leadership.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={reloadProjects}
            disabled={isLoading}
            title="Refresh projects"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#172033] border border-slate-200/90 dark:border-[#293548] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] flex items-center justify-center shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={isLoading ? 'animate-spin text-sky-600 dark:text-[#60A5FA]' : ''}
            />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer"
          >
            <FiPlus size={18} />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399] text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice('')}
            className="text-emerald-700 dark:text-[#34D399] hover:text-emerald-900 dark:hover:text-emerald-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={reloadProjects}
            className="text-xs font-semibold underline text-red-700 dark:text-[#F87171] hover:text-red-900 dark:hover:text-rose-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls Bar: Sub-filter tabs + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 dark:bg-[#172033]/90 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-[#293548] backdrop-blur-xs">
        {/* Sub-filter tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-[#1E293B]/80 rounded-xl">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange && onFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition flex items-center gap-1.5 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#1E3A5F] text-slate-900 dark:text-[#93C5FD] shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === tab.id
                    ? 'bg-sky-100 dark:bg-blue-900/60 text-sky-700 dark:text-[#93C5FD]'
                    : 'bg-slate-200/80 dark:bg-[#253247] text-slate-600 dark:text-[#CBD5E1]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
            <FiSearch size={15} />
          </span>
          <input
            type="text"
            placeholder="Search projects, PM, lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#CBD5E1] text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-[#172033] rounded-3xl p-6 border border-slate-200/80 dark:border-[#293548] animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1E293B]" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
                    <div className="h-2.5 w-16 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-100 dark:bg-[#1E293B] rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 dark:bg-[#1E293B] rounded-md" />
                <div className="h-3 w-4/5 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
              </div>
              <div className="h-14 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
              <div className="pt-2 border-t border-slate-100 dark:border-[#293548] space-y-2">
                <div className="h-3 w-1/2 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State: No Projects Created Yet */}
      {!isLoading && projects.length === 0 && (
        <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-[#293548] shadow-md shadow-slate-200/50 dark:shadow-none text-center max-w-2xl mx-auto my-6">
          <div className="w-20 h-20 rounded-3xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-5 shadow-xs">
            <FiFolder size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] mb-2">
            No Projects Yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed mb-6">
            Get started by adding your first project to organize issues, sprints,
            deadlines, and collaborate with your team.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer"
          >
            <FiPlus size={18} />
            <span>Create Your First Project</span>
          </button>
        </div>
      )}

      {/* Empty State: Search/Filter returned 0 results */}
      {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 border border-slate-200/80 dark:border-[#293548] text-center max-w-lg mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1E293B] text-slate-400 dark:text-[#64748B] mx-auto flex items-center justify-center mb-3">
            <FiSearch size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-[#F1F5F9] mb-1">
            No matching projects found
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-4">
            No projects matched your search query or filter. Try clearing or modifying your filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              if (onFilterChange) onFilterChange('all');
            }}
            className="text-xs font-semibold text-sky-600 dark:text-[#60A5FA] hover:text-sky-700 dark:hover:text-[#93C5FD] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredProjects.map((project, idx) => {
            const statusBadge = getStatusBadge(project.status);
            const remainingInfo = getRemainingDaysInfo(project.deadline, project.status);
            const pmEmail =
              project.projectManagerEmail ||
              project.projectManager?.email ||
              '';
            const leadEmail =
              project.teamLeadEmail ||
              project.teamLead?.email ||
              '';

            return (
              <div
                key={project.id || project._id || idx}
                className="bg-white dark:bg-[#172033] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-[#293548] shadow-xs hover:shadow-md dark:hover:border-[#3B4B63] transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Icon + Name + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <FiFolder size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] truncate tracking-tight"
                          title={project.name}
                        >
                          {project.name || 'Untitled Project'}
                        </h3>
                        {project.workspaceId && (
                          <span
                            className="text-[10px] font-mono text-slate-400 dark:text-[#64748B] block truncate"
                            title={`Workspace: ${project.workspaceId}`}
                          >
                            ws: {project.workspaceId.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg} shrink-0`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] line-clamp-3 mb-4 leading-relaxed min-h-[3rem]">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Dates Banner */}
                  <div className="p-3 bg-slate-50/90 dark:bg-[#1E293B]/80 rounded-2xl border border-slate-100 dark:border-[#293548] mb-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] block mb-0.5">
                          Start Date
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-[#F1F5F9] font-medium">
                          <FiCalendar size={13} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                          <span className="truncate">{formatDate(project.startDate)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] block mb-0.5">
                          Deadline
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-[#F1F5F9] font-medium">
                          <FiClock size={13} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                          <span className="truncate">{formatDate(project.deadline)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deadline urgency chip if applicable */}
                    {remainingInfo && (
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-[#293548] flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-[#94A3B8]">Timeline:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full border text-[10px] ${remainingInfo.className}`}
                        >
                          {remainingInfo.text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Leadership: PM & Lead */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#293548] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 dark:text-[#64748B] flex items-center gap-1">
                      <FiUser size={12} className="text-slate-400 dark:text-[#64748B]" /> PM:
                    </span>
                    <span
                      className="font-medium text-slate-700 dark:text-[#CBD5E1] truncate max-w-[170px]"
                      title={pmEmail || 'Not assigned'}
                    >
                      {pmEmail || (
                        <span className="text-slate-400 dark:text-[#64748B] italic font-normal">
                          Not assigned
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 dark:text-[#64748B] flex items-center gap-1">
                      <FiMail size={12} className="text-slate-400 dark:text-[#64748B]" /> Team Lead:
                    </span>
                    <span
                      className="font-medium text-slate-700 dark:text-[#CBD5E1] truncate max-w-[170px]"
                      title={leadEmail || 'Not assigned'}
                    >
                      {leadEmail || (
                        <span className="text-slate-400 dark:text-[#64748B] italic font-normal">
                          Not assigned
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectsView;
