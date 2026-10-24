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
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiCheckCircle,
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
  getProjectTimeline,
  unlinkProjectRepository,
  getFriendlyErrorMessage,
} from '../services/projectApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import { getProjectIssues, normalizeIssuePage, getIssueHistory } from '../../issues/services/issueApi';
import { getProjectPolls, voteInPoll } from '../../polls/services/pollApi';
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
import CreateIssueModal from '../../issues/components/CreateIssueModal';
import IssueDetailsModal from '../../issues/components/IssueDetailsModal';
import MeetingModal from '../../calendar/components/MeetingModal';
import { ProjectPollsSection } from '../../polls/components';

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

const getMilestoneStatusInfo = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['COMPLETED', 'ON_TRACK', 'RESOLVED'].includes(norm)) {
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
  const [sprints, setSprints] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [releases, setReleases] = useState([]);
  const [polls, setPolls] = useState([]);
  const [activities, setActivities] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [viewingAllPolls, setViewingAllPolls] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [uploadingReleaseId, setUploadingReleaseId] = useState(null);

  // Modals
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  // Milestone Modals
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [isDeleteMilestoneOpen, setIsDeleteMilestoneOpen] = useState(false);
  const [deletingMilestone, setDeletingMilestone] = useState(null);

  // Release Modals
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [isDeleteReleaseOpen, setIsDeleteReleaseOpen] = useState(false);
  const [deletingRelease, setDeletingRelease] = useState(null);
  const [isAttachIssuesOpen, setIsAttachIssuesOpen] = useState(false);
  const [attachingRelease, setAttachingRelease] = useState(null);

  // GitHub Repository Linking
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

  // Synchronize linked repo from project payload if provided by backend
  useEffect(() => {
    if (project) {
      const owner = project.githubOwner || project.repositoryOwner || project.repoOwner;
      const repo = project.githubRepo || project.githubRepositoryName || project.repositoryName || project.repoName;
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

  const currentRoleName = String(
    currentProjectRole?.role ||
    currentProjectRole?.projectRole ||
    currentUserProfile?.role ||
    ''
  ).toUpperCase();

  const isProjectManager =
    isAdmin ||
    ['PROJECT_MANAGER', 'ADMIN', 'WORKSPACE_ADMIN', 'OWNER'].includes(currentRoleName) ||
    (project?.projectManagerId && String(project.projectManagerId) === String(currentUserId));

  const canManageMilestones = isProjectManager;
  const canManageReleases = isProjectManager;
  const canAttachIssues = isProjectManager || ['TEAM_LEAD', 'LEAD'].includes(currentRoleName);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4000);
  }, []);

  const loadAllProjectDataCore = useCallback(async (pId) => {
    if (!pId) return null;
    const now = Date.now();

    // 1. Fetch project core, summary, members, sprints, issues, polls, releases in parallel
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
    const sprintsData =
      sprintsRes.status === 'fulfilled' && Array.isArray(sprintsRes.value)
        ? sprintsRes.value
        : [];
    const issuesData =
      issuesRes.status === 'fulfilled'
        ? normalizeIssuePage(issuesRes.value).items
        : [];
    const pollsData =
      pollsRes.status === 'fulfilled' && Array.isArray(pollsRes.value) ? pollsRes.value : [];
    const releasesData =
      releasesRes.status === 'fulfilled'
        ? Array.isArray(releasesRes.value)
          ? releasesRes.value
          : releasesRes.value?.releases || releasesRes.value?.items || releasesRes.value?.data || []
        : [];

    // 2. Fetch milestones from project milestones API with timeline fallback
    let milestoneList = [];
    try {
      const msRes = await getProjectMilestones(pId).catch(() => null);
      if (msRes) {
        milestoneList = Array.isArray(msRes)
          ? msRes
          : msRes.milestones || msRes.items || msRes.data || [];
      }
      if (milestoneList.length === 0) {
        const tlRes = await getProjectTimeline(pId).catch(() => null);
        const groups = tlRes?.groups || (Array.isArray(tlRes) ? tlRes : []);
        const msGroups = groups.filter((g) => String(g?.type || '').toUpperCase() === 'MILESTONE');
        if (msGroups.length > 0) {
          milestoneList = msGroups.map((g) => ({
            id: g.id || g.groupId,
            name: g.name || g.title,
            targetDate: g.endDate || g.date || g.startDate,
            status: g.status || 'PLANNED',
          }));
        }
      }
    } catch {
      milestoneList = [];
    }

    // 3. Fetch activity history from recent issues
    const recentIssues = [...issuesData]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 5);

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

    // Supplement with milestone/issue lifecycle if history is brief
    if (gatheredActivities.length < 4) {
      issuesData.slice(0, 6).forEach((iss) => {
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
            id: `done-${iss.id}`,
            actor: assignee,
            action: `Completed task ${issueKey}`,
            timestamp: iss.updatedAt,
          });
        } else if (iss.createdAt) {
          gatheredActivities.push({
            id: `created-${iss.id}`,
            actor: iss.reporter?.name || iss.creator?.name || assignee,
            action: `Created task ${issueKey}: ${iss.title || ''}`,
            timestamp: iss.createdAt,
          });
        }
      });
    }

    const formattedActivities = gatheredActivities
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4)
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
      milestones: milestoneList,
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
        setMilestones(data.milestones);
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
        setMilestones(data.milestones);
        setReleases(data.releases);
        setPolls(data.polls);
        setActivities(data.activities);
        const projectRepo = data.project?.githubRepository || data.project?.repository || data.project?.githubRepo;
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
    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB max
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
              : { ...r, fileName: file.name, fileUrl: updated || r.fileUrl };
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
    setMilestones((prev) => {
      const exists = prev.some((m) => String(m.id || m._id || m.milestoneId) === String(sId));
      if (exists) {
        return prev.map((m) => (String(m.id || m._id || m.milestoneId) === String(sId) ? { ...m, ...saved } : m));
      }
      return [saved, ...prev];
    });
    showToast('success', `Milestone "${saved?.name || 'Milestone'}" saved.`);
  };

  const handleMilestoneDeleted = (deletedId) => {
    setMilestones((prev) => prev.filter((m) => String(m.id || m._id || m.milestoneId) !== String(deletedId)));
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

  // Project progress is shown only when the project API provides a valid value.
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

  // Sprint Overview Gauge Data
  const sprintGaugeMetrics = useMemo(() => {
    let completed = summary?.resolvedIssues || 0;
    let inProgress = summary?.inProgressIssues || 0;
    let pending = summary?.openIssues || 0;

    if (!summary?.totalIssues && issues.length > 0) {
      completed = issues.filter((i) =>
        ['RESOLVED', 'CLOSED'].includes(String(i.status || '').toUpperCase())
      ).length;
      inProgress = issues.filter((i) =>
        String(i.status || '').toUpperCase() === 'IN_PROGRESS'
      ).length;
      pending = Math.max(0, issues.length - completed - inProgress);
    }

    const total = completed + inProgress + pending;
    const progressRate = total > 0 ? Math.round((completed / total) * 100) : null;
    const chartData = total > 0
      ? [
          { name: 'Completed', value: completed, color: '#38bdf8' },
          { name: 'In Progress', value: inProgress, color: '#0284c7' },
          { name: 'Pending', value: pending, color: '#334155' },
        ].filter((item) => item.value > 0)
      : [];

    const statusLabel =
      total === 0 ? 'Issue data unavailable' : activeSprintsCount > 0 ? 'Active Sprint' : project?.status === 'COMPLETED' ? 'Project Ended' : 'In Progress';

    return { progressRate, chartData, statusLabel };
  }, [summary, issues, activeSprintsCount, project?.status]);

  // Recent Poll (First poll in the list)
  const recentPoll = useMemo(() => {
    if (!polls || polls.length === 0) return null;
    return polls[0];
  }, [polls]);

  const handleVoteInRecentPoll = async (pollId, optionId) => {
    if (!pollId || !optionId) return;
    try {
      const updated = await voteInPoll(pollId, optionId);
      showToast('success', 'Your vote was recorded!');
      setPolls((prev) =>
        prev.map((p) => {
          const pid = p.id || p._id || p.pollId;
          return pid === pollId ? { ...p, ...updated } : p;
        })
      );
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'poll'));
    }
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
      {/* Toast Notice */}
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

      {/* Top Breadcrumb & Controls */}
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

      {/* Error Alert */}
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

      {/* Hero Header and Project Summary */}
      <section className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left: Folder Icon + Title + Description */}
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

          {/* Right: Overall Progress Bar */}
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

        {/* Hero Bottom Row: Schedule a meeting + Summary PDF + Project Manager + 4 Metric Cards */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#2d2d34] flex flex-col xl:flex-row xl:items-center justify-between gap-5 flex-wrap">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsMeetingModalOpen(true)}
              className="rounded-full bg-[#42b4d6] hover:bg-[#38a0bf] text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 shadow-sm transition shrink-0 cursor-pointer"
            >
              Schedule a meeting
            </button>

            <button
              type="button"
              onClick={handleDownloadSummaryPdf}
              disabled={isDownloadingPdf}
              title="Download project summary PDF report"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#383842] bg-slate-100 dark:bg-[#222228] hover:bg-slate-200 dark:hover:bg-[#2b2b32] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-semibold text-xs sm:text-sm px-4 py-2.5 shadow-xs transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <FiDownload size={14} className="text-sky-500 dark:text-sky-400" />
              )}
              <span>{isDownloadingPdf ? 'Exporting PDF...' : 'Summary PDF'}</span>
            </button>

            {/* Project Manager Avatar and Name */}
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

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            {/* Active Sprints */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d34] bg-slate-50 dark:bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-[#2f2249] text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FiRepeat size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  Active sprints
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : activeSprintsCount}
                </span>
              </div>
            </div>

            {/* Active Issues */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d34] bg-slate-50 dark:bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-[#432328] text-rose-700 dark:text-[#F87171] flex items-center justify-center shrink-0">
                <FiAlertTriangle size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  Active issues
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : activeIssuesCount}
                </span>
              </div>
            </div>

            {/* My Tasks */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d34] bg-slate-50 dark:bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-[#2f2249] text-indigo-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FiFolder size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  My tasks
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : myTasksCount}
                </span>
              </div>
            </div>

            {/* Polls */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d34] bg-slate-50 dark:bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px] shadow-2xs">
              <span className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-[#2f2249] text-sky-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FiBarChart2 size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">
                  Polls
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : polls.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {viewingAllPolls ? (
        /* Dedicated Full Polls View when "View all" is clicked */
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
        /* Standard Overview Dashboard */
        <div className="space-y-6">
          {/* Top Row: Project Information + Upcoming Milestones (Recently Assigned Tasks Removed) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Project Information Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-5">
                  Project Information
                </h2>
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Project Name</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right truncate max-w-[220px]">
                      {project?.name || 'Unnamed project'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Description</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right truncate max-w-[220px]">
                      {project?.description || 'No description provided.'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Status</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right capitalize">
                      {project?.status ? String(project.status).toLowerCase().replace(/_/g, ' ') : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Project manager</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right truncate max-w-[220px]">
                      {projectManagerName}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Team leader</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right truncate max-w-[220px]">
                      {teamLeadName}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Start date</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right">
                      {project?.startDate ? formatDate(project.startDate) : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Target end date</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right">
                      {project?.deadline ? formatDate(project.deadline) : '—'}
                    </span>
                  </div>
                  <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-[#27272e]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Schedule report</span>
                    <button
                      type="button"
                      onClick={handleDownloadSummaryPdf}
                      disabled={isDownloadingPdf}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition cursor-pointer disabled:opacity-50"
                    >
                      <FiDownload size={13} />
                      <span>{isDownloadingPdf ? 'Downloading...' : 'Download PDF Summary'}</span>
                    </button>
                  </div>
                  <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-[#27272e]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <FiGithub size={14} className="text-slate-600 dark:text-slate-300" />
                      <span>GitHub Repository</span>
                    </span>
                    {linkedRepo ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-semibold text-xs font-mono bg-slate-100 dark:bg-[#25252c] px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#32323a] truncate max-w-[150px]">
                          {linkedRepo.owner}/{linkedRepo.repository}
                        </span>
                        {canManageMilestones && (
                          <button
                            type="button"
                            onClick={handleUnlinkRepository}
                            disabled={isUnlinkingRepo}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 hover:underline cursor-pointer font-medium disabled:opacity-50"
                          >
                            {isUnlinkingRepo ? 'Unlinking…' : 'Unlink'}
                          </button>
                        )}
                      </div>
                    ) : (
                      canManageMilestones && (
                        <button
                          type="button"
                          onClick={() => setIsLinkRepoModalOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition cursor-pointer"
                        >
                          <FiPlus size={13} />
                          <span>Link Repository</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Milestones Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs flex flex-col justify-between">
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
                    <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700/60 max-h-[260px] overflow-y-auto pr-1">
                      {milestones.slice(0, showAllMilestones ? undefined : 4).map((m, idx) => {
                        const mId = m.id || m._id || m.milestoneId || idx;
                        const statusInfo = getMilestoneStatusInfo(m.status);
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
                              {canManageMilestones && (
                                <div className="flex items-center opacity-70 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMilestone(m);
                                      setIsMilestoneModalOpen(true);
                                    }}
                                    title="Edit Milestone"
                                    className="p-1 rounded text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-[#25252c] transition cursor-pointer"
                                  >
                                    <FiEdit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeletingMilestone(m);
                                      setIsDeleteMilestoneOpen(true);
                                    }}
                                    title="Delete Milestone"
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                  >
                                    <FiTrash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {milestones.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllMilestones((prev) => !prev)}
                        className="mt-3 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition cursor-pointer"
                      >
                        {showAllMilestones ? 'Show fewer' : `View all (${milestones.length})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Row: Sprint Overview + Recent Activity + Recent Poll */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Sprint Overview Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Sprint overview</h2>
                  <Link
                    to="/dashboard/sprints"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition flex items-center gap-1"
                  >
                    View all <FiArrowRight size={13} />
                  </Link>
                </div>

                {/* Semi-Circle Gauge */}
                <div className="relative h-[155px] w-full flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sprintGaugeMetrics.chartData}
                        cx="50%"
                        cy="80%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={65}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {sprintGaugeMetrics.chartData.map((entry, index) => (
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
                      {sprintGaugeMetrics.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3.5 text-[11px] mt-4 pt-2 border-t border-slate-100 dark:border-[#2d2d34]">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Completed
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#0284c7]" /> In Progress
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-[#334155]" /> Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs flex flex-col justify-between">
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
                )}
              </div>
            </div>

            {/* Recent Poll Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Recent Poll</h2>
                  <button
                    type="button"
                    onClick={() => setViewingAllPolls(true)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    View all <FiArrowRight size={13} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-8 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : !recentPoll ? (
                  <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">No active polls</p>
                    <p className="text-xs mt-1">Create a poll to collect team votes on decisions.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-3 leading-snug">
                      Q. {recentPoll.question || 'Which approach should we finalize?'}
                    </p>

                    <div className="space-y-2.5">
                      {(recentPoll.options || []).map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const votes = opt.voteCount ?? opt.votes ?? 0;
                        const totalVotes =
                          recentPoll.totalVotes ||
                          (recentPoll.options || []).reduce(
                            (acc, o) => acc + (o.voteCount ?? o.votes ?? 0),
                            0
                          ) ||
                          1;
                        const barPct = Math.max(
                          Math.round((votes / totalVotes) * 100),
                          votes > 0 ? 8 : 2
                        );
                        const isClosed =
                          recentPoll.status === 'CLOSED' || recentPoll.closed === true;

                        return (
                          <div
                            key={opt.id || opt._id || idx}
                            onClick={() =>
                              !isClosed &&
                              handleVoteInRecentPoll(recentPoll.id || recentPoll._id, opt.id || opt._id)
                            }
                            className={`flex items-center gap-2.5 group ${
                              !isClosed ? 'cursor-pointer' : ''
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-700 dark:text-white w-3 text-center shrink-0">
                              {letter}
                            </span>
                            <div className="flex-1 h-3.5 rounded-md bg-slate-100 dark:bg-[#2a2a32] overflow-hidden p-0.5 border border-slate-200/60 dark:border-transparent">
                              <div
                                className={`h-full rounded-sm transition-all duration-300 ${
                                  idx % 2 === 0 ? 'bg-[#7dd3fc]' : 'bg-[#38bdf8]'
                                } group-hover:brightness-110`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 w-4 text-right shrink-0">
                              {votes}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Under Dashboard: Project Sprints (Top 5 + View all) */}
          <section className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <FiRepeat size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Sprints</h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sprints.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Planned and active sprint cycles for this project.
                  </p>
                </div>
              </div>

              <Link
                to="/dashboard/sprints"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#35353d] bg-slate-50 dark:bg-[#26262c] hover:bg-slate-100 dark:hover:bg-[#32323a] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                <span>View all</span>
                <FiArrowRight size={13} />
              </Link>
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
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
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

          {/* Under Dashboard: Project Issues (Top 5 + View all + Create Issue) */}
          <section className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <FiAlertTriangle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Issues</h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {issues.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tasks and defects logged for {project?.name || 'this project'}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateIssueOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                >
                  <FiPlus size={14} />
                  <span>Create Issue</span>
                </button>
                <Link
                  to={`/dashboard/issues?projectId=${projectId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#35353d] bg-slate-50 dark:bg-[#26262c] hover:bg-slate-100 dark:hover:bg-[#32323a] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <span>View all</span>
                  <FiArrowRight size={13} />
                </Link>
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
                <button
                  type="button"
                  onClick={() => setIsCreateIssueOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                >
                  <FiPlus size={13} /> Create Issue
                </button>
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

          {/* Under Dashboard: Project Releases */}
          <section className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs space-y-4">
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
                {canManageReleases && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRelease(null);
                      setIsReleaseModalOpen(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <FiPlus size={14} /> Create First Release
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {releases.map((release, idx) => {
                  const rId = release.id || release._id || release.releaseId || idx;
                  const releaseName = release.name || release.version || `Release ${idx + 1}`;
                  const rDate = release.releaseDate || release.date;
                  const attachedIssues = release.issues || release.issueIds || release.releaseIssues || [];
                  const issueCount = Array.isArray(attachedIssues) ? attachedIssues.length : 0;
                  const fileUrl = release.fileUrl || release.artifactUrl || release.downloadUrl;
                  const fileName = release.fileName || release.filename || (fileUrl ? 'artifact-file' : null);
                  const isUploadingThis = String(uploadingReleaseId) === String(rId);

                  return (
                    <div
                      key={rId}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-[#1b1b1f] border border-slate-200/80 dark:border-[#2d2d34] hover:border-slate-300 dark:hover:border-[#3b3b44] transition space-y-3"
                    >
                      {/* Release Header */}
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

                        {canManageReleases && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRelease(release);
                                setIsReleaseModalOpen(true);
                              }}
                              title="Edit Release"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-[#27272e] transition cursor-pointer"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingRelease(release);
                                setIsDeleteReleaseOpen(true);
                              }}
                              title="Delete Release"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Release Description */}
                      {release.description && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {release.description}
                        </p>
                      )}

                      {/* Interactive Meta Bars: Issues & File Artifact */}
                      <div className="pt-2 border-t border-slate-200/80 dark:border-[#2d2d34] flex flex-wrap items-center justify-between gap-3 text-xs">
                        {/* Attached Issues info */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Attached Issues:</span>
                          <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-white dark:bg-[#25252c] border border-slate-200 dark:border-[#32323a]">
                            {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                          </span>
                          {canAttachIssues && (
                            <button
                              type="button"
                              onClick={() => {
                                setAttachingRelease(release);
                                setIsAttachIssuesOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline cursor-pointer ml-1"
                            >
                              <FiPlus size={12} /> Attach / Manage Issues
                            </button>
                          )}
                        </div>

                        {/* File Artifact info & upload */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {fileUrl ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 font-semibold text-xs transition"
                              >
                                <FiDownload size={13} />
                                <span className="truncate max-w-[150px]">{fileName || 'Download Artifact'}</span>
                              </a>
                              {canManageReleases && (
                                <label className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer underline ml-1">
                                  <span>{isUploadingThis ? 'Uploading...' : 'Replace file'}</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={isUploadingThis}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleUploadReleaseArtifact(rId, f);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          ) : (
                            canManageReleases && (
                              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 dark:border-[#3a3a44] bg-white dark:bg-[#24242b] hover:bg-slate-100 dark:hover:bg-[#2e2e36] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition cursor-pointer shadow-xs">
                                {isUploadingThis ? (
                                  <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                  <FiUploadCloud size={14} className="text-cyan-600 dark:text-cyan-400" />
                                )}
                                <span>{isUploadingThis ? 'Uploading (max 100MB)...' : 'Upload Artifact (S3)'}</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={isUploadingThis}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUploadReleaseArtifact(rId, f);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* GitHub Contributions & Code Activity */}
          <ProjectContributionsSection
            projectId={projectId}
            linkedRepo={linkedRepo}
            canManage={canManageMilestones}
            onOpenLinkModal={() => setIsLinkRepoModalOpen(true)}
            onUnlinkRepo={handleUnlinkRepository}
            isUnlinkingRepo={isUnlinkingRepo}
          />

          {/* Under Dashboard: Project Members (with Add Member) */}
          <section className="rounded-3xl border border-slate-200/90 dark:border-[#2d2d34] bg-white dark:bg-[#171717] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FiUsers size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Project Members</h3>
                    <span className="rounded-full bg-slate-100 dark:bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {members.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Collaborators assigned to work on this project.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]"
              >
                <FiUserPlus size={15} />
                <span>Add Member</span>
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 rounded-xl bg-slate-100 dark:bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No members assigned yet
                </p>
                <p className="text-xs mt-1">
                  Add collaborators to this project so they can receive task assignments and participate in sprints.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]"
                >
                  <FiUserPlus size={14} /> Add First Member
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {members.map((member, idx) => {
                  const memberUser = member.user || member;
                  const memberUserId = member.userId || member.id || member._id || memberUser.id || memberUser._id;
                  const name = member.name || memberUser.name || member.email?.split('@')[0] || memberUser.email?.split('@')[0] || 'Member';
                  const email = member.email || memberUser.email || '';
                  const memberAvatar = member.profilePictureUrl || member.avatarUrl || memberUser.profilePictureUrl || memberUser.avatarUrl || '';
                  const role = member.role || member.projectRole || memberUser.role || 'CONTRIBUTOR';
                  const roleLabel = formatProjectRoleLabel(role);
                  const roleBadgeClass = getRoleBadge(role);
                  const isRemoving = removingMemberId === memberUserId;

                  return (
                    <div
                      key={memberUserId || email || idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#171717] border border-slate-200/80 dark:border-[#2d2d34] hover:border-slate-300 dark:hover:border-[#3d3d46] transition gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-xs text-white shadow-xs"
                          style={{ backgroundColor: getAvatarColor(name || email) }}
                        >
                          {getInitials(name || email)}
                          {memberAvatar && (
                            <img
                              src={memberAvatar}
                              alt={name}
                              className="absolute inset-0 h-full w-full rounded-full object-cover"
                              onError={(event) => event.currentTarget.remove()}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {name}
                            </p>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${roleBadgeClass}`}
                            >
                              {roleLabel}
                            </span>
                          </div>
                          {email && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-50"
                        >
                          {isRemoving ? (
                            <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <FiTrash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modals */}
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

      {isAddMemberModalOpen && (
        <AddProjectMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          projectId={projectId}
          projectName={project?.name || 'Project'}
          existingMembers={members}
          onMemberAdded={(added) => {
            showToast('success', `${added?.name || added?.email || 'Member'} was added.`);
            reloadData();
          }}
        />
      )}

      <CreateIssueModal
        isOpen={isCreateIssueOpen}
        onClose={() => setIsCreateIssueOpen(false)}
        projects={project ? [project] : []}
        defaultProjectId={projectId}
        onIssueCreated={(created) => {
          showToast('success', `“${created?.title || 'Issue'}” was created.`);
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

      {/* Milestone Modals */}
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

      {/* Release Modals */}
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
    </div>
  );
};

export default ProjectDetailsView;
