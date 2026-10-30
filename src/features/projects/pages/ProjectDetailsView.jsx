import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FiArrowLeft,
  FiFolder,
  FiRepeat,
  FiAlertTriangle,
  FiBarChart2,
  FiArrowRight,
  FiX,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiCheckCircle,
  FiCheck,
  FiAlertCircle,
  FiUsers,
  FiUserPlus,
  FiChevronRight,
  FiDownload,
  FiPackage,
  FiTag,
  FiUploadCloud,
  FiExternalLink,
  FiGithub,
} from 'react-icons/fi';
import {
  getProjectById,
  getProjectMembers,
  removeProjectMember,
  getProjectMilestones,
  getProjectSummary,
  getProjectSummaryPdf,
  getProjectReleases,
  uploadReleaseFile,
  unlinkProjectRepository,
  getFriendlyErrorMessage,
} from '../services/projectApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import { getProjectIssues, normalizeIssuePage, getIssueHistory } from '../../issues/services/issueApi';
import {
  getProjectPolls,
  getPollDetails,
  mergePollUpdateEvent,
  subscribeToPollResults,
  voteInPoll,
} from '../../polls/services/pollApi';
import { formatDate, formatProjectRoleLabel, getProjectProgress, isUserAdmin, getRoleBadge } from '../utils/projectUtils';
import { getPriorityBadge, getStatusBadge as getIssueStatusBadge } from '../../issues/utils/issueUtils';
import EditProjectModal from '../components/EditProjectModal';
import DeleteProjectModal from '../components/DeleteProjectModal';
import AddProjectMemberModal from '../components/AddProjectMemberModal';
import MilestoneModal from '../components/MilestoneModal';
import DeleteMilestoneModal from '../components/DeleteMilestoneModal';
import ReleaseModal from '../components/ReleaseModal';
import DeleteReleaseModal from '../components/DeleteReleaseModal';
import AttachReleaseIssuesModal from '../components/AttachReleaseIssuesModal';
import LinkRepositoryModal from '../components/LinkRepositoryModal';
import ProjectContributionsSection from '../components/ProjectContributionsSection';
import ProjectSummaryModal from '../components/ProjectSummaryModal';
import ProjectMembersModal from '../components/ProjectMembersModal';
import ProjectTimelineModal from '../components/ProjectTimelineModal';
import ProjectItemsModal from '../components/ProjectItemsModal';
import CreateIssueModal from '../../issues/components/CreateIssueModal';
import IssueDetailsModal from '../../issues/components/IssueDetailsModal';
import MeetingModal from '../../calendar/components/MeetingModal';
import CreateEditSprintModal from '../../sprints/components/CreateEditSprintModal';
import { ProjectPollsSection } from '../../polls/components';
import CreatePollModal from '../../polls/components/CreatePollModal';

const AVATAR_COLORS = ['#86198f', '#0369a1', '#15803d', '#6b21a8', '#b45309', '#be123c'];

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
  const hash = [...(name || 'User')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const formatMilestoneDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isMilestoneCompleted = (milestone) => {
  const status = String(milestone?.status || '').toUpperCase().replace(/[\s-]+/g, '_');
  return milestone?.completed === true || String(milestone?.completed).toLowerCase() === 'true' ||
    ['COMPLETED', 'RESOLVED'].includes(status);
};

const getMilestoneStatusInfo = (status, completed) => {
  if (isMilestoneCompleted({ status, completed })) {
    return {
      label: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      dotClass: 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60',
    };
  }
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['ON_TRACK'].includes(norm)) {
    return {
      label: 'On track',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      dotClass: 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60',
    };
  }
  if (['IN_PROGRESS', 'ACTIVE'].includes(norm)) {
    return {
      label: 'In progress',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
      dotClass: 'bg-sky-500 ring-4 ring-sky-100 dark:ring-sky-950/60',
    };
  }
  return {
    label: 'Upcoming',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/50',
    dotClass: 'bg-purple-500 ring-4 ring-purple-100 dark:ring-purple-950/60',
  };
};

const getSprintStatusBadge = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (norm === 'COMPLETED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400';
  }
  if (norm === 'ACTIVE') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-400';
  }
  return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-400';
};

