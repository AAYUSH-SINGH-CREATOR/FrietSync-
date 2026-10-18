import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus, FiSearch, FiRefreshCw, FiFolder, FiAlertCircle, FiCheckCircle,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiActivity,
  FiCheckSquare, FiLayers, FiX,
} from 'react-icons/fi';
import { AiOutlineBug } from 'react-icons/ai';
import { getProjectIssues, getFriendlyErrorMessage } from '../services/issueApi';
import { getMyProjects, getProjectMembers } from '../../projects/services/projectApi';
import { getPriorityBadge, getStatusBadge } from '../utils/issueUtils';
import CreateIssueModal from './CreateIssueModal';
import IssueDetailsModal from './IssueDetailsModal';
import { AiOutlineExclamationCircle } from "react-icons/ai";


const PAGE_SIZE = 20;
const normalize = (value) => String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
const issueId = (issue) => issue.id || issue._id || issue.issueId;
const memberId = (member) => member.userId || member.id || member._id || member.user?.id || member.user?._id;
const memberName = (member) => member.name || member.fullName || member.user?.name || member.email || member.user?.email || '';
const personLabel = (issue) => issue.assigneeName || issue.assignedTo?.name || issue.assignedTo?.fullName || issue.assignee?.name || issue.assigneeEmail || issue.assignee?.email || issue.assignedTo?.email || '';
const isResolved = (status) => ['DONE', 'RESOLVED', 'CLOSED', 'COMPLETED'].includes(normalize(status));
const isInProgress = (status) => ['IN_PROGRESS', 'IN_REVIEW', 'ACTIVE'].includes(normalize(status));
const compactDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? String(date) : parsed.toLocaleDateString('en-GB');
};
const avatarColors = ['bg-pink-500', 'bg-blue-500', 'bg-orange-500', 'bg-violet-500', 'bg-emerald-500', 'bg-sky-500'];

