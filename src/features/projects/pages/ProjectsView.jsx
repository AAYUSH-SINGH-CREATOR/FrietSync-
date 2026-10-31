import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FiFolder,
  FiPlus,
  FiSearch,
  FiUsers,
  FiCheckSquare,
  FiCalendar,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiActivity,
} from 'react-icons/fi';
import { getMyProjects, getProjectMembers, getFriendlyErrorMessage } from '../services/projectApi';
import { getProjectIssues } from '../../issues/services/issueApi';
import CreateProjectModal from '../components/CreateProjectModal';
import EmptyState from '../../../components/ui/EmptyState';
import esproject from '../../../assets/esproject.png';
import { canCreateProject, formatDate, getProjectProgress } from '../utils/projectUtils';
const ProjectsView = ({ filter: propFilter, onFilterChange: propOnFilterChange }) => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const canCreateProjectButton = outletContext.isLoadingUserProfile === false && canCreateProject(outletContext.currentUserProfile);
  const filter = propFilter || outletContext.projectFilter || 'all';
  const onFilterChange = propOnFilterChange || outletContext.setProjectFilter;
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('recent');
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
    Promise.all(projects.map(async (project) => {
      const projectId = project.id || project._id || project.projectId;
      if (!projectId) return null;
      const [membersResult, issuesResult] = await Promise.allSettled([
        getProjectMembers(projectId),
        getProjectIssues(projectId, { page: 0, size: 1 }),
      ]);
      const members = membersResult.status === 'fulfilled' ? membersResult.value : [];
      const issues = issuesResult.status === 'fulfilled' ? issuesResult.value : null;
      return {
        projectId: String(projectId),
        memberCount: Array.isArray(members) ? members.length : 0,
        issueCount: issues?.totalElements ?? issues?.total ?? 0,
      };
    })).then((stats) => {
      if (!isMounted) return;
      setProjectStats(Object.fromEntries(stats.filter(Boolean).map(({ projectId, ...counts }) => [projectId, counts])));
    });
    return () => { isMounted = false; };
  }, [projects]);

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
    }).sort((a, b) => {
      if (sortOrder === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortOrder === 'deadline') return new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31');
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }, [projects, filter, searchQuery, sortOrder]);

  if (!isLoading && !error && filteredProjects.length === 0) {
    return (
      <>
        <div className="px-3 sm:px-6 lg:px-8">
          <EmptyState
            title="Projects"
            subtitle={projects.length === 0
              ? "No projects yet. Create one to organize your team's work."
              : 'No projects match your current search or filters.'}
            illustration={esproject}
            illustrationAlt="No projects yet"
            onCreateProject={() => setIsCreateModalOpen(true)}
            actionButton={projects.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onFilterChange?.('all');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                <FiRefreshCw size={15} /> Show all projects
              </button>
            ) : null}
          />
        </div>
        <CreateProjectModal
          isOpen={canCreateProjectButton && isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onProjectCreated={handleProjectCreated}
        />
      </>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 px-3 sm:px-6 lg:px-8">
      {}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#b3b3b3] mt-1">
            Manage all your projects in one place. Track progress, schedules, and leadership.
          </p>
        </div>

        {}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={reloadProjects}
            disabled={isLoading}
            title="Refresh projects"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#1d1d1d] border border-slate-200/90 dark:border-[#303030] hover:bg-slate-50 dark:hover:bg-[#242424] text-slate-600 dark:text-[#e0e0e0] flex items-center justify-center shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={isLoading ? 'animate-spin text-sky-600 dark:text-[#60A5FA]' : ''}
            />
          </button>
          {canCreateProjectButton && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer"
            >
              <FiPlus size={18} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total projects', value: counts.all, icon: FiFolder, tint: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' },
          { label: 'Active projects', value: counts.active, icon: FiActivity, tint: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' },
          { label: 'Completed projects', value: counts.completed, icon: FiCheckCircle, tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
        ].map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}><Icon size={19} /></span>
            <div><p className="text-xs text-slate-500 dark:text-[#94A3B8]">{label}</p><p className="text-lg font-semibold leading-6 text-slate-900 dark:text-[#F1F5F9]">{value}</p></div>
          </div>
        ))}
      </div>

      {}
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

      {}
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

      {}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 dark:bg-[#1d1d1d]/90 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-[#303030] backdrop-blur-xs">
        {}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-[#242424]/80 rounded-xl">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange && onFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition flex items-center gap-1.5 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#302477] text-slate-900 dark:text-[#d7d0ff] shadow-xs'
                  : 'text-slate-600 dark:text-[#b3b3b3] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === tab.id
                    ? 'bg-sky-100 dark:bg-blue-900/60 text-sky-700 dark:text-[#d7d0ff]'
                    : 'bg-slate-200/80 dark:bg-[#303030] text-slate-600 dark:text-[#e0e0e0]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative min-w-[220px] sm:w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
            <FiSearch size={15} />
          </span>
          <input
            type="text"
            placeholder="Search projects "
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full pl-9 pr-3.5 bg-white dark:bg-[#242424] border border-slate-200 dark:border-[#3a3a3a] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#858585] focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-[#858585] hover:text-slate-600 dark:hover:text-[#e0e0e0] text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
        <label className="relative inline-flex h-9 -translate-y-0.5 items-center">
          <span className="sr-only">Sort projects</span>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="h-full w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-[#3a3a3a] dark:bg-[#242424] dark:text-[#F1F5F9] dark:hover:border-[#555] dark:focus:border-[#60A5FA] dark:focus:ring-blue-900/30 cursor-pointer">
            <option value="recent">Sort: Recent</option><option value="name">Sort: Name</option><option value="deadline">Sort: Deadline</option>
          </select><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-[14px] text-slate-400 dark:text-[#858585]">⌄</span>
        </label>
        </div>
      </div>

      {}
      {isLoading && (
        <div
          className="grid gap-5 sm:gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 300px))' }}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-[#1d1d1d] rounded-3xl p-6 border border-slate-200/80 dark:border-[#303030] animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#242424]" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-slate-100 dark:bg-[#242424] rounded-md" />
                    <div className="h-2.5 w-16 bg-slate-100 dark:bg-[#242424] rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-100 dark:bg-[#242424] rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 dark:bg-[#242424] rounded-md" />
                <div className="h-3 w-4/5 bg-slate-100 dark:bg-[#242424] rounded-md" />
              </div>
              <div className="h-14 bg-slate-50 dark:bg-[#242424]/60 rounded-2xl" />
              <div className="pt-2 border-t border-slate-100 dark:border-[#303030] space-y-2">
                <div className="h-3 w-1/2 bg-slate-100 dark:bg-[#242424] rounded-md" />
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-[#242424] rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {}
      {!isLoading && filteredProjects.length > 0 && (
        <div
          className="grid gap-5 sm:gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 300px))' }}
        >
          {filteredProjects.map((project, idx) => {
            const projectId = project.id || project._id || project.projectId;
            const stats = projectStats[String(projectId)] || {};
            const memberCount = stats.memberCount ?? project.memberCount ?? project.members?.length ?? project.teamMembers?.length ?? '—';
            const issueCount = stats.issueCount ?? project.issueCount ?? project.totalIssues ?? project.issues?.length ?? '—';
            const progress = getProjectProgress(project);
            const description = String(project.description || 'No description provided.');
            const cardDescription = description.length > 55 ? `${description.slice(0, 55).trimEnd()}...` : description;

            const handleCardClick = () => {
              if (projectId) {
                navigate(`/dashboard/projects/${projectId}`);
              }
            };

            return (
              <div
                key={projectId || idx}
                role="button"
                tabIndex={0}
                onClick={handleCardClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                className="flex h-[208px] w-full max-w-[320px] flex-col justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-xs transition-all duration-200 group cursor-pointer hover:border-sky-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:hover:border-sky-500/50"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-100 text-purple-700 transition-transform group-hover:scale-105 dark:bg-purple-950/70 dark:text-purple-300 shadow-2xs">
                      {project.profilePictureUrl ? <img src={project.profilePictureUrl} alt={`${project.name || 'Project'} image`} className="h-full w-full object-cover" /> : <FiFolder size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-sans text-base font-bold text-slate-900 dark:text-white" title={project.name}>
                        {project.name || 'Unnamed project'}
                      </h3>
                      <p className="mt-1 font-sans text-xs font-normal text-slate-500 dark:text-[#94A3B8] line-clamp-2 leading-relaxed" title={description}>
                        {cardDescription}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 my-2">
                  {progress === null ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Progress unavailable</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-500 dark:text-[#94A3B8]">Progress</span>
                        <span className="text-sky-600 dark:text-sky-400">{progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#323236]" role="progressbar" aria-label={`${project.name || 'Project'} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                        <div className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#2a2a2e] text-xs font-medium text-slate-600 dark:text-[#CBD5E1]">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-[#222226] px-2 py-1 rounded-lg" title="Project members">
                    <FiUsers size={14} className="text-slate-400" />
                    <span>{memberCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-[#222226] px-2 py-1 rounded-lg" title="Project issues">
                    <FiCheckSquare size={14} className="text-slate-400" />
                    <span>{issueCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-[#222226] px-2.5 py-1 rounded-lg whitespace-nowrap" title="Project deadline">
                    <FiCalendar size={14} className="text-slate-400" />
                    <span>{project.deadline ? formatDate(project.deadline) : '—'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      <CreateProjectModal
        isOpen={canCreateProjectButton && isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectsView;