const ProjectDetailsView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { currentUserProfile } = outletContext;

  const currentUserId =
    currentUserProfile?.id ||
    currentUserProfile?._id ||
    currentUserProfile?.userId ||
    currentUserProfile?.user?.id;
  const currentUserEmail = String(
    currentUserProfile?.email || currentUserProfile?.user?.email || ''
  )
    .toLowerCase()
    .trim();

  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueTotalCount, setIssueTotalCount] = useState(0);
  const [sprints, setSprints] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [milestoneLoadError, setMilestoneLoadError] = useState('');
  const [releases, setReleases] = useState([]);
  const [polls, setPolls] = useState([]);
  const pollSubscriptionKey = useMemo(
    () => polls.map((poll) => poll.id || poll._id || poll.pollId).filter(Boolean).map(String).sort().join(','),
    [polls]
  );
  const [activities, setActivities] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [viewingAllPolls, setViewingAllPolls] = useState(false);
  const [isAllSprintsOpen, setIsAllSprintsOpen] = useState(false);
  const [isAllIssuesOpen, setIsAllIssuesOpen] = useState(false);
  const [openPollId, setOpenPollId] = useState(null);
  const [isOpenPollLoading, setIsOpenPollLoading] = useState(false);
  const [detailPanel, setDetailPanel] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [uploadingReleaseId, setUploadingReleaseId] = useState(null);

  
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [isDeleteMilestoneOpen, setIsDeleteMilestoneOpen] = useState(false);
  const [deletingMilestone, setDeletingMilestone] = useState(null);

  
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [isDeleteReleaseOpen, setIsDeleteReleaseOpen] = useState(false);
  const [deletingRelease, setDeletingRelease] = useState(null);
  const [isAttachIssuesOpen, setIsAttachIssuesOpen] = useState(false);
  const [attachingRelease, setAttachingRelease] = useState(null);

  
  const [isLinkRepoModalOpen, setIsLinkRepoModalOpen] = useState(false);
  const [isUnlinkingRepo, setIsUnlinkingRepo] = useState(false);
  const [linkedRepo, setLinkedRepo] = useState(() => {
    const saved = localStorage.getItem(`frietSyncGithubRepo_${projectId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  
  useEffect(() => {
    if (project) {
      const owner = project.githubRepositoryOwner || project.githubOwner || project.repositoryOwner || project.repoOwner;
      const repo = project.githubRepositoryName || project.githubRepo || project.repositoryName || project.repoName;
      if (owner && repo) {
        Promise.resolve().then(() => {
          setLinkedRepo({ owner, repository: repo });
        });
      } else if (
        project.githubRepository &&
        typeof project.githubRepository === 'string' &&
        project.githubRepository.includes('/')
      ) {
        const [o, r] = project.githubRepository.split('/');
        Promise.resolve().then(() => {
          setLinkedRepo({ owner: o, repository: r });
        });
      }
    }
  }, [project]);

  const isAdmin = isUserAdmin();

  const currentProjectRole = useMemo(() => {
    return members.find((member) => {
      const memberUserId = member.userId || member.id || member._id || member.user?.id || member.user?._id;
      const memberEmail = String(member.email || member.user?.email || '').toLowerCase();
      return (
        (currentUserId && String(memberUserId) === String(currentUserId)) ||
        (currentUserEmail && memberEmail === currentUserEmail)
      );
    });
  }, [members, currentUserId, currentUserEmail]);

  const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const currentProjectRoleNames = [
    currentProjectRole?.role,
    currentProjectRole?.projectRole,
    currentProjectRole?.userRole,
    currentProjectRole?.user?.role,
  ].map(normalizeRole);
  const currentUserIds = [
    currentUserProfile?.id,
    currentUserProfile?._id,
    currentUserProfile?.userId,
    currentUserProfile?.user?.id,
    currentUserProfile?.user?._id,
  ].filter(Boolean).map(String);
  const projectManagerIds = [
    project?.projectManagerId,
    project?.projectManager?.id,
    project?.projectManager?._id,
    project?.projectManager?.userId,
  ].filter(Boolean).map(String);
  const projectAdminIds = [project?.adminId].filter(Boolean).map(String);
  const teamLeadIds = [
    project?.teamLeadId,
    project?.teamLead?.id,
    project?.teamLead?._id,
    project?.teamLead?.userId,
  ].filter(Boolean).map(String);

  const repositoryManagerIds = [
    project?.adminId,
    project?.createdBy,
    project?.projectManagerId,
    project?.projectManager?.id,
    project?.projectManager?._id,
    project?.teamLeadId,
    project?.teamLead?.id,
    project?.teamLead?._id,
  ].filter(Boolean).map(String);
  const canManageGithubRepository = currentUserIds.some((id) => repositoryManagerIds.includes(id)) ||
    currentProjectRoleNames.some((role) => ['PROJECT_MANAGER', 'TEAM_LEAD'].includes(role));

  const canManageMilestones = currentUserIds.some((id) =>
    projectAdminIds.includes(id) || projectManagerIds.includes(id)
  );
  const globalRole = normalizeRole(currentUserProfile?.role || currentUserProfile?.user?.role);
  const canCreateSprint =
    isAdmin ||
    globalRole === 'ADMIN' ||
    currentUserIds.some((id) => projectAdminIds.includes(id)) ||
    currentUserIds.some((id) => projectManagerIds.includes(id) || teamLeadIds.includes(id)) ||
    ['PROJECT_MANAGER', 'TEAM_LEAD'].includes(globalRole) ||
    currentProjectRoleNames.some((role) => ['PROJECT_MANAGER', 'TEAM_LEAD'].includes(role));
  const canCreateIssue = canCreateSprint ||
    globalRole === 'REPORTER' ||
    currentProjectRoleNames.includes('REPORTER');
  const canRequestAssignment = globalRole === 'CONTRIBUTOR' || currentProjectRoleNames.includes('CONTRIBUTOR');
  const canManageReleases = isAdmin || ['ADMIN', 'PROJECT_MANAGER'].includes(globalRole) ||
    currentUserIds.some((id) => projectAdminIds.includes(id) || projectManagerIds.includes(id)) ||
    currentProjectRoleNames.includes('PROJECT_MANAGER');
  const canAttachIssues = canManageReleases;

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4000);
  }, []);

  const loadAllProjectDataCore = useCallback(async (pId) => {
    if (!pId) return null;
    const now = Date.now();

    
    const [projectRes, summaryRes, membersRes, sprintsRes, issuesRes, pollsRes, releasesRes] =
      await Promise.allSettled([
        getProjectById(pId),
        getProjectSummary(pId).catch(() => null),
        getProjectMembers(pId).catch(() => []),
        getProjectSprints(pId).catch(() => []),
        getProjectIssues(pId, { page: 0, size: 50 }).catch(() => ({ items: [] })),
        getProjectPolls(pId).catch(() => []),
        getProjectReleases(pId).catch(() => []),
      ]);

    if (projectRes.status === 'rejected') throw projectRes.reason;
    const projectData = projectRes.status === 'fulfilled' ? projectRes.value : null;
    const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
    const membersData =
      membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)
        ? membersRes.value
        : [];
    const sprintCandidates = sprintsRes.status === 'fulfilled'
      ? [sprintsRes.value, sprintsRes.value?.data, sprintsRes.value?.sprints, sprintsRes.value?.projectSprints, sprintsRes.value?.items, sprintsRes.value?.content, sprintsRes.value?.results, sprintsRes.value?.data?.sprints, sprintsRes.value?.data?.projectSprints, sprintsRes.value?.data?.items, sprintsRes.value?.data?.content, sprintsRes.value?.data?.results]
      : [];
    const sprintsData = sprintCandidates.find(Array.isArray) || [];
    const issuesPage = issuesRes.status === 'fulfilled'
      ? normalizeIssuePage(issuesRes.value, { page: 0, size: 50 })
      : normalizeIssuePage(null);
    const remainingIssuePages = issuesPage.totalPages > 1
      ? await Promise.all(Array.from({ length: issuesPage.totalPages - 1 }, (_, index) =>
          getProjectIssues(pId, { page: index + 1, size: issuesPage.size || 50 })
            .catch(() => normalizeIssuePage(null, { page: index + 1, size: issuesPage.size || 50 }))
        ))
      : [];
    const issuesData = [issuesPage, ...remainingIssuePages].flatMap((page) => page.items);
    const pollsData =
      pollsRes.status === 'fulfilled' && Array.isArray(pollsRes.value) ? pollsRes.value : [];
    const releasesData =
      releasesRes.status === 'fulfilled'
        ? Array.isArray(releasesRes.value)
          ? releasesRes.value
          : releasesRes.value?.releases || releasesRes.value?.items || releasesRes.value?.data || []
        : [];

    
    
    let milestoneList = [];
    let milestoneError = '';
    try {
      const msRes = await getProjectMilestones(pId);
      const candidates = [
        msRes,
        msRes?.data,
        msRes?.milestones,
        msRes?.data?.milestones,
        msRes?.items,
        msRes?.data?.items,
        msRes?.content,
        msRes?.data?.content,
      ];
      milestoneList = candidates.find(Array.isArray) || [];
    } catch (error) {
      milestoneList = [];
      milestoneError = getFriendlyErrorMessage(error, 'project');
    }

    
    const recentIssues = [...issuesData]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 15);

    const historyPromises = recentIssues.map((iss) => {
      const issId = iss?.id || iss?._id;
      return issId
        ? getIssueHistory(issId, { page: 0, size: 5 }).catch(() => null)
        : Promise.resolve(null);
    });

    const historyResults = await Promise.allSettled(historyPromises);
    const gatheredActivities = [];

    historyResults.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        const histData = res.value;
        const histItems = Array.isArray(histData)
          ? histData
          : histData?.items || histData?.history || histData?.content || [];
        const relatedIssue = recentIssues[idx];
        const issueKey =
          relatedIssue?.key ||
          relatedIssue?.code ||
          `#${relatedIssue?.number || (relatedIssue?.id ? String(relatedIssue.id).slice(0, 4) : '1')}`;

        histItems.forEach((entry) => {
          const timestamp = entry.createdAt || entry.timestamp || relatedIssue?.updatedAt;
          gatheredActivities.push({
            id: entry.id || entry._id || Math.random(),
            actor: entry.actor?.name || entry.user?.name || entry.actorName || 'Team Member',
            action: entry.description || entry.action || entry.message || `Updated ${issueKey}`,
            timestamp,
          });
        });
      }
    });

    
    issuesData.slice(0, 20).forEach((iss) => {
      const issueKey =
        iss.key ||
        iss.code ||
        `#${iss.number || (iss.id ? String(iss.id).slice(0, 4) : '1')}`;
      const assignee = iss.assignee?.name || iss.assignedTo?.name || 'Collaborator';
      const isDone = ['RESOLVED', 'CLOSED'].includes(
        String(iss.status || '').toUpperCase()
      );

      if (isDone && iss.updatedAt) {
        gatheredActivities.push({
          id: `done-${iss.id || iss._id}`,
          actor: assignee,
          action: `Completed task ${issueKey}`,
          timestamp: iss.updatedAt,
        });
      } else if (iss.createdAt) {
        gatheredActivities.push({
          id: `created-${iss.id || iss._id}`,
          actor: iss.reporter?.name || iss.creator?.name || assignee,
          action: `Created task ${issueKey}: ${iss.title || ''}`,
          timestamp: iss.createdAt,
        });
      }
    });

    
    const seenActivityKeys = new Set();
    const uniqueGathered = gatheredActivities.filter((act) => {
      const key = `${act.actor}_${act.action}_${act.timestamp}`;
      if (seenActivityKeys.has(key)) return false;
      seenActivityKeys.add(key);
      return true;
    });

    const formattedActivities = uniqueGathered
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50)
      .map((act) => {
        const d = new Date(act.timestamp);
        const diffMin = Math.max(1, Math.floor((now - d.getTime()) / 60000));
        let timeStr = `${diffMin}m`;
        if (diffMin >= 60) {
          const hours = Math.floor(diffMin / 60);
          timeStr = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
        }
        return {
          ...act,
          time: timeStr,
          initials: getInitials(act.actor),
          avatarColor: getAvatarColor(act.actor),
        };
      });

    return {
      project: projectData,
      summary: summaryData,
      members: membersData,
      sprints: sprintsData,
      issues: issuesData,
      issueTotalCount: summaryData?.totalIssues ?? issuesPage.totalElements,
      milestones: milestoneList,
      milestoneError,
      releases: releasesData,
      polls: pollsData,
      activities: formattedActivities,
    };
  }, []);

  const reloadData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setPageError('');
    try {
      const data = await loadAllProjectDataCore(projectId);
      if (data) {
        setProject(data.project);
        setSummary(data.summary);
        setMembers(data.members);
        setSprints(data.sprints);
        setIssues(data.issues);
        setIssueTotalCount(data.issueTotalCount);
        setMilestones(data.milestones);
        setMilestoneLoadError(data.milestoneError || '');
        setReleases(data.releases);
        setPolls(data.polls);
        setActivities(data.activities);
      }
    } catch (err) {
      setPageError(getFriendlyErrorMessage(err, 'project'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, loadAllProjectDataCore]);

  useEffect(() => {
    let isMounted = true;
    if (!projectId) return;

    loadAllProjectDataCore(projectId)
      .then((data) => {
        if (!isMounted || !data) return;
        setProject(data.project);
        setSummary(data.summary);
        setMembers(data.members);
        setSprints(data.sprints);
        setIssues(data.issues);
        setIssueTotalCount(data.issueTotalCount);
        setMilestones(data.milestones);
        setMilestoneLoadError(data.milestoneError || '');
        setReleases(data.releases);
        setPolls(data.polls);
        setActivities(data.activities);
        const projectRepo = data.project?.githubRepository || data.project?.repository || data.project?.githubRepo ||
          (data.project?.githubRepositoryOwner && data.project?.githubRepositoryName
            ? { owner: data.project.githubRepositoryOwner, repository: data.project.githubRepositoryName }
            : null);
        if (projectRepo) {
          if (typeof projectRepo === 'string') {
            const parts = projectRepo.split('/');
            if (parts.length === 2) {
              const rObj = { owner: parts[0], repository: parts[1] };
              setLinkedRepo(rObj);
              localStorage.setItem(`frietSyncGithubRepo_${projectId}`, JSON.stringify(rObj));
            }
          } else if (projectRepo.owner && projectRepo.repository) {
            setLinkedRepo(projectRepo);
            localStorage.setItem(`frietSyncGithubRepo_${projectId}`, JSON.stringify(projectRepo));
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setPageError(getFriendlyErrorMessage(err, 'project'));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, loadAllProjectDataCore]);

  const handleDownloadSummaryPdf = async () => {
    if (!projectId || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const data = await getProjectSummaryPdf(projectId);
      if (!data) throw new Error('No PDF content returned');
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `${safeName}-summary.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('success', 'Project summary PDF downloaded.');
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project') || 'Failed to download PDF summary.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleUnlinkRepository = async () => {
    if (!projectId || isUnlinkingRepo) return;
    setIsUnlinkingRepo(true);
    try {
      await unlinkProjectRepository(projectId);
      setLinkedRepo(null);
      localStorage.removeItem(`frietSyncGithubRepo_${projectId}`);
      showToast('success', 'GitHub repository unlinked successfully.');
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project') || 'Failed to unlink repository.');
    } finally {
      setIsUnlinkingRepo(false);
    }
  };

  const handleUploadReleaseArtifact = async (releaseId, file) => {
    if (!releaseId || !file) return;
    const MAX_BYTES = 100 * 1024 * 1024; 
    if (file.size > MAX_BYTES) {
      showToast('error', 'File size exceeds maximum 100 MB limit.');
      return;
    }
    setUploadingReleaseId(releaseId);
    try {
      const updated = await uploadReleaseFile(releaseId, file);
      showToast('success', `Artifact "${file.name}" uploaded successfully.`);
      setReleases((prev) =>
        prev.map((r) => {
          const rId = r.id || r._id || r.releaseId;
          if (String(rId) === String(releaseId)) {
            return updated && typeof updated === 'object'
              ? { ...r, ...updated }
              : { ...r, fileName: file.name, releaseFileUrl: updated || r.releaseFileUrl };
          }
          return r;
        })
      );
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project') || 'Failed to upload artifact.');
    } finally {
      setUploadingReleaseId(null);
    }
  };

  const handleMilestoneSaved = (saved) => {
    const sId = saved?.id || saved?._id || saved?.milestoneId;
    if (!sId) {
      reloadData();
      showToast('success', 'Milestone saved. Refreshing milestone list…');
      return;
    }
    setMilestoneLoadError('');
    setMilestones((prev) => {
      const exists = prev.some((m) => String(m.id || m._id || m.milestoneId) === String(sId));
      if (exists) {
        return prev.map((m) => (String(m.id || m._id || m.milestoneId) === String(sId) ? { ...m, ...saved } : m));
      }
      return [...prev, saved];
    });
    showToast('success', `Milestone "${saved?.name || 'Milestone'}" saved.`);
  };

  const handleMilestoneDeleted = (deletedId) => {
    setMilestones((prev) => prev.filter((m) => String(m.id || m._id || m.milestoneId) !== String(deletedId)));
    setMilestoneLoadError('');
    showToast('success', 'Milestone was deleted.');
  };

  const handleReleaseSaved = (saved) => {
    const sId = saved?.id || saved?._id || saved?.releaseId;
    setReleases((prev) => {
      const exists = prev.some((r) => String(r.id || r._id || r.releaseId) === String(sId));
      if (exists) {
        return prev.map((r) => (String(r.id || r._id || r.releaseId) === String(sId) ? { ...r, ...saved } : r));
      }
      return [saved, ...prev];
    });
    showToast('success', `Release "${saved?.name || 'Release'}" saved.`);
  };

  const handleReleaseDeleted = (deletedId) => {
    setReleases((prev) => prev.filter((r) => String(r.id || r._id || r.releaseId) !== String(deletedId)));
    showToast('success', 'Release was deleted.');
  };

  const handleIssuesAttached = (updatedRelease) => {
    const rId = updatedRelease?.id || updatedRelease?._id || updatedRelease?.releaseId || attachingRelease?.id;
    setReleases((prev) =>
      prev.map((r) => (String(r.id || r._id || r.releaseId) === String(rId) ? { ...r, ...updatedRelease } : r))
    );
    showToast('success', 'Issues attached to release.');
  };

  
  const overallProgress = getProjectProgress(project);

  const activeSprintsCount = useMemo(() => {
    if (summary?.activeSprints !== undefined && summary.activeSprints !== null) {
      return summary.activeSprints;
    }
    return sprints.filter((s) => String(s.status || '').toUpperCase() === 'ACTIVE').length;
  }, [summary, sprints]);

  const activeIssuesCount = useMemo(() => {
    if (summary?.inProgressIssues !== undefined && summary.inProgressIssues !== null) {
      return (summary.inProgressIssues || 0) + (summary.openIssues || 0);
    }
    return issues.filter(
      (iss) =>
        !['RESOLVED', 'CLOSED'].includes(String(iss.status || '').toUpperCase())
    ).length;
  }, [summary, issues]);

  const myTasksCount = useMemo(() => {
    if (!currentUserId && !currentUserEmail) return 0;
    return issues.filter((iss) => {
      const aId = String(
        iss.assigneeId || iss.assignee?.id || iss.assignedTo?.id || iss.assignedTo || ''
      ).toLowerCase();
      const aEmail = String(iss.assignee?.email || iss.assignedTo?.email || '')
        .toLowerCase()
        .trim();
      return (
        (currentUserId && aId === String(currentUserId).toLowerCase()) ||
        (currentUserEmail && aEmail === currentUserEmail)
      );
    }).length;
  }, [issues, currentUserId, currentUserEmail]);

  
  const sprintGaugeMetrics = useMemo(() => {
    const completed = sprints.filter((sprint) => String(sprint.status || '').toUpperCase() === 'COMPLETED').length;
    const active = sprints.filter((sprint) => ['ACTIVE', 'IN_PROGRESS'].includes(String(sprint.status || '').toUpperCase())).length;
    const total = summary?.totalSprints ?? sprints.length;
    const planned = summary?.plannedSprints ?? Math.max(0, total - completed - active);
    const completedCount = summary?.completedSprints ?? completed;
    const activeCount = summary?.activeSprints ?? active;
    const actualTotal = completedCount + activeCount + planned;
    const metrics = {
      total: summary?.totalSprints ?? actualTotal,
      progressRate: actualTotal ? Math.round((completedCount / actualTotal) * 100) : 0,
      chartData: [
        { name: 'Completed', value: completedCount, color: '#38bdf8' },
        { name: 'Active', value: activeCount, color: '#0284c7' },
        { name: 'Planned', value: planned, color: '#52525b' },
      ].filter((item) => item.value > 0),
    };
    return {
      ...metrics,
      displayChartData: metrics.chartData.length ? metrics.chartData : [{ name: 'No sprints', value: 1, color: '#52525b' }],
    };
  }, [summary, sprints]);

  const issueGaugeMetrics = useMemo(() => {
    const normalizeStatus = (issue) => String(issue.status || issue.issueStatus || '').toUpperCase().replace(/[\s-]+/g, '_');
    const completedFromRows = issues.filter((issue) => ['RESOLVED', 'CLOSED'].includes(normalizeStatus(issue))).length;
    const activeFromRows = issues.filter((issue) => normalizeStatus(issue) === 'IN_PROGRESS').length;
    const pendingFromRows = issues.filter((issue) => ['TODO', 'OPEN', 'BACKLOG'].includes(normalizeStatus(issue))).length;
    const hasSummaryCounts = summary && ['totalIssues', 'resolvedIssues', 'closedIssues', 'inProgressIssues', 'openIssues'].some((key) => Number.isFinite(Number(summary[key])));
    const completed = hasSummaryCounts ? (summary.resolvedIssues || 0) + (summary.closedIssues || 0) : completedFromRows;
    const inProgress = hasSummaryCounts ? (summary.inProgressIssues || 0) : activeFromRows;
    const pending = hasSummaryCounts
      ? Math.max(0, (summary.totalIssues || 0) - completed - inProgress)
      : Math.max(pendingFromRows, issues.length - completed - inProgress);
    const total = issueTotalCount || completed + inProgress + pending;
    const metrics = {
      rate: total ? Math.round((completed / total) * 100) : 0,
      total,
      chartData: [
        { name: 'Completed', value: completed, color: '#38bdf8' },
        { name: 'In Progress', value: inProgress, color: '#0284c7' },
        { name: 'Pending / Backlog', value: pending, color: '#52525b' },
      ].filter((item) => item.value > 0),
    };
    return {
      ...metrics,
      displayChartData: metrics.chartData.length ? metrics.chartData : [{ name: 'No issues', value: 1, color: '#52525b' }],
    };
  }, [summary, issues, issueTotalCount]);

  const handleVoteInRecentPoll = async (pollId, optionId) => {
    if (!pollId || !optionId) return;
    try {
      const updated = await voteInPoll(pollId, optionId);
      window.localStorage.setItem(`frietSync_poll_${pollId}_voted`, String(optionId));
      showToast('success', 'Your vote was recorded!');
      setPolls((prev) =>
        prev.map((p) => {
          const pid = p.id || p._id || p.pollId;
          return String(pid) === String(pollId)
            ? { ...p, ...updated, userVotedOptionId: updated?.userVotedOptionId || updated?.votedOptionId || optionId }
            : p;
        })
      );
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'poll'));
    }
  };

  useEffect(() => {
    const pollIds = pollSubscriptionKey ? pollSubscriptionKey.split(',') : [];
    if (pollIds.length === 0) return undefined;

    const unsubscribeFns = pollIds.map((pollId) =>
      subscribeToPollResults(pollId, (event) => {
        if (!event) return;
        setPolls((currentPolls) => currentPolls.map((poll) => {
          const currentPollId = poll.id || poll._id || poll.pollId;
          if (String(currentPollId) !== String(pollId)) return poll;

          const eventData = event?.poll || event?.data?.poll || event?.data || event;
          const normalizedEvent = eventData && typeof eventData === 'object'
            ? { ...eventData, id: eventData.id || eventData.pollId || eventData._id || pollId }
            : event;
          return mergePollUpdateEvent(poll, normalizedEvent);
        }));
      })
    );

    return () => unsubscribeFns.forEach((unsubscribe) => unsubscribe());
  }, [pollSubscriptionKey]);

  const openPoll = (pollId) => setOpenPollId(pollId);
  const activePoll = useMemo(
    () => polls.find((poll) => String(poll.id || poll._id || poll.pollId) === String(openPollId)) || null,
    [polls, openPollId]
  );

  useEffect(() => {
    if (!openPollId || activePoll?.options?.length) return undefined;

    let isMounted = true;
    setIsOpenPollLoading(true);
    getPollDetails(openPollId)
      .then((details) => {
        if (!isMounted || !details) return;
        setPolls((currentPolls) => currentPolls.map((poll) => {
          const pollId = poll.id || poll._id || poll.pollId;
          return String(pollId) === String(openPollId) ? { ...poll, ...details } : poll;
        }));
      })
      .catch((error) => showToast('error', getFriendlyErrorMessage(error, 'poll')))
      .finally(() => {
        if (isMounted) setIsOpenPollLoading(false);
      });

    return () => { isMounted = false; };
  }, [openPollId, activePoll?.options?.length, showToast]);

  useEffect(() => {
    if (!openPollId) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenPollId(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPollId]);

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
      reloadData();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const managerEmail = String(
    project?.projectManagerEmail || project?.projectManager?.email || project?.projectManager?.user?.email || ''
  ).toLowerCase();
  const teamLeadEmail = String(
    project?.teamLeadEmail || project?.teamLead?.email || project?.teamLead?.user?.email || ''
  ).toLowerCase();
  const projectManagerMember = members.find((member) => {
    const role = String(member.role || member.projectRole || member.user?.role || '').toUpperCase();
    const email = String(member.email || member.user?.email || '').toLowerCase();
    return role === 'PROJECT_MANAGER' || (managerEmail && email === managerEmail);
  });
  const teamLeadMember = members.find((member) => {
    const role = String(member.role || member.projectRole || member.user?.role || '').toUpperCase();
    const email = String(member.email || member.user?.email || '').toLowerCase();
    return ['TEAM_LEAD', 'LEAD'].includes(role) || (teamLeadEmail && email === teamLeadEmail);
  });
  const managerUser = project?.projectManager?.user || projectManagerMember?.user || projectManagerMember || {};
  const teamLeadUser = project?.teamLead?.user || teamLeadMember?.user || teamLeadMember || {};
  const projectManagerName =
    project?.projectManager?.name || project?.projectManagerName || managerUser.name || 'Not assigned';
  const projectManagerAvatar =
    project?.projectManager?.profilePictureUrl ||
    project?.projectManager?.avatarUrl ||
    project?.projectManager?.user?.profilePictureUrl ||
    project?.projectManager?.user?.avatarUrl ||
    project?.projectManagerAvatar ||
    managerUser.profilePictureUrl ||
    managerUser.avatarUrl ||
    '';
  const teamLeadName =
    project?.teamLead?.name || project?.teamLeadName || teamLeadUser.name || 'Not assigned';

  return (
    <div className="w-full min-w-0 text-slate-900 dark:text-slate-100 space-y-6 animate-fadeIn pb-16 px-3 sm:px-6 lg:px-8">
      {}
      {toastNotice && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg ${
            toastNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-600/40 dark:text-emerald-300'
              : 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-600/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastNotice.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-emerald-400" size={17} />
            ) : (
              <FiAlertCircle className="shrink-0 text-rose-600 dark:text-rose-400" size={17} />
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

      {}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
        >
          <FiArrowLeft size={16} />
          <span>Back to projects</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadData}
            disabled={isLoading}
            title="Refresh overview"
            className="p-2 rounded-xl border border-slate-200 dark:border-[#35353d] bg-white dark:bg-[#222228] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2b2b32] transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <FiRefreshCw size={15} className={isLoading ? 'animate-spin text-sky-500 dark:text-sky-400' : ''} />
          </button>

          {isAdmin && project && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit Project"
                className="p-2 rounded-xl border border-slate-200 dark:border-[#35353d] bg-white dark:bg-[#222228] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2b2b32] hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer shadow-xs"
              >
                <FiEdit2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete Project"
                className="p-2 rounded-xl border border-slate-200 dark:border-[#35353d] bg-white dark:bg-[#222228] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shadow-xs"
              >
                <FiTrash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {}
      {pageError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={18} className="shrink-0" />
            <span>{pageError}</span>
          </div>
          <button
            type="button"
            onClick={reloadData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {}
      <section className="rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 dark:bg-[#241f3d] border border-indigo-100 dark:border-[#3b325c] flex items-center justify-center text-indigo-600 dark:text-white shrink-0 shadow-xs">
              <FiFolder size={28} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {isLoading ? 'Loading project...' : project?.name || 'Unnamed project'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {project?.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {}
          <div className="lg:text-right shrink-0">
            <div className="flex items-center justify-between lg:justify-end gap-3 mb-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overall Progress</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {overallProgress === null ? 'Unavailable' : `${overallProgress}%`}
              </span>
            </div>
            {overallProgress === null ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Project progress is unavailable.</p>
            ) : (
              <div className="h-2.5 sm:h-3 w-full sm:w-72 lg:w-80 bg-slate-100 dark:bg-[#2b2b34] rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-transparent" role="progressbar" aria-label="Project progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallProgress}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-[#38bdf8] transition-all duration-500 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {}
        <div className="pt-4 border-t border-slate-100 dark:border-[#2d2d34] flex flex-col xl:flex-row xl:items-center justify-between gap-5 flex-wrap">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsMeetingModalOpen(true)}
              className="rounded-full bg-[#55c2f4] hover:bg-[#43b3e8] text-[#071522] font-semibold text-sm px-4 sm:px-5 py-3 shadow-sm transition shrink-0 cursor-pointer"
            >
              Schedule meeting
            </button>

            <button
              type="button"
              onClick={() => setDetailPanel('summary')}
              className="inline-flex items-center gap-2 rounded-full bg-[#55c2f4] hover:bg-[#43b3e8] text-[#071522] font-semibold text-sm px-4 sm:px-5 py-3 transition cursor-pointer"
            >
              View summary
            </button>

            <button
              type="button"
              onClick={() => setDetailPanel('members')}
              className="inline-flex items-center gap-2 rounded-full bg-[#55c2f4] hover:bg-[#43b3e8] text-[#071522] font-semibold text-sm px-4 sm:px-5 py-3 transition cursor-pointer"
            >
              View members
            </button>

            {}
            <div className="flex items-center gap-3 ml-1 sm:ml-2">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-[#26262b] dark:text-slate-300">
                {projectManagerName !== 'Not assigned' ? getInitials(projectManagerName) : <FiUsers size={16} />}
                {projectManagerAvatar && (
                  <img
                    src={projectManagerAvatar}
                    alt={projectManagerName}
                    className="absolute inset-0 h-full w-full rounded-full object-cover"
                    onError={(event) => event.currentTarget.remove()}
                  />
                )}
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Project manager</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white block mt-0.5 leading-tight">
                  {projectManagerName}
                </span>
              </div>
            </div>
          </div>

          {}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            {}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#303030] bg-slate-50 dark:bg-[#242428] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-[#2f2249] text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FiRepeat size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  Total sprints
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : (summary?.totalSprints ?? sprints.length)}
                </span>
              </div>
            </div>

            {}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#303030] bg-slate-50 dark:bg-[#242428] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-[#432328] text-rose-700 dark:text-[#F87171] flex items-center justify-center shrink-0">
                <FiAlertTriangle size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  Total issues
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : (summary?.totalIssues ?? issues.length)}
                </span>
              </div>
            </div>

            {}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#303030] bg-slate-50 dark:bg-[#242428] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-[#2f2249] text-indigo-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FiFolder size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  Team members
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : members.length}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {}
      {viewingAllPolls ? (
        
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewingAllPolls(false)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
            >
              <FiArrowLeft size={16} />
              <span>Back to Project Overview</span>
            </button>
          </div>
          <ProjectPollsSection
            projectId={projectId}
            projectName={project?.name}
            canManage={isAdmin}
            onShareToChat={() => navigate(`/dashboard/chats?projectId=${projectId}`)}
          />
        </div>
      ) : (
        
        <div className="space-y-6">
          {}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {}
            <div className="min-h-[270px] rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Upcoming Milestones
                    </h2>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {milestones.length}
                    </span>
                  </div>
                  {canManageMilestones && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMilestone(null);
                        setIsMilestoneModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                      title="Add Milestone"
                    >
                      <FiPlus size={13} />
                      <span>Add</span>
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="space-y-4 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-10 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : milestoneLoadError ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-rose-600 dark:text-rose-400">{milestoneLoadError}</p>
                    <button
                      type="button"
                      onClick={reloadData}
                      className="mt-2 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
                    >
                      Retry
                    </button>
                  </div>
                ) : milestones.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      No upcoming milestones
                    </p>
                    <p className="text-xs mt-1">
                      Milestones added to this project will appear here.
                    </p>
                    {canManageMilestones && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMilestone(null);
                          setIsMilestoneModalOpen(true);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        <FiPlus size={13} /> Add First Milestone
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700/60">
                        {milestones.map((m, idx) => {
                        const persistedMilestoneId = m.id || m._id || m.milestoneId || m.milestone?.id || m.milestone?._id;
                        const mId = persistedMilestoneId || idx;
                        const hasPersistedMilestoneId = Boolean(persistedMilestoneId);
                        const isCompleted = isMilestoneCompleted(m);
                        const statusInfo = getMilestoneStatusInfo(m.status, m.completed);
                        return (
                          <div
                            key={mId}
                            className="relative flex items-center justify-between gap-3 text-xs group py-0.5"
                          >
                            <span
                              className={`absolute -left-5 top-2 h-2.5 w-2.5 rounded-full ${statusInfo.dotClass}`}
                            />
                            <div className="min-w-0 pr-2">
                              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {m.name || m.title || `Milestone ${idx + 1}`}
                              </p>
                              {m.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-xs">
                                  {m.description}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Due: {formatMilestoneDate(m.dueDate || m.targetDate || m.deadline)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${statusInfo.badgeClass}`}
                              >
                                {statusInfo.label}
                              </span>
                              {canManageMilestones && hasPersistedMilestoneId && !isCompleted ? (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMilestone(m);
                                      setIsMilestoneModalOpen(true);
                                    }}
                                    title="Edit Milestone"
                                    aria-label={`Edit ${m.name || m.title || 'milestone'}`}
                                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-[#25252c] transition cursor-pointer"
                                  >
                                    <FiEdit2 size={12} />
                                    <span className="hidden sm:inline">Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeletingMilestone(m);
                                      setIsDeleteMilestoneOpen(true);
                                    }}
                                    title="Delete Milestone"
                                    aria-label={`Delete ${m.name || m.title || 'milestone'}`}
                                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                  >
                                    <FiTrash2 size={12} />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {}
            <div className="min-h-[270px] rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h2>

                {isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-9 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      No recent activity
                    </p>
                    <p className="text-xs mt-1">Activity logs will appear as team members work.</p>
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                    <div className="space-y-3.5">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: act.avatarColor }}
                            >
                              {act.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-900 dark:text-white font-bold truncate leading-tight">
                                {act.actor}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[170px] sm:max-w-xs mt-0.5">
                                {act.action}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                            {act.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {}
            <div className="min-h-[310px] rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Sprint overview</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{sprintGaugeMetrics.total} project sprints</p>

                {}
                <div className="relative h-[155px] w-full flex items-center justify-center mt-2 [&_svg]:outline-none [&_svg]:focus-visible:outline-none [&_*]:outline-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sprintGaugeMetrics.displayChartData}
                        cx="50%"
                        cy="80%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={65}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={true}
                      >
                        {sprintGaugeMetrics.displayChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1.5 pointer-events-none">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {sprintGaugeMetrics.progressRate === null ? '—' : `${sprintGaugeMetrics.progressRate}%`}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {sprintGaugeMetrics.total ? 'Sprints completed' : 'No Sprints'}
                    </span>
                  </div>
                </div>

                {}
                <div className="flex items-center justify-center gap-3.5 text-[11px] mt-4 pt-2 border-t border-slate-100 dark:border-[#2d2d34]">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Completed
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#0284c7]" /> Active
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#52525b]" /> Planned
                  </span>
                </div>
              </div>
            </div>

            {}
            <div className="min-h-[310px] rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Issue overview</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{issueGaugeMetrics.total} project issues</p>
                <div className="relative h-[155px] w-full flex items-center justify-center mt-2 [&_svg]:outline-none [&_svg]:focus-visible:outline-none [&_*]:outline-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={issueGaugeMetrics.displayChartData} cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius={65} outerRadius={88} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={true}>
                        {issueGaugeMetrics.displayChartData.map((entry, index) => <Cell key={`issue-cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1.5 pointer-events-none">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">{issueGaugeMetrics.rate}%</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{issueGaugeMetrics.total ? 'Issues completed' : 'No Issues'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3.5 text-[11px] mt-4 pt-2 border-t border-slate-100 dark:border-[#2d2d34]">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Completed</span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-[#0284c7]" /> In Progress</span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-[#52525b]" /> Pending</span>
                </div>
              </div>
            </div>

            {}
            <div className="min-h-[310px] rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs flex flex-col">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Polls</h2>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsCreatePollOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"><FiPlus size={13} /> Create Poll</button>
                    <button type="button" onClick={() => setViewingAllPolls(true)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">View all <FiArrowRight size={12} className="inline" /></button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-8 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : polls.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">No active polls</p>
                    <p className="text-xs mt-1">Create a poll to collect team votes on decisions.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {polls.slice(0, 5).map((poll, pollIndex) => {
                      const pollId = poll.id || poll._id || poll.pollId || `poll-${pollIndex}`;

                      return (
                        <div key={pollId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2.5 dark:border-[#303030]">
                            <p className="min-w-0 flex-1 text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                              {poll.question || 'Untitled poll'}
                            </p>
                            <button
                              type="button"
                              onClick={() => openPoll(pollId)}
                              className="shrink-0 rounded-lg border border-sky-600 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-500 dark:text-sky-300 dark:hover:bg-sky-950/40"
                            >
                              Vote
                            </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {openPollId && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpenPollId(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-poll-dialog-title"
                className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#35353d] dark:bg-[#1b1b1f]"
              >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-[#303036]">
                  <div className="min-w-0">
                    <h2 id="project-poll-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                      {activePoll?.question || 'Project poll'}
                    </h2>
                    {activePoll?.description && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activePoll.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenPollId(null)}
                    aria-label="Close poll"
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#2b2b31] dark:hover:text-white"
                  >
                    <FiX size={18} />
                  </button>
                </header>
                <div className="overflow-y-auto overscroll-contain p-5">
                  {isOpenPollLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-[#29292e]" />)}
                    </div>
                  ) : activePoll?.options?.length ? (
                    <div className="space-y-2.5">
                      {(() => {
                        const pollId = activePoll.id || activePoll._id || activePoll.pollId;
                        const totalVotes = activePoll.totalVotes || activePoll.options.reduce((sum, option) => sum + (option.voteCount ?? option.votes ?? 0), 0);
                        const isClosed = activePoll.status === 'CLOSED' || activePoll.closed === true;
                        const storedVote = typeof window !== 'undefined' ? window.localStorage.getItem(`frietSync_poll_${pollId}_voted`) : null;
                        const votedOptionId = activePoll.userVotedOptionId || activePoll.votedOptionId || activePoll.selectedOptionId || storedVote;

                        return activePoll.options.map((option, index) => {
                          const optionId = option.id || option._id || option.optionId;
                          const votes = option.voteCount ?? option.votes ?? 0;
                          const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                          const isSelected = Boolean(
                            option.hasVoted ||
                            (votedOptionId && String(votedOptionId) === String(optionId)) ||
                            (Array.isArray(option.voterIds) && currentUserId && option.voterIds.map(String).includes(String(currentUserId)))
                          );

                          return (
                            <button
                              key={optionId || index}
                              type="button"
                              disabled={isClosed || !optionId}
                              onClick={() => handleVoteInRecentPoll(pollId, optionId)}
                              className={`group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all disabled:cursor-default ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500/50 dark:border-sky-400 dark:bg-sky-950/20'
                                  : 'border-slate-200/80 bg-slate-50/60 hover:border-sky-300 hover:bg-slate-100/60 dark:border-[#303030] dark:bg-[#252528] dark:hover:border-[#48484e]'
                              }`}
                            >
                              <span aria-hidden="true" className={`absolute inset-y-0 left-0 transition-all duration-500 ${isSelected ? 'bg-sky-200/60 dark:bg-sky-800/40' : 'bg-slate-200/70 dark:bg-[#343438]'}`} style={{ width: `${percentage}%` }} />
                              <span className="relative flex min-w-0 items-center gap-2 text-sm font-medium">
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-sky-600 bg-sky-500 text-white dark:border-sky-400 dark:bg-sky-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#2a2a2e]'}`}>
                                  {isSelected && <FiCheck size={10} className="stroke-[3]" />}
                                </span>
                                <span className={`truncate ${isSelected ? 'font-bold text-sky-900 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {option.text || option.label || option.title || option.optionText || (typeof option === 'string' ? option : `Option ${index + 1}`)}
                                </span>
                              </span>
                              <span className="relative flex shrink-0 items-center gap-1.5 text-xs font-bold">
                                <span className={isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}>{percentage}%</span>
                                <span className="font-normal text-slate-400">({votes})</span>
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Poll options are unavailable.</p>
                  )}
                </div>
                <footer className="border-t border-slate-200 p-4 text-right dark:border-[#303036]">
                  <button type="button" onClick={() => setOpenPollId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#3a3a42] dark:text-slate-300 dark:hover:bg-[#27272d]">
                    Close
                  </button>
                </footer>
              </section>
            </div>
          )}

          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          {}
          <section className="h-full rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <FiRepeat size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Sprints</h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {summary?.totalSprints ?? sprints.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Planned and active sprint cycles for this project.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canCreateSprint && (
                  <button
                    type="button"
                    onClick={() => setIsCreateSprintOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                  >
                    <FiPlus size={14} /> Create Sprint
                  </button>
                )}
                {canCreateSprint ? (
                  <Link
                    to="/dashboard/sprints"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-[#35353d] dark:bg-[#26262c] dark:text-slate-300 dark:hover:bg-[#32323a] dark:hover:text-white"
                  >
                    <span>View all</span>
                    <FiArrowRight size={13} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAllSprintsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-[#35353d] dark:bg-[#26262c] dark:text-slate-300 dark:hover:bg-[#32323a] dark:hover:text-white"
                  >
                    <span>View all</span>
                    <FiArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-11 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : sprints.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No sprints created for this project yet
                </p>
                <p className="text-xs mt-1">
                  Create sprint iterations from the Sprints board to organize issues into cycles.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2d2d34]">
                      <th className="py-2.5 px-3">Sprint</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Goal</th>
                      <th className="py-2.5 px-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2a2a30]">
                    {sprints.slice(0, 5).map((sprint, idx) => (
                      <tr
                        key={sprint.id || sprint._id || idx}
                        onClick={() => navigate('/dashboard/sprints')}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-[#27272e] transition"
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            Sprint {sprint.sprintNumber || idx + 1}
                          </span>
                          <p className="mt-0.5 font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                            {sprint.name || `Sprint ${idx + 1}`}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSprintStatusBadge(
                              sprint.status
                            )}`}
                          >
                            {String(sprint.status || 'PLANNED').replace(/[_-]/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {sprint.startDate || sprint.endDate
                            ? `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`
                            : 'Dates not set'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {sprint.goal || sprint.description || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 dark:text-slate-500">
                          <FiChevronRight size={15} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {}
          <section className="h-full rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <FiAlertTriangle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Issues</h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {issueTotalCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tasks and defects logged for {project?.name || 'this project'}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canCreateIssue && (
                  <button
                    type="button"
                    onClick={() => setIsCreateIssueOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                  >
                    <FiPlus size={14} />
                    <span>Create Issue</span>
                  </button>
                )}
                {canCreateSprint ? (
                  <Link
                    to={`/dashboard/issues?projectId=${projectId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#35353d] bg-slate-50 dark:bg-[#26262c] hover:bg-slate-100 dark:hover:bg-[#32323a] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <span>View all</span>
                    <FiArrowRight size={13} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAllIssuesOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#35353d] bg-slate-50 dark:bg-[#26262c] hover:bg-slate-100 dark:hover:bg-[#32323a] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <span>View all</span>
                    <FiArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-11 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No issues in this project yet
                </p>
                <p className="text-xs mt-1">Create issues to track tasks, bugs, and deliverables.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2d2d34]">
                      <th className="py-2.5 px-3">Issue</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Due date</th>
                      <th className="py-2.5 px-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2a2a30]">
                    {issues.slice(0, 5).map((issue, index) => (
                      <tr
                        key={issue.id || issue._id || issue.issueId || index}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-[#27272e] transition"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {issue.issueNumber ? `#${issue.issueNumber}` : ''}
                          </span>
                          <p className="mt-0.5 font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                            {issue.title || 'Untitled issue'}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getIssueStatusBadge(
                              issue.status
                            )}`}
                          >
                            {String(issue.status || 'OPEN').replace(/[_-]/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPriorityBadge(
                              issue.priority
                            )}`}
                          >
                            {String(issue.priority || 'MEDIUM').replace(/[_-]/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {issue.dueDate ? formatDate(issue.dueDate) : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 dark:text-slate-500">
                          <FiChevronRight size={15} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-4">
          {}
          <section className="min-w-0 rounded-3xl border border-slate-200/90 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-6 shadow-xs space-y-4 lg:col-span-1">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <FiPackage size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Releases</h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {releases.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Published version tags, attached deliverables, and artifact distribution.
                  </p>
                </div>
              </div>

              {canManageReleases && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRelease(null);
                    setIsReleaseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition cursor-pointer"
                >
                  <FiPlus size={15} />
                  <span>Create Release</span>
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2].map((n) => (
                  <div key={n} className="h-20 rounded-2xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : releases.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No releases published yet
                </p>
                <p className="text-xs mt-1">
                  Create releases to group completed issues, publish release notes, and distribute signed build artifacts.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {releases.slice(0, 5).map((release, idx) => {
                  const persistedReleaseId = release.id || release._id || release.releaseId;
                  const rId = persistedReleaseId || idx;
                  const releaseName = release.name || release.version || `Release ${idx + 1}`;
                  const rDate = release.releaseDate || release.date;
                  const attachedIssues = release.issues || release.issueIds || release.releaseIssues || [];
                  const issueCount = Array.isArray(attachedIssues) ? attachedIssues.length : 0;
                  const fileUrl = release.releaseFileUrl;
                  const fileName = release.fileName || release.filename || `${releaseName}-artifact`;

                  return (
                    <div
                      key={rId}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-[#242428] border border-slate-200/80 dark:border-[#303030] hover:border-slate-300 dark:hover:border-[#3b3b44] transition space-y-3"
                    >
                      {}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800/60 dark:text-cyan-300 text-xs font-bold tracking-wide">
                            <FiTag size={12} />
                            <span>{releaseName}</span>
                          </span>
                          {rDate && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Released {formatDate(rDate)}
                            </span>
                          )}
                          {release.releaseUrl && (
                            <a
                              href={release.releaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline"
                            >
                              <span>External Link</span>
                              <FiExternalLink size={12} />
                            </a>
                          )}
                        </div>

                      </div>

                      {}
                      {release.description && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {release.description}
                        </p>
                      )}

                      {}
                      <div className="pt-2 border-t border-slate-200/80 dark:border-[#2d2d34] flex flex-wrap items-center justify-between gap-3 text-xs">
                        {}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Attached Issues:</span>
                          <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-white dark:bg-[#25252c] border border-slate-200 dark:border-[#32323a]">
                            {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                          </span>
                        </div>

                        {}
                        <div className="flex items-center gap-2 flex-wrap">
                          {canAttachIssues && persistedReleaseId && (
                            <button
                              type="button"
                              onClick={() => {
                                setAttachingRelease(release);
                                setIsAttachIssuesOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#38383e] dark:bg-[#242428] dark:text-slate-200 dark:hover:bg-[#303036]"
                            >
                              <FiPlus size={13} /> Attach issues
                            </button>
                          )}
                          {canManageReleases && persistedReleaseId && (
                            <>
                              <input
                                id={`release-file-${rId}`}
                                type="file"
                                className="sr-only"
                                disabled={uploadingReleaseId === rId}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) handleUploadReleaseArtifact(rId, file);
                                  event.target.value = '';
                                }}
                              />
                              <label
                                htmlFor={`release-file-${rId}`}
                                className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition dark:border-[#38383e] dark:bg-[#242428] dark:text-slate-200 ${uploadingReleaseId === rId ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#303036]'}`}
                              >
                                <FiUploadCloud size={13} /> {uploadingReleaseId === rId ? 'Uploading…' : fileUrl ? 'Replace file' : 'Upload file'}
                              </label>
                            </>
                          )}
                          {fileUrl ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={fileUrl}
                                download={fileName}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 font-semibold text-xs transition"
                              >
                                <FiDownload size={13} />
                                <span className="truncate max-w-[150px]">{fileName || 'Download Artifact'}</span>
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {}
          <div className="min-w-0 lg:col-span-3 [&>section]:h-full">
            <ProjectContributionsSection
              projectId={projectId}
              linkedRepo={linkedRepo}
              canManage={canManageGithubRepository}
              onOpenLinkModal={() => setIsLinkRepoModalOpen(true)}
              onUnlinkRepo={handleUnlinkRepository}
              isUnlinkingRepo={isUnlinkingRepo}
            />
          </div>
          </div>

        </div>
      )}

      {}
      {isMeetingModalOpen && (
        <MeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          projects={project ? [project] : []}
          onMeetingSaved={() => {
            showToast('success', 'Meeting scheduled successfully.');
          }}
        />
      )}

      {isAdmin && project && isEditModalOpen && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
          onProjectUpdated={(updated) => {
            showToast('success', `"${updated?.name || 'Project'}" was updated successfully.`);
            reloadData();
          }}
        />
      )}

      {isAdmin && project && isDeleteModalOpen && (
        <DeleteProjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          project={project}
          onProjectDeleted={() => navigate('/dashboard/projects', { replace: true })}
        />
      )}

      {isAdmin && isAddMemberModalOpen && (
        <AddProjectMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          projectId={projectId}
          projectName={project?.name || 'Project'}
          existingMembers={members}
          onMemberAdded={(added) => {
            showToast('success', `${added?.name || added?.email || 'Member'} was added.`);
            reloadData();
            setDetailPanel('members');
          }}
        />
      )}

      <CreateIssueModal
        isOpen={canCreateIssue && isCreateIssueOpen}
        onClose={() => setIsCreateIssueOpen(false)}
        projects={project ? [project] : []}
        defaultProjectId={projectId}
        onIssueCreated={(created) => {
          showToast('success', `“${created?.title || 'Issue'}” was created.`);
          reloadData();
        }}
      />

      <CreateEditSprintModal
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        projectId={projectId}
        projects={project ? [project] : []}
        projectName={project?.name || 'Project'}
        onSprintSaved={(saved) => {
          setIsCreateSprintOpen(false);
          showToast('success', `Sprint "${saved?.name || 'Sprint'}" created.`);
          reloadData();
        }}
      />

      <IssueDetailsModal
        key={`${selectedIssue?.id || selectedIssue?._id || selectedIssue?.issueId || 'none'}-${!!selectedIssue}`}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        issueId={selectedIssue?.id || selectedIssue?._id || selectedIssue?.issueId}
        initialIssue={selectedIssue}
        projectName={project?.name || ''}
        onIssueUpdated={reloadData}
        onIssueDeleted={() => {
          setSelectedIssue(null);
          reloadData();
        }}
      />

      <ProjectItemsModal
        isOpen={isAllSprintsOpen && !canCreateSprint}
        kind="sprints"
        projectName={project?.name}
        items={sprints}
        canRequestAssignment={canRequestAssignment}
        onClose={() => setIsAllSprintsOpen(false)}
      />

      <ProjectItemsModal
        isOpen={isAllIssuesOpen && !canCreateSprint}
        kind="issues"
        projectName={project?.name}
        items={issues}
        canRequestAssignment={canRequestAssignment}
        onClose={() => setIsAllIssuesOpen(false)}
        onSelect={(issue) => {
          setIsAllIssuesOpen(false);
          setSelectedIssue(issue);
        }}
      />

      <ProjectTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        projectId={projectId}
        project={project}
        onOpenIssue={(issue) => setSelectedIssue(issue)}
      />

      {}
      <MilestoneModal
        key={`milestone-${editingMilestone?.id || editingMilestone?._id || 'new'}-${isMilestoneModalOpen}`}
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        projectId={projectId}
        milestone={editingMilestone}
        onMilestoneSaved={handleMilestoneSaved}
      />

      <DeleteMilestoneModal
        key={`delete-milestone-${deletingMilestone?.id || deletingMilestone?._id || 'none'}-${isDeleteMilestoneOpen}`}
        isOpen={isDeleteMilestoneOpen}
        onClose={() => {
          setIsDeleteMilestoneOpen(false);
          setDeletingMilestone(null);
        }}
        milestone={deletingMilestone}
        onMilestoneDeleted={handleMilestoneDeleted}
      />

      {}
      <ReleaseModal
        key={`release-${editingRelease?.id || editingRelease?._id || 'new'}-${isReleaseModalOpen}`}
        isOpen={isReleaseModalOpen}
        onClose={() => {
          setIsReleaseModalOpen(false);
          setEditingRelease(null);
        }}
        projectId={projectId}
        release={editingRelease}
        onReleaseSaved={handleReleaseSaved}
      />

      <DeleteReleaseModal
        key={`delete-release-${deletingRelease?.id || deletingRelease?._id || 'none'}-${isDeleteReleaseOpen}`}
        isOpen={isDeleteReleaseOpen}
        onClose={() => {
          setIsDeleteReleaseOpen(false);
          setDeletingRelease(null);
        }}
        release={deletingRelease}
        onReleaseDeleted={handleReleaseDeleted}
      />

      <AttachReleaseIssuesModal
        key={`attach-${attachingRelease?.id || attachingRelease?._id || 'none'}-${isAttachIssuesOpen}`}
        isOpen={isAttachIssuesOpen}
        onClose={() => {
          setIsAttachIssuesOpen(false);
          setAttachingRelease(null);
        }}
        release={attachingRelease}
        projectIssues={issues}
        onIssuesAttached={handleIssuesAttached}
      />

      {projectId && isLinkRepoModalOpen && (
        <LinkRepositoryModal
          isOpen={isLinkRepoModalOpen}
          onClose={() => setIsLinkRepoModalOpen(false)}
          projectId={projectId}
          onRepositoryLinked={({ owner, repository }) => {
            const rObj = { owner, repository };
            setLinkedRepo(rObj);
            localStorage.setItem(`frietSyncGithubRepo_${projectId}`, JSON.stringify(rObj));
            showToast('success', `Repository "${owner}/${repository}" linked successfully.`);
          }}
        />
      )}

      <CreatePollModal
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        projectId={projectId}
        onPollCreated={(created) => {
          if (created) setPolls((prev) => [created, ...prev]);
          setIsCreatePollOpen(false);
        }}
      />

      <ProjectSummaryModal
        isOpen={detailPanel === 'summary'}
        onClose={() => setDetailPanel(null)}
        project={project}
        summary={summary}
        projectManagerName={projectManagerName}
        teamLeadName={teamLeadName}
        totalIssues={issueTotalCount}
        totalSprints={summary?.totalSprints ?? sprints.length}
        totalMembers={members.length}
        overallProgress={overallProgress}
        isDownloadingPdf={isDownloadingPdf}
        onDownloadPdf={handleDownloadSummaryPdf}
        linkedRepo={linkedRepo}
        canManageGithubRepository={canManageGithubRepository}
        isUnlinkingRepo={isUnlinkingRepo}
        onUnlinkRepository={handleUnlinkRepository}
        onLinkRepository={() => {
          setDetailPanel(null);
          setIsLinkRepoModalOpen(true);
        }}
        onOpenTimeline={() => {
          setDetailPanel(null);
          setIsTimelineOpen(true);
        }}
      />

      <ProjectMembersModal
        isOpen={detailPanel === 'members'}
        onClose={() => setDetailPanel(null)}
        members={members}
        isLoading={isLoading}
        removingMemberId={removingMemberId}
        canAddMember={isAdmin}
        onAddMember={() => {
          setDetailPanel(null);
          setIsAddMemberModalOpen(true);
        }}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
};

export default ProjectDetailsView;