const SummaryCard = ({ icon: Icon, label, value, hint, tone }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200/80 bg-white px-3.5 py-3 dark:border-[#343434] dark:bg-[#202020] sm:px-4">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon size={19} /></div>
    <div className="min-w-0">
      <p className="truncate text-xs text-slate-500 dark:text-[#b6b6b6]">{label}</p>
      <p className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">{value}</p>
      <p className="truncate text-xs text-slate-500 dark:text-[#a8a8a8]">{hint}</p>
    </div>
  </div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="relative min-w-[105px] flex-1 sm:flex-none">
    <span className="sr-only">Filter by {label.toLowerCase()}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-[34px] w-full cursor-pointer appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-sky-400 dark:border-[#343434] dark:bg-[#202020] dark:text-white dark:hover:border-[#555]">
      <option value="all">{label}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <FiChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#aaa]" />
  </label>
);

const IssuesView = () => {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState('');
  const [issues, setIssues] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('due-asc');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIssueCount, setTotalIssueCount] = useState(0);
  const [toastNotice, setToastNotice] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4500);
  }, []);

  useEffect(() => {
    if (isLoadingProjects) return undefined;
    let active = true;
    Promise.allSettled(projects.map(async (project) => {
      const id = project.id || project._id || project.projectId;
      if (!id) return [];
      return getProjectMembers(id);
    })).then((results) => {
      if (!active) return;
      const people = new Map();
      results.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value).forEach((member) => {
        const id = memberId(member);
        const name = memberName(member);
        if (name) people.set(String(id || name).toLowerCase(), { id: String(id || name), name, email: member.email || member.user?.email || '' });
      });
      setMembers([...people.values()]);
      const failed = results.find((result) => result.status === 'rejected');
      setMembersError(failed ? getFriendlyErrorMessage(failed.reason, 'project') : '');
    });
    return () => { active = false; };
  }, [projects, isLoadingProjects]);

  useEffect(() => {
    let active = true;
    getMyProjects().then((list) => { if (active) setProjects(Array.isArray(list) ? list : []); })
      .catch((err) => { if (active) { setProjects([]); setError(getFriendlyErrorMessage(err, 'project')); } })
      .finally(() => { if (active) setIsLoadingProjects(false); });
    return () => { active = false; };
  }, []);

  const projectMap = useMemo(() => new Map(projects.map((project) => [String(project.id || project._id || project.projectId), project.name || 'Project'])), [projects]);

  useEffect(() => {
    if (isLoadingProjects) return undefined;
    let active = true;
    const load = async () => {
      const targetProjects = projectFilter === 'all' ? projects : projects.filter((project) => String(project.id || project._id || project.projectId) === projectFilter);
      const results = await Promise.all(targetProjects.map(async (project) => {
        const pid = project.id || project._id || project.projectId;
        if (!pid) return { issues: [], members: [] };
        const [issueResult] = await Promise.allSettled([getProjectIssues(pid, { page, size: PAGE_SIZE })]);
          return {
          page: issueResult.status === 'fulfilled' ? issueResult.value : { items: [], totalElements: 0, totalPages: 1 },
            error: issueResult.status === 'rejected' ? issueResult.reason : null,
          projectId: pid,
          projectName: project.name || 'Project',
        };
      }));
      if (!active) return;
      setIssues(results.flatMap((item) => item.page.items.map((issue) => ({ ...issue, projectId: item.projectId, projectName: item.projectName }))));
      setTotalIssueCount(results.reduce((sum, item) => sum + item.page.totalElements, 0));
      setTotalPages(Math.max(1, ...results.map((item) => item.page.totalPages)));
      const issueFailure = results.find((item) => item.error);
      setError(issueFailure ? getFriendlyErrorMessage(issueFailure.error, 'issue') : '');
      setIsLoadingIssues(false);
    };
    load().catch((err) => {
      if (!active) return;
      setIssues([]);
      setError(getFriendlyErrorMessage(err, 'issue'));
      setIsLoadingIssues(false);
    });
    return () => { active = false; };
  }, [projects, isLoadingProjects, refreshTrigger, projectFilter, page]);

  const memberById = useMemo(() => new Map(members.map((member) => [String(member.id).toLowerCase(), member.name])), [members]);
  const displayAssignee = useCallback((issue) => {
    const direct = personLabel(issue);
    if (direct && !/^[0-9a-f-]{32,}$/i.test(direct)) return direct;
    const id = issue.assigneeId || issue.assigneeUserId || issue.assignedToId || issue.assignedTo?.id || issue.assignedTo?._id || issue.assignee?.id || issue.assignee?._id || direct;
    return (id && memberById.get(String(id).toLowerCase())) || '';
  }, [memberById]);

  const counts = useMemo(() => ({ total: issues.length, progress: issues.filter((i) => isInProgress(i.status)).length, open: issues.filter((i) => !isResolved(i.status)).length, resolved: issues.filter((i) => isResolved(i.status)).length }), [issues]);
  const statusOptions = useMemo(() => [...new Set(issues.map((i) => i.status || 'OPEN'))].map((status) => ({ value: normalize(status), label: String(status).replace(/[_-]/g, ' ') })), [issues]);
  const priorityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => ({ value: priority, label: priority[0] + priority.slice(1).toLowerCase() }));

  const filteredIssues = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = issues.filter((issue) => {
      if (projectFilter !== 'all' && String(issue.projectId) !== projectFilter) return false;
      if (statusFilter !== 'all' && normalize(issue.status) !== statusFilter) return false;
      if (priorityFilter !== 'all' && normalize(issue.priority) !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && (displayAssignee(issue).toLowerCase() !== assigneeFilter)) return false;
      return !query || [issue.title, issue.description, issue.projectName, displayAssignee(issue)].some((v) => String(v || '').toLowerCase().includes(query));
    });
    return filtered.sort((a, b) => {
      if (sortOrder === 'due-desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
      if (sortOrder === 'priority') return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(normalize(a.priority)) - ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(normalize(b.priority));
      return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
    });
  }, [issues, projectFilter, statusFilter, priorityFilter, assigneeFilter, searchQuery, sortOrder, displayAssignee]);
  const pageCount = totalPages;
  const pageIssues = filteredIssues;
  const refresh = () => { setIsLoadingIssues(true); setRefreshTrigger((current) => current + 1); };
  const changeProjectFilter = (value) => { setIsLoadingIssues(true); setPage(0); setProjectFilter(value); };
  const handleIssueCreated = (created) => { showToast('success', `“${created?.title || 'New issue'}” was created successfully.`); refresh(); };
  const start = totalIssueCount ? page * PAGE_SIZE + 1 : 0;
  const end = Math.min((page + 1) * PAGE_SIZE, totalIssueCount);

  return (
    <section className="min-h-[calc(100vh-7.5rem)] space-y-4 rounded-xl bg-[#f0f0f0] p-4 text-slate-900 dark:bg-[#292929] dark:text-white sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">Issues</h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-[#c0c0c0] sm:text-sm">Manage all your issues in one place. Prioritize, track, and resolve problems.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} disabled={isLoadingIssues} title="Refresh issues" className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#ddd] dark:hover:bg-[#333]"><FiRefreshCw size={15} className={isLoadingIssues ? 'animate-spin' : ''} /></button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="inline-flex h-[38px] items-center gap-2 rounded-md bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 sm:text-sm"><FiPlus size={16} />Create Issue</button>
        </div>
      </div>

      {toastNotice && <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="flex items-center gap-2"><FiCheckCircle />{toastNotice.message}</span><button type="button" onClick={() => setToastNotice(null)} aria-label="Dismiss"><FiX /></button></div>}
      {error && <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><span className="flex items-center gap-2"><FiAlertCircle />{error}</span><button type="button" onClick={refresh} className="font-semibold underline">Retry</button></div>}
      {membersError && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Some project members could not be loaded for assignee names: {membersError}</p>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard icon={FiFolder} label="Total issues" value={totalIssueCount} hint="Across selected projects" tone="bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" />
        <SummaryCard icon={FiActivity} label="In progress on this page" value={counts.progress} hint="Current page results" tone="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" />
        <SummaryCard icon={AiOutlineExclamationCircle} label="Open on this page" value={counts.open} hint="Current page results" tone="bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300" />
        <SummaryCard icon={FiCheckSquare} label="Resolved on this page" FiCirclevalue={counts.resolved} hint="Current page results" tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" />
      </div>

      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
        <div className="relative min-w-[190px] flex-1 xl:max-w-[250px]">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#aaa]" />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search issues..." className="h-[34px] w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 dark:border-[#343434] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#999]" />
        </div>
        <div className="w-full flex flex-wrap justify-between pr-20">
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} />
          <FilterSelect label="Project" value={projectFilter} onChange={changeProjectFilter} options={projects.map((project) => ({ value: String(project.id || project._id || project.projectId), label: project.name || 'Project' }))} />
          <FilterSelect label="Assignee" value={assigneeFilter} onChange={setAssigneeFilter} options={[...new Set(members.map((m) => m.name))].map((name) => ({ value: name.toLowerCase(), label: name }))} />
          <FilterSelect label="Sort by: Due date" value={sortOrder} onChange={setSortOrder} options={[{ value: 'due-asc', label: 'Due date: earliest' }, { value: 'due-desc', label: 'Due date: latest' }, { value: 'priority', label: 'Priority' }]} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#363636] dark:bg-[#242424]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead><tr className="h-[38px] bg-slate-100 text-xs font-semibold text-slate-800 dark:bg-[#202020] dark:text-[#eee]">
              <th className="w-10 px-3"><span className="sr-only">Select issues</span><input aria-label="Select issues" type="checkbox" disabled className="h-3.5 w-3.5 rounded accent-sky-500" /></th>
              <th className="px-2">Issue</th><th className="px-3">ID</th><th className="px-3">Project</th><th className="px-3">Status</th><th className="px-3">Priority</th><th className="px-3">Assignee</th><th className="px-3">Due date</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#343434]">
              {isLoadingIssues ? Array.from({ length: 5 }, (_, idx) => <tr key={idx} className="h-[43px] animate-pulse"><td colSpan="8" className="px-4"><div className="h-4 rounded bg-slate-100 dark:bg-[#333]" /></td></tr>) : pageIssues.map((issue, idx) => {
                const id = issueId(issue);
                const number = issue.issueNumber || (id ? String(id).slice(-6) : `#${idx + 1}`);
                const assignee = displayAssignee(issue);
                const avatarColor = avatarColors[(assignee.charCodeAt(0) || idx) % avatarColors.length];
                return <tr key={id || `${issue.title}-${idx}`} onClick={() => setSelectedIssueForDetails(issue)} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedIssueForDetails(issue); }} tabIndex={0} className="h-[43px] cursor-pointer text-xs transition hover:bg-slate-50 dark:hover:bg-[#2e2e2e]">
                  <td className="px-3"><input aria-label={`Select ${issue.title || 'issue'}`} type="checkbox" onClick={(event) => event.stopPropagation()} className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-500 dark:border-[#555]" /></td>
                  <td className="max-w-[250px] px-2"><span className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-900 dark:bg-[#303030] dark:text-white" title={issue.title}>{issue.title || 'Untitled issue'}</span></td>
                  <td className="px-3"><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700 dark:bg-[#303030] dark:text-[#ddd]">{String(number).startsWith('#') ? number : `#${number}`}</span></td>
                  <td className="px-3"><span className="inline-flex max-w-[150px] items-center gap-1 truncate rounded-md bg-slate-100 px-2 py-1 text-slate-700 dark:bg-[#303030] dark:text-[#ddd]"><FiLayers size={11} className="shrink-0" />{issue.projectName || projectMap.get(String(issue.projectId)) || issue.project?.name || '—'}</span></td>
                  <td className="px-3"><span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStatusBadge(issue.status)}`}>{String(issue.status || 'OPEN').replace(/[_-]/g, ' ')}</span></td>
                  <td className="px-3"><span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${getPriorityBadge(issue.priority)}`}>{String(issue.priority || 'MEDIUM').replace(/[_-]/g, ' ')}</span></td>
                  <td className="px-3">{assignee ? <span title={assignee} className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9px] font-semibold text-white ${avatarColor}`}>{assignee.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span> : <span className="text-slate-400 dark:text-[#888]">—</span>}</td>
                  <td className="whitespace-nowrap px-3 text-slate-700 dark:text-[#ddd]">{compactDate(issue.dueDate)}</td>
                </tr>;
              })}
              {!isLoadingIssues && pageIssues.length === 0 && <tr><td colSpan="8" className="px-4 py-12 text-center"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300"><AiOutlineBug size={24} /></div><p className="text-sm font-semibold">{issues.length ? 'No matching issues' : 'No issues yet'}</p><p className="mt-1 text-xs text-slate-500 dark:text-[#aaa]">{issues.length ? 'Try changing your search or filters.' : 'Create an issue to start tracking work across your projects.'}</p>{!issues.length && <button type="button" onClick={() => setIsCreateModalOpen(true)} className="mt-4 inline-flex h-[34px] items-center gap-2 rounded-md bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700"><FiPlus />Create Issue</button>}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5 text-xs text-slate-600 dark:border-[#363636] dark:text-[#bbb] sm:px-4">
          <span className="text-xs">{projectFilter === 'all' ? `Showing ${filteredIssues.length} issue on page ${page + 1}` : `Showing ${start}–${end} of ${totalIssueCount} issues`}{filteredIssues.length < issues.length ? ' (page filtered)' : ''}</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => { setIsLoadingIssues(true); setPage((current) => Math.max(0, current - 1)); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#ddd] dark:hover:bg-[#383838]"><FiChevronLeft size={14} /></button>
            {Array.from({ length: pageCount }, (_, idx) => idx).slice(Math.max(0, Math.min(page - 2, pageCount - 4)), Math.max(4, Math.min(page - 2, pageCount - 4)) + 4).map((value) => <button type="button" key={value} onClick={() => { setIsLoadingIssues(true); setPage(value); }} className={`flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs ${page === value ? 'bg-sky-500 font-semibold text-white' : 'hover:bg-slate-100 dark:hover:bg-[#383838]'}`}>{value + 1}</button>)}
            <button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => { setIsLoadingIssues(true); setPage((current) => Math.min(pageCount - 1, current + 1)); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#ddd] dark:hover:bg-[#383838]"><FiChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <CreateIssueModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} projects={projects} defaultProjectId={projectFilter !== 'all' ? projectFilter : projects[0]?.id || projects[0]?._id || ''} onIssueCreated={handleIssueCreated} />
      <IssueDetailsModal key={`${selectedIssueForDetails ? issueId(selectedIssueForDetails) : 'none'}-${!!selectedIssueForDetails}`} isOpen={!!selectedIssueForDetails} onClose={() => setSelectedIssueForDetails(null)} issueId={selectedIssueForDetails ? issueId(selectedIssueForDetails) : undefined} initialIssue={selectedIssueForDetails} projectName={selectedIssueForDetails?.projectName} onIssueUpdated={refresh} onIssueDeleted={() => { setSelectedIssueForDetails(null); refresh(); }} />
    </section>
  );
};

export default IssuesView;
