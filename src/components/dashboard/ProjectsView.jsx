import { useMemo, useState } from 'react';
import {
  FiCalendar,
  FiClock,
  FiFolder,
  FiMail,
  FiPlus,
  FiSearch,
  FiUser,
} from 'react-icons/fi';
import CreateProjectModal from './CreateProjectModal';

const INITIAL_PROJECTS = [
  {
    id: 'project-1',
    name: 'Customer Portal',
    description: 'A self-service portal for customers to manage their accounts and requests.',
    workspaceId: 'workspace-customer',
    status: 'ACTIVE',
    startDate: '2026-09-01',
    deadline: '2026-12-15',
    projectManagerEmail: 'alex@example.com',
    teamLeadEmail: 'sam@example.com',
  }
];

const STATUS_STYLES = {
  ACTIVE: {
    label: 'Active',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  PLANNING: {
    label: 'Planning',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  ON_HOLD: {
    label: 'On Hold',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
  },
};

const formatDate = (value) => {
  if (!value) return 'Not set';

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDeadlineInfo = (deadline, status) => {
  if (!deadline || status === 'COMPLETED') return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${deadline.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return null;

  const days = Math.round((dueDate - today) / 86400000);

  if (days < 0) {
    return {
      label: `${Math.abs(days)}d overdue`,
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }

  if (days === 0) {
    return {
      label: 'Due today',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: `${days}d left`,
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  };
};

const getStatus = (status) => STATUS_STYLES[status] || {
  label: status || 'General',
  badge: 'border-slate-200 bg-slate-100 text-slate-700',
  dot: 'bg-slate-400',
};

const ProjectCard = ({ project }) => {
  const status = getStatus(project.status);
  const deadlineInfo = getDeadlineInfo(project.deadline, project.status);

  return (
    <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition group-hover:scale-105">
              <FiFolder size={20} />
            </div>
            <div className="min-w-0">
              <h2
                title={project.name}
                className="truncate text-base font-bold tracking-tight text-slate-900"
              >
                {project.name || 'Untitled Project'}
              </h2>
              {project.workspaceId && (
                <p title={project.workspaceId} className="truncate font-mono text-[10px] text-slate-400">
                  ws: {project.workspaceId}
                </p>
              )}
            </div>
          </div>

          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <p className="mb-4 min-h-12 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {project.description || 'No description provided.'}
        </p>

        <div className="mb-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/90 p-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Start date
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <FiCalendar size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">{formatDate(project.startDate)}</span>
              </span>
            </div>
            <div className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Deadline
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <FiClock size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">{formatDate(project.deadline)}</span>
              </span>
            </div>
          </div>

          {deadlineInfo && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-[11px]">
              <span className="text-slate-500">Timeline</span>
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${deadlineInfo.className}`}>
                {deadlineInfo.label}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex shrink-0 items-center gap-1.5 text-slate-400">
            <FiUser size={12} /> Project Manager
          </span>
          <span className="max-w-[60%] truncate font-medium text-slate-700" title={project.projectManagerEmail || 'Not assigned'}>
            {project.projectManagerEmail || <span className="italic font-normal text-slate-400">Not assigned</span>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex shrink-0 items-center gap-1.5 text-slate-400">
            <FiMail size={12} /> Team Lead
          </span>
          <span className="max-w-[60%] truncate font-medium text-slate-700" title={project.teamLeadEmail || 'Not assigned'}>
            {project.teamLeadEmail || <span className="italic font-normal text-slate-400">Not assigned</span>}
          </span>
        </div>
      </div>
    </article>
  );
};

const ProjectsView = ({ filter = 'all', onFilterChange }) => {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(filter);

  const selectedFilter = onFilterChange ? filter : activeFilter;

  const counts = useMemo(() => ({
    all: projects.length,
    active: projects.filter((project) => project.status === 'ACTIVE').length,
    completed: projects.filter((project) => project.status === 'COMPLETED').length,
  }), [projects]);

  const filterTabs = [
    { id: 'all', label: 'All Projects', count: counts.all },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  const changeFilter = (nextFilter) => {
    setActiveFilter(nextFilter);
    onFilterChange?.(nextFilter);
  };

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      if (selectedFilter === 'active' && project.status !== 'ACTIVE') return false;
      if (selectedFilter === 'completed' && project.status !== 'COMPLETED') return false;
      if (!query) return true;

      return [
        project.name,
        project.description,
        project.projectManagerEmail,
        project.teamLeadEmail,
        project.workspaceId,
      ].some((value) => (value || '').toLowerCase().includes(query));
    });
  }, [projects, searchQuery, selectedFilter]);

  const handleProjectCreated = (project) => {
    setProjects((current) => [project, ...current]);
    changeFilter('all');
  };

  const resetFilters = () => {
    setSearchQuery('');
    changeFilter('all');
  };

  return (
    <main className="animate-fadeIn space-y-6 pb-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage projects, track schedules, and view team ownership.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 active:bg-sky-800 md:self-auto"
        >
          <FiPlus size={18} />
          Create Project
        </button>
      </header>

      <section className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-2 sm:flex-row sm:items-center sm:p-2.5">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeFilter(tab.id)}
              aria-pressed={selectedFilter === tab.id}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                selectedFilter === tab.id
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-200/80 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-0 sm:w-72">
          <FiSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects, PM, lead..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </section>

      {projects.length === 0 ? (
        <section className="mx-auto my-6 max-w-2xl rounded-3xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
            <FiFolder size={30} />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">No Projects Yet</h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-500">
            Create your first project to keep its dates, status, and team contacts together.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <FiPlus size={17} /> Create Your First Project
          </button>
        </section>
      ) : filteredProjects.length === 0 ? (
        <section className="mx-auto my-6 max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FiSearch size={22} />
          </div>
          <h2 className="mb-1 font-bold text-slate-800">No matching projects</h2>
          <p className="mb-4 text-sm text-slate-500">
            Try another search term or reset the filters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Reset filters
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id || project._id} project={project} />
          ))}
        </section>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </main>
  );
};

export default ProjectsView;
