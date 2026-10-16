import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFolder,
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiPlus,
  FiChevronRight,
} from 'react-icons/fi';
import {
  getProjectById,
  getProjectMembers,
  removeProjectMember,
  getFriendlyErrorMessage,
} from '../services/projectApi';
import { getProjectIssues, normalizeIssuePage } from '../../issues/services/issueApi';
import CreateIssueModal from '../../issues/components/CreateIssueModal';
import IssueDetailsModal from '../../issues/components/IssueDetailsModal';
import { getPriorityBadge, getStatusBadge as getIssueStatusBadge } from '../../issues/utils/issueUtils';
import {
  formatDate,
  getStatusBadge,
  getRemainingDaysInfo,
  getRoleBadge,
  isUserAdmin,
} from '../utils/projectUtils';
import EditProjectModal from '../components/EditProjectModal';
import DeleteProjectModal from '../components/DeleteProjectModal';
import AddProjectMemberModal from '../components/AddProjectMemberModal';

const ProjectDetailsView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [projectIssues, setProjectIssues] = useState([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [issueTotal, setIssueTotal] = useState(0);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [projectError, setProjectError] = useState('');
  const [membersError, setMembersError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const [toastNotice, setToastNotice] = useState(null);

  const isAdmin = isUserAdmin();

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice(null);
    }, 4500);
  }, []);

  const reloadProjectDetails = useCallback(() => {
    if (!projectId) return;
    setIsLoadingProject(true);
    setProjectError('');

    getProjectById(projectId)
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        setProject(null);
        setProjectError(getFriendlyErrorMessage(err, 'project'));
      })
      .finally(() => {
        setIsLoadingProject(false);
      });
  }, [projectId]);

  const reloadProjectMembersList = useCallback(() => {
    if (!projectId) return;
    setIsLoadingMembers(true);
    setMembersError('');

    getProjectMembers(projectId)
      .then((data) => {
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setMembers([]);
        setMembersError(getFriendlyErrorMessage(err, 'project'));
      })
      .finally(() => {
        setIsLoadingMembers(false);
      });
  }, [projectId]);

  const reloadProjectIssues = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingIssues(true);
    try {
      const result = await getProjectIssues(projectId, { page: 0, size: 20 });
      const page = normalizeIssuePage(result);
      setProjectIssues(page.items.map((issue) => ({ ...issue, projectId, projectName: project?.name || '' })));
      setIssueTotal(page.totalElements);
    } catch (error) {
      showToast('error', getFriendlyErrorMessage(error, 'issue'));
      setProjectIssues([]);
      setIssueTotal(0);
    } finally { setIsLoadingIssues(false); }
  }, [projectId, project?.name, showToast]);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;

    getProjectById(projectId)
      .then((data) => {
        if (isMounted) setProject(data);
      })
      .catch((err) => {
        if (isMounted) {
          setProject(null);
          setProjectError(getFriendlyErrorMessage(err, 'project'));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingProject(false);
      });

    getProjectMembers(projectId)
      .then((data) => {
        if (isMounted) setMembers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (isMounted) {
          setMembers([]);
          setMembersError(getFriendlyErrorMessage(err, 'project'));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    getProjectIssues(projectId, { page: 0, size: 20 })
      .then((result) => { if (active) { const page = normalizeIssuePage(result); setProjectIssues(page.items.map((issue) => ({ ...issue, projectId, projectName: project?.name || '' }))); setIssueTotal(page.totalElements); } })
      .catch((error) => { if (active) { showToast('error', getFriendlyErrorMessage(error, 'issue')); setProjectIssues([]); setIssueTotal(0); } })
      .finally(() => { if (active) setIsLoadingIssues(false); });
    return () => { active = false; };
  }, [projectId, project?.name, showToast]);

  const handleProjectUpdated = (updated) => {
    const updatedName = updated?.name || project?.name || 'Project';
    showToast('success', `"${updatedName}" was updated successfully.`);
    reloadProjectDetails();
  };

  const handleProjectDeleted = () => {
    navigate('/dashboard/projects', { replace: true });
  };

  const handleMemberAdded = (added) => {
    const memberName = added?.name || added?.email || 'Member';
    showToast('success', `${memberName} was added to the project.`);
    reloadProjectMembersList();
  };

  const handleRemoveMember = async (member) => {
    const memberUserId = member.userId || member.id || member._id;
    const memberName = member.name || member.email || 'this member';

    if (!memberUserId) {
      showToast('error', 'Unable to remove member: missing member user ID.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this project?`)) {
      return;
    }

    setRemovingMemberId(memberUserId);
    try {
      await removeProjectMember(projectId, memberUserId);
      showToast('success', `"${memberName}" was removed from the project.`);
      reloadProjectMembersList();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const statusBadge = project ? getStatusBadge(project.status) : null;
  const remainingInfo = project ? getRemainingDaysInfo(project.deadline, project.status) : null;
  const pmEmail = project?.projectManagerEmail || project?.projectManager?.email || '';
  const leadEmail = project?.teamLeadEmail || project?.teamLead?.email || '';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/projects')}
            title="Back to Projects"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#172033] border border-slate-200/90 dark:border-[#293548] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] flex items-center justify-center shadow-xs transition cursor-pointer"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">
              <Link
                to="/dashboard/projects"
                className="hover:text-sky-600 dark:hover:text-[#60A5FA] transition"
              >
                Projects
              </Link>
              <span>/</span>
              <span className="text-slate-600 dark:text-[#CBD5E1] truncate max-w-[200px] sm:max-w-xs">
                {isLoadingProject ? 'Loading...' : project?.name || 'Details'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight truncate mt-0.5">
              {isLoadingProject ? 'Project Details' : project?.name || 'Project Details'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              reloadProjectDetails();
              reloadProjectMembersList();
            }}
            disabled={isLoadingProject || isLoadingMembers}
            title="Refresh details"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#172033] border border-slate-200/90 dark:border-[#293548] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] flex items-center justify-center shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={isLoadingProject || isLoadingMembers ? 'animate-spin text-sky-600 dark:text-[#60A5FA]' : ''}
            />
          </button>

          {/* Admin-Only Edit & Delete Actions */}
          {isAdmin && project && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#172033] border border-slate-200/90 dark:border-[#293548] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] hover:text-sky-600 dark:hover:text-[#60A5FA] text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
              >
                <FiEdit2 size={16} />
                <span>Edit Project</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#172033] border border-slate-200/90 dark:border-[#293548] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-[#F87171] hover:border-rose-200 dark:hover:border-rose-800/60 text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
              >
                <FiTrash2 size={16} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            toastNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
              : 'bg-red-50 dark:bg-rose-950/40 border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastNotice.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
            ) : (
              <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
            )}
            <span className="font-medium">{toastNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-xs font-semibold underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Skeleton for Project Overview */}
      {isLoadingProject && (
        <div className="bg-white dark:bg-[#172033] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-[#293548] animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#1E293B]" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
              <div className="h-4 w-32 bg-slate-100 dark:bg-[#1E293B] rounded-md" />
            </div>
          </div>
          <div className="h-16 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
        </div>
      )}

      {/* Project Error Alert */}
      {!isLoadingProject && projectError && (
        <div className="p-4 rounded-3xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiAlertCircle size={22} className="shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-sm">Failed to load project details</p>
              <p className="text-xs mt-0.5">{projectError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reloadProjectDetails}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#172033] border border-red-200 dark:border-rose-800 text-xs font-semibold text-red-700 dark:text-[#F87171] hover:bg-red-50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Project Overview Card */}
      {!isLoadingProject && project && (
        <div className="bg-white dark:bg-[#172033] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-[#293548] shadow-xs space-y-6">
          {/* Header Row: Folder Icon + Title + Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0 shadow-2xs">
                <FiFolder size={28} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                    {project.name || 'Untitled Project'}
                  </h2>
                  {statusBadge && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg} shrink-0`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  )}
                </div>
                {/* {project.workspaceId && (
                  <span
                    className="text-xs font-mono text-slate-400 dark:text-[#64748B] block mt-1"
                    title={`Workspace: ${project.workspaceId}`}
                  >
                    Workspace: {project.workspaceId}
                  </span>
                )} */}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748B] mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-[#1E293B]/60 p-4 rounded-2xl border border-slate-100 dark:border-[#293548]">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          {/* Timeline & Leadership Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timeline Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#1E293B]/60 border border-slate-100 dark:border-[#293548] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748B] flex items-center gap-1.5">
                <FiCalendar size={13} />
                <span>Roadmap Timeline</span>
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-xs text-slate-400 dark:text-[#64748B] block mb-0.5">
                    Start Date
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-[#F1F5F9] font-semibold">
                    <FiCalendar size={14} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                    <span className="truncate">{formatDate(project.startDate)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 dark:text-[#64748B] block mb-0.5">
                    Deadline
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-[#F1F5F9] font-semibold">
                    <FiClock size={14} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                    <span className="truncate">{formatDate(project.deadline)}</span>
                  </div>
                </div>
              </div>
              {remainingInfo && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-[#293548] flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Remaining time:</span>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-full border text-[11px] ${remainingInfo.className}`}
                  >
                    {remainingInfo.text}
                  </span>
                </div>
              )}
            </div>

            {/* Leadership Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#1E293B]/60 border border-slate-100 dark:border-[#293548] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748B] flex items-center gap-1.5">
                <FiUser size={13} />
                <span>Project Leadership</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                    <FiUser size={13} className="text-slate-400 dark:text-[#64748B]" />
                    <span>Project Manager:</span>
                  </span>
                  <span
                    className="font-semibold text-slate-800 dark:text-[#CBD5E1] truncate max-w-[200px]"
                    title={pmEmail || 'Not assigned'}
                  >
                    {pmEmail || <span className="text-slate-400 dark:text-[#64748B] italic font-normal">Not assigned</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                    <FiMail size={13} className="text-slate-400 dark:text-[#64748B]" />
                    <span>Team Lead:</span>
                  </span>
                  <span
                    className="font-semibold text-slate-800 dark:text-[#CBD5E1] truncate max-w-[200px]"
                    title={leadEmail || 'Not assigned'}
                  >
                    {leadEmail || <span className="text-slate-400 dark:text-[#64748B] italic font-normal">Not assigned</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Issues Section */}
      {!isLoadingProject && project && (
        <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-[#293548] dark:bg-[#172033] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-[#293548]">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9]">Project issues <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]">{issueTotal}</span></h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">Issues created for {project.name || 'this project'}.</p>
            </div>
            <button type="button" onClick={() => setIsCreateIssueOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-3.5 text-xs font-semibold text-white transition hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500"><FiPlus size={15} />Create Issue</button>
          </div>
          {isLoadingIssues ? <div className="space-y-2">{[0, 1, 2].map((item) => <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-[#1E293B]" />)}</div> : projectIssues.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead><tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]"><th className="px-3 py-2">Issue</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Due date</th><th className="px-3 py-2" /></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#293548]">{projectIssues.map((issue, index) => <tr key={issue.id || issue._id || issue.issueId || index} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1E293B]/70" onClick={() => setSelectedIssue(issue)}>
                  <td className="px-3 py-3"><span className="font-mono text-[10px] text-slate-400">{issue.issueNumber ? `#${issue.issueNumber}` : ''}</span><p className="mt-0.5 font-semibold text-slate-800 dark:text-[#F1F5F9]">{issue.title || 'Untitled issue'}</p></td>
                  <td className="px-3 py-3"><span className={`rounded-md border px-2 py-1 text-[11px] ${getIssueStatusBadge(issue.status)}`}>{String(issue.status || 'OPEN').replace(/[_-]/g, ' ')}</span></td>
                  <td className="px-3 py-3"><span className={`rounded-md border px-2 py-1 text-[11px] ${getPriorityBadge(issue.priority)}`}>{String(issue.priority || 'MEDIUM').replace(/[_-]/g, ' ')}</span></td>
                  <td className="px-3 py-3 text-slate-600 dark:text-[#CBD5E1]">{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-3 text-slate-400"><FiChevronRight /></td>
                </tr>)}</tbody>
              </table>
              {issueTotal > projectIssues.length && <p className="px-3 pt-3 text-xs text-slate-500 dark:text-[#94A3B8]">Showing the first {projectIssues.length} of {issueTotal} issues. View the full list from Issues.</p>}
            </div>
          ) : <div className="rounded-xl bg-slate-50 px-4 py-8 text-center dark:bg-[#1E293B]/60"><p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">No issues in this project yet</p><p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">Create the first issue to track work here.</p><button type="button" onClick={() => setIsCreateIssueOpen(true)} className="mt-3 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-[#60A5FA]">Create Issue</button></div>}
        </section>
      )}

      {/* Project Members Section */}
      <div className="bg-white dark:bg-[#172033] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-[#293548] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#293548]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-[#818CF8] flex items-center justify-center shrink-0 shadow-2xs">
              <FiUsers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                  Project Members
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] text-xs font-bold">
                  {members.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                Collaborators assigned to work on this project.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddMemberModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer self-start sm:self-auto"
          >
            <FiUserPlus size={16} />
            <span>Add Member</span>
          </button>
        </div>

        {/* Members Error Notice */}
        {membersError && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiAlertCircle size={17} className="shrink-0" />
              <span>{membersError}</span>
            </div>
            <button
              type="button"
              onClick={reloadProjectMembersList}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Members Skeleton */}
        {isLoadingMembers && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-100 dark:border-[#293548] animate-pulse flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#334155]" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-[#334155] rounded" />
                    <div className="h-3 w-48 bg-slate-200 dark:bg-[#334155] rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-[#334155] rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty Members State */}
        {!isLoadingMembers && members.length === 0 && !membersError && (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#1E293B] text-slate-400 dark:text-[#64748B] mx-auto flex items-center justify-center mb-3">
              <FiUsers size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
              No members assigned yet
            </p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 max-w-sm mx-auto mb-4">
              Collaborators added to this project will be able to track tasks, sprints, and communicate in real-time.
            </p>
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <FiUserPlus size={14} />
              <span>Add First Member</span>
            </button>
          </div>
        )}

        {/* Members Table / List */}
        {!isLoadingMembers && members.length > 0 && (
          <div className="space-y-2.5">
            {members.map((member, idx) => {
              const memberUserId = member.userId || member.id || member._id;
              const name = member.name || member.email?.split('@')[0] || 'Member';
              const email = member.email || '';
              const role = member.role || 'CONTRIBUTOR';
              const roleBadgeClass = getRoleBadge(role);
              const isRemoving = removingMemberId === memberUserId;

              return (
                <div
                  key={memberUserId || email || idx}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1E293B]/60 border border-slate-100 dark:border-[#293548] hover:border-slate-200 dark:hover:border-[#3B4B63] transition gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {name ? name.slice(0, 2).toUpperCase() : 'MB'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] truncate">
                          {name}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${roleBadgeClass}`}
                        >
                          {role}
                        </span>
                      </div>
                      {email && (
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Member Actions */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => handleRemoveMember(member)}
                      title={`Remove ${name} from project`}
                      aria-label={`Remove ${name} from project`}
                      className="p-2 rounded-xl text-slate-400 dark:text-[#64748B] hover:text-rose-600 dark:hover:text-[#F87171] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {isAdmin && project && isEditModalOpen && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
      {isAdmin && project && isDeleteModalOpen && (
        <DeleteProjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          project={project}
          onProjectDeleted={handleProjectDeleted}
        />
      )}

      {isAddMemberModalOpen && (
        <AddProjectMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          projectId={projectId}
          projectName={project?.name || 'Project'}
          existingMembers={members}
          onMemberAdded={handleMemberAdded}
        />
      )}
      <CreateIssueModal isOpen={isCreateIssueOpen} onClose={() => setIsCreateIssueOpen(false)} projects={project ? [project] : []} defaultProjectId={projectId} onIssueCreated={(created) => { showToast('success', `“${created?.title || 'Issue'}” was created.`); reloadProjectIssues(); }} />
      <IssueDetailsModal key={`${selectedIssue?.id || selectedIssue?._id || selectedIssue?.issueId || 'none'}-${!!selectedIssue}`} isOpen={!!selectedIssue} onClose={() => setSelectedIssue(null)} issueId={selectedIssue?.id || selectedIssue?._id || selectedIssue?.issueId} initialIssue={selectedIssue} projectName={project?.name || ''} onIssueUpdated={reloadProjectIssues} onIssueDeleted={() => { setSelectedIssue(null); reloadProjectIssues(); }} />
    </div>
  );
};

export default ProjectDetailsView;
