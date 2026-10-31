import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  FiUser,
  FiBell,
  FiShield,
  FiLink,
  FiAlertTriangle,
  FiLogOut,
  FiChevronDown,
  FiLayers,
  FiEdit2,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiUsers,
  FiGithub,
  FiShare2,
} from 'react-icons/fi';
import profileBanner from '../../../assets/profile-banner.png';
import { clearAuthStorage, logoutUser, sendForgotPasswordOtp, getFriendlyErrorMessage as getAuthErrorMessage } from '../../auth/services/authApi';
import { deleteMyAccount, getProfile } from '../services/profileApi';
import {
  getMyWorkspace,
  updateWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  restoreWorkspace,
  getWorkspaceMembers,
  getFriendlyErrorMessage,
} from '../services/workspaceApi';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notificationApi';
import {
  getGoogleConnectUrl,
  disconnectGoogleCalendar,
} from '../../calendar/services/calendarApi';
import {
  getGithubConnectUrl,
  disconnectGithub,
} from '../../projects/services/projectApi';
import { sendInvite, formatExpiryToUtc } from '../../invites/services/inviteApi';
import { CiLock } from "react-icons/ci";


const DEFAULT_PREFERENCES = [
  {
    type: 'ISSUE_ASSIGNED', title: 'Issue assigned', description: 'When an issue is assigned to you.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'ISSUE_ASSIGNMENT_REQUESTED', title: 'Issue assignment requested', description: 'When someone requests assignment to an issue you manage.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'ISSUE_REQUEST_APPROVED', title: 'Issue request approved', description: 'When your issue assignment request is approved.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'ISSUE_REQUEST_REJECTED', title: 'Issue request rejected', description: 'When your issue assignment request is rejected.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'ISSUE_RESOLVED', title: 'Issue resolved', description: 'When an issue you follow is resolved.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'ISSUE_REVIEW_APPROVED', title: 'Issue review approved', description: 'When your issue review is approved.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'ISSUE_REVIEW_REJECTED', title: 'Issue review rejected', description: 'When your issue review is rejected.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'PROJECT_MEMBER_ADDED', title: 'Project member added', description: 'When someone is added to a project you manage.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'PROJECT_ROLE_CHANGED', title: 'Project role changed', description: 'When your role in a project changes.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'COMMENT_ADDED', title: 'Comment added', description: 'When someone comments on an issue you follow.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'MENTION', title: 'Mentions', description: 'When someone mentions you in a discussion.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'SPRINT_ASSIGNED', title: 'Sprint assigned', description: 'When a sprint is assigned to you.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'SPRINT_ASSIGNMENT_REQUESTED', title: 'Sprint assignment requested', description: 'When someone requests assignment to a sprint you manage.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'MEETING_INVITE', title: 'Meeting invitations', description: 'When you are invited to a meeting.', inApp: true, email: false, emailSupported: false,
  },
  {
    type: 'POLL_CREATED', title: 'Poll created', description: 'When a poll is created in one of your projects.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'INVITE_RECEIVED', title: 'Workspace invitations', description: 'When you are invited to join a workspace or project.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'INVITE_ACCEPTED', title: 'Invitation responses', description: 'When an invite you sent is accepted by a teammate.', inApp: true, email: false, emailSupported: true,
  },
  {
    type: 'CHAT_MESSAGE', title: 'Direct and channel messages', description: 'Real-time chat alerts from team discussions.', inApp: true, email: false, emailSupported: false,
  },
];

const SettingsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUserProfile, refreshCurrentUserProfile, isLoadingUserProfile } = useOutletContext() || {};

  
  const [expandedSection, setExpandedSection] = useState(() => {
    const hasConnectParam =
      new URLSearchParams(window.location.search).has('github') ||
      new URLSearchParams(window.location.search).has('google');
    return {
      notifications: false,
      security: false,
      connected: hasConnectParam,
      danger: false,
      workspace: false,
    };
  });

  
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [savingPreferenceKey, setSavingPreferenceKey] = useState('');
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesNotice, setPreferencesNotice] = useState('');

  
  const [workspace, setWorkspace] = useState(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [renameInput, setRenameInput] = useState('');
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isRestoringWorkspace, setIsRestoringWorkspace] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [workspaceMembersCount, setWorkspaceMembersCount] = useState(0);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [transferEmail, setTransferEmail] = useState('');
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  const isWorkspaceAdmin = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER'].includes(
    String(currentUserProfile?.role || currentUserProfile?.user?.role || '').toUpperCase()
  );

  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState(() => location.state?.passwordResetSuccess
    ? { type: 'success', text: 'Your password was reset successfully.' }
    : { type: '', text: '' });
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);

  
  const [isGoogleConnected, setIsGoogleConnected] = useState(() => {
    if (typeof currentUserProfile?.googleConnected === 'boolean') {
      return currentUserProfile.googleConnected;
    }
    return (
      localStorage.getItem('frietSyncGoogleConnected') === 'true' ||
      new URLSearchParams(window.location.search).get('google') === 'connected'
    );
  });
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);

  
  const [isGithubConnected, setIsGithubConnected] = useState(() => {
    if (typeof currentUserProfile?.githubConnected === 'boolean') {
      return currentUserProfile.githubConnected;
    }
    return (
      localStorage.getItem('frietSyncGithubConnected') === 'true' ||
      new URLSearchParams(window.location.search).get('github') === 'connected'
    );
  });
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isDisconnectingGithub, setIsDisconnectingGithub] = useState(false);

  
  useEffect(() => {
    if (currentUserProfile) {
      Promise.resolve().then(() => {
        if (typeof currentUserProfile.googleConnected === 'boolean') {
          setIsGoogleConnected(currentUserProfile.googleConnected);
        }
        if (typeof currentUserProfile.githubConnected === 'boolean') {
          setIsGithubConnected(currentUserProfile.githubConnected);
        }
      });
      if (typeof currentUserProfile.googleConnected === 'boolean') {
        if (currentUserProfile.googleConnected) {
          localStorage.setItem('frietSyncGoogleConnected', 'true');
        } else {
          localStorage.removeItem('frietSyncGoogleConnected');
        }
      }
      if (typeof currentUserProfile.githubConnected === 'boolean') {
        if (currentUserProfile.githubConnected) {
          localStorage.setItem('frietSyncGithubConnected', 'true');
        } else {
          localStorage.removeItem('frietSyncGithubConnected');
        }
      }
    }
  }, [currentUserProfile]);

  
  useEffect(() => {
    const githubParam = searchParams.get('github');
    const googleParam = searchParams.get('google');

    if (githubParam) {
      if (githubParam === 'connected') {
        localStorage.setItem('frietSyncGithubConnected', 'true');
        Promise.resolve().then(() => {
          setIsGithubConnected(true);
          setStatusMessage({ type: 'success', text: 'GitHub account connected successfully.' });
          setExpandedSection((prev) => ({ ...prev, connected: true }));
          refreshCurrentUserProfile?.();
        });
      } else if (githubParam === 'denied') {
        Promise.resolve().then(() => {
          setStatusMessage({ type: 'error', text: 'GitHub connection was denied.' });
          setExpandedSection((prev) => ({ ...prev, connected: true }));
        });
      } else if (githubParam === 'failed') {
        Promise.resolve().then(() => {
          setStatusMessage({ type: 'error', text: 'GitHub connection failed. Please try again.' });
          setExpandedSection((prev) => ({ ...prev, connected: true }));
        });
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('github');
      setSearchParams(newParams, { replace: true });
    }

    if (googleParam) {
      if (googleParam === 'connected') {
        localStorage.setItem('frietSyncGoogleConnected', 'true');
        Promise.resolve().then(() => {
          setIsGoogleConnected(true);
          setStatusMessage({ type: 'success', text: 'Google Calendar successfully connected.' });
          setExpandedSection((prev) => ({ ...prev, connected: true }));
          refreshCurrentUserProfile?.();
        });
      } else if (googleParam === 'denied') {
        Promise.resolve().then(() => {
          setStatusMessage({ type: 'error', text: 'Google Calendar connection was denied.' });
          setExpandedSection((prev) => ({ ...prev, connected: true }));
        });
      } else if (googleParam === 'failed') {
        Promise.resolve().then(() => {
          setStatusMessage({ type: 'error', text: 'Google Calendar connection failed. Please try again.' });
          setExpandedSection((prev) => ({ ...prev, connected: true }));
        });
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('google');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshCurrentUserProfile]);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const url = await getGoogleConnectUrl();
      if (url && typeof url === 'string') {
        window.location.href = url;
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to initiate Google Calendar connection.',
      });
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsDisconnectingGoogle(true);
    try {
      await disconnectGoogleCalendar();
      setIsGoogleConnected(false);
      localStorage.removeItem('frietSyncGoogleConnected');
      setStatusMessage({
        type: 'success',
        text: 'Google Calendar disconnected successfully.',
      });
      await refreshCurrentUserProfile?.();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to disconnect Google Calendar.',
      });
    } finally {
      setIsDisconnectingGoogle(false);
    }
  };

  const handleConnectGithub = async () => {
    setIsConnectingGithub(true);
    try {
      const url = await getGithubConnectUrl();
      if (url && typeof url === 'string') {
        window.location.href = url;
      } else {
        throw new Error('GitHub authorization URL was not returned by server.');
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to initiate GitHub connection.',
      });
      setIsConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    setIsDisconnectingGithub(true);
    try {
      await disconnectGithub();
      setIsGithubConnected(false);
      localStorage.removeItem('frietSyncGithubConnected');
      setStatusMessage({
        type: 'success',
        text: 'GitHub account disconnected successfully.',
      });
      await refreshCurrentUserProfile?.();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to disconnect GitHub account.',
      });
    } finally {
      setIsDisconnectingGithub(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (isRequestingPasswordReset) return;
    setIsRequestingPasswordReset(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const profile = currentUserProfile || await getProfile();
      const email = profile?.email?.trim();
      if (!email) throw new Error('Your account email could not be found. Please try again later.');
      await sendForgotPasswordOtp(email);
      navigate('/dashboard/settings/reset-password', { state: { email } });
    } catch (error) {
      setStatusMessage({ type: 'error', text: getAuthErrorMessage(error, 'forgot-password') });
    } finally {
      setIsRequestingPasswordReset(false);
    }
  };

  
  const loadPreferences = useCallback(async () => {
    setIsLoadingPreferences(true);
    setPreferencesError('');
    try {
      const serverPrefs = await getNotificationPreferences();
      const serverByType = new Map((Array.isArray(serverPrefs) ? serverPrefs : []).map((item) => [item.type, item]));
      setPreferences(DEFAULT_PREFERENCES.map((item) => {
        const found = serverByType.get(item.type);
        return found ? {
          ...item,
          inApp: found.inApp ?? item.inApp,
          email: item.emailSupported ? (found.email ?? item.email) : false,
        } : item;
      }));
    } catch (err) {
      console.warn('Failed to fetch notification preferences:', err);
      setPreferencesError(err.message || 'Failed to load notification preferences.');
    } finally {
      setIsLoadingPreferences(false);
    }
  }, []);

  const saveNotificationPreference = async (type, channel, enabled) => {
    const key = `${type}:${channel}`;
    const previous = preferences.find((item) => item.type === type)?.[channel];
    setPreferences((current) => current.map((item) => item.type === type ? { ...item, [channel]: enabled } : item));
    setSavingPreferenceKey(key);
    setPreferencesError('');
    setPreferencesNotice('');
    try {
      const updated = await updateNotificationPreferences([{ type, [channel]: enabled }]);
      const savedPreference = Array.isArray(updated) ? updated.find((item) => item.type === type) : null;
      if (savedPreference) {
        setPreferences((current) => current.map((item) => item.type === type ? {
          ...item,
          inApp: savedPreference.inApp ?? item.inApp,
          email: item.emailSupported ? (savedPreference.email ?? item.email) : false,
        } : item));
      }
      setPreferencesNotice('Notification preference saved.');
    } catch (err) {
      setPreferences((current) => current.map((item) => item.type === type ? { ...item, [channel]: previous } : item));
      setPreferencesError(err.message || 'Failed to save notification preference.');
    } finally {
      setSavingPreferenceKey('');
    }
  };

  const toggleSection = (key) => {
    setExpandedSection((prev) => {
      const nextState = !prev[key];
      if (key === 'notifications' && nextState) {
        loadPreferences();
      }
      return {
        ...prev,
        [key]: nextState,
      };
    });
  };



  useEffect(() => {
    let isMounted = true;
    getMyWorkspace()
      .then((ws) => {
        if (!isMounted) return;
        if (ws && (ws.name || ws.id || ws._id)) {
          setWorkspace(ws);
          setRenameInput(ws.name || '');
          const wid = ws.id || ws._id || ws.workspaceId;
          getWorkspaceMembers(wid).then((m) => {
            if (isMounted && Array.isArray(m)) {
              setWorkspaceMembersCount(m.length);
              setWorkspaceMembers(m);
            }
          }).catch(() => {});
        } else {
          setWorkspace(null);
          setRenameInput('');
        }
      })
      .catch((err) => {
        console.warn('Failed to load workspace:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingWorkspace(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  
  const handleUpdateWorkspaceName = async (e) => {
    e.preventDefault();
    if (!renameInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Workspace name cannot be empty.' });
      return;
    }

    if (renameInput.trim() === workspace?.name) {
      setStatusMessage({ type: 'info', text: 'Workspace name is already up to date.' });
      return;
    }

    setIsUpdatingWorkspace(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const updated = await updateWorkspace({
        name: renameInput.trim(),
        workspaceId: workspace?.id || workspace?._id,
      });
      const newName = updated?.name || renameInput.trim();
      setWorkspace((prev) => ({ ...prev, name: newName }));
      setStatusMessage({
        type: 'success',
        text: `Workspace renamed to "${newName}" successfully!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'workspace'),
      });
    } finally {
      setIsUpdatingWorkspace(false);
    }
  };

  
  const handleLeaveWorkspace = async () => {
    setIsLeavingWorkspace(true);
    setStatusMessage({ type: '', text: '' });

    try {
      await leaveWorkspace();
      setWorkspace(null);
      setShowLeaveConfirm(false);
      setStatusMessage({
        type: 'success',
        text: 'You have left the workspace.',
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'workspace'),
      });
    } finally {
      setIsLeavingWorkspace(false);
    }
  };

  
  const handleRestoreWorkspace = async () => {
    setIsRestoringWorkspace(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const restored = await restoreWorkspace(workspace?.id || workspace?._id);
      setWorkspace((prev) => ({
        ...prev,
        ...restored,
        deletionRequestedAt: null,
        permanentlyDeleteAt: null,
      }));
      setStatusMessage({
        type: 'success',
        text: 'Workspace restored successfully! The 30-day deletion schedule has been cancelled.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'workspace'),
      });
    } finally {
      setIsRestoringWorkspace(false);
    }
  };

  
  const handleDeleteWorkspace = async () => {
    setIsDeletingWorkspace(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const res = await deleteWorkspace(workspace?.id || workspace?._id);
      setShowDeleteConfirm(false);
      const permDate = res?.permanentlyDeleteAt
        ? new Date(res.permanentlyDeleteAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'in 30 days';
      setWorkspace((prev) => ({
        ...prev,
        ...res,
        deletionRequestedAt: res?.deletionRequestedAt || new Date().toISOString(),
        permanentlyDeleteAt: res?.permanentlyDeleteAt || null,
      }));
      setStatusMessage({
        type: 'success',
        text: `Workspace scheduled for permanent deletion (${permDate}). You have a 30-day grace period to restore it.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'workspace'),
      });
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  
  const handleTransferOwnership = async (e) => {
    if (e) e.preventDefault();
    const email = transferEmail.trim();
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Please enter the email address to transfer ownership.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    const myEmail = (currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase().trim();
    if (myEmail && email.toLowerCase() === myEmail) {
      setStatusMessage({ type: 'error', text: "You cannot transfer workspace ownership to yourself." });
      return;
    }

    setIsTransferringOwnership(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const expiresAt = formatExpiryToUtc();
      await sendInvite({
        email,
        role: 'OWNER',
        purpose: 'OWNERSHIP_TRANSFER',
        expiresAt,
      });
      setTransferEmail('');
      setShowTransferConfirm(false);
      setStatusMessage({
        type: 'success',
        text: `Ownership transfer invitation sent to ${email} successfully.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to send ownership transfer invitation. Please try again.',
      });
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    setStatusMessage({ type: '', text: '' });
    try {
      await deleteMyAccount();
      clearAuthStorage();
      navigate('/');
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to delete your account. Please try again.',
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountConfirm(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-0 animate-fadeIn pb-12 px-3 sm:px-6 lg:px-8">
      {}
      <div
        className="min-h-[126px] sm:min-h-[128px] rounded-t-xl sm:rounded-t-2xl px-4 sm:px-5 py-5 sm:py-6 flex items-center relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${profileBanner})` }}
      >
        <div className="relative z-10 max-w-[58%]">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-xs text-white/90 mt-1">
            Manage your preferences, account details, and workspace settings.
          </p>
        </div>
      </div>

      {}
      {statusMessage.text && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-[#F87171]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
            ) : (
              <FiAlertCircle className="shrink-0 text-rose-600 dark:text-[#F87171]" size={17} />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage({ type: '', text: '' })}
            className="text-xs font-semibold opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {}
      <div className="space-y-3 bg-slate-100 dark:bg-[#1d1d1d] p-2 sm:p-2.5 rounded-b-xl sm:rounded-b-2xl">
        {}
        <button
          type="button"
          onClick={() => navigate('/dashboard/settings/profile')}
          className="w-full bg-white dark:bg-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#303030] rounded-xl p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-full text-slate-600 dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FiUser size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                Account
              </h2>
              <p className="text-sm text-slate-500 dark:text-white/80 truncate">
                Profile and personal info
              </p>
            </div>
          </div>
        </button>

        {}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('notifications')}
            className="w-full p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#303030] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-full text-slate-600 dark:text-white flex items-center justify-center shrink-0">
                <FiBell size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                  Notifications
                </h2>
                <p className="text-sm text-slate-500 dark:text-white/80 truncate">
                  Alerts and notification preferences
                </p>
              </div>
            </div>
            <div className="text-slate-500 dark:text-white/80">
              <FiChevronDown size={18} className={expandedSection.notifications ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </div>
          </button>

          {expandedSection.notifications && (
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#262833] bg-slate-50/50 dark:bg-[#15171d] animate-fadeIn space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Preferences
                  </h3>
                </div>
              </div>

              {preferencesError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  {preferencesError}
                </div>
              )}
              {preferencesNotice && !preferencesError && (
                <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{preferencesNotice}</p>
              )}

              {isLoadingPreferences ? (
                <div className="p-6 text-center text-slate-400 dark:text-[#858585] flex flex-col items-center justify-center">
                  <FiRefreshCw size={20} className="animate-spin mb-2" />
                  <span className="text-xs">Loading preferences...</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {preferences.map((item) => (
                    <div
                      key={item.type}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white p-3.5 dark:border-[#262833] dark:bg-[#181a20] sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5 leading-normal">
                            {item.description}
                          </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3">
                        {[
                          { channel: 'inApp', label: 'In-app' },
                          ...(item.emailSupported ? [{ channel: 'email', label: 'Email' }] : []),
                        ].map(({ channel, label }) => {
                          const enabled = Boolean(item[channel]);
                          const key = `${item.type}:${channel}`;
                          const isSaving = savingPreferenceKey === key;
                          return (
                            <div key={channel} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                aria-label={`${item.title} ${label} notifications`}
                                disabled={Boolean(savingPreferenceKey) || isLoadingPreferences}
                                onClick={() => saveNotificationPreference(item.type, channel, !enabled)}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#181a20] disabled:cursor-wait disabled:opacity-60 ${enabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                              >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                              <span className={`w-10 text-xs font-semibold ${enabled ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                {isSaving ? 'Saving' : enabled ? 'On' : 'Off'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('security')}
            className="w-full p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#303030] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-full text-slate-600 dark:text-white flex items-center justify-center shrink-0">
                <FiShield size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                  Privacy & Security
                </h2>
                <p className="text-sm text-slate-500 dark:text-white/80 truncate">
                  Privacy controls and account security
                </p>
              </div>
            </div>
            <div className="text-slate-500 dark:text-white/80">
              <FiChevronDown size={18} className={expandedSection.security ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </div>
          </button>

          {expandedSection.security && (
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#262833] bg-slate-50/50 dark:bg-[#15171d] animate-fadeIn space-y-3">
              <div className="p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className='flex gap-3'>
                   <CiLock size={18} />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Password</h4>
                    {}
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestPasswordReset}
                    disabled={isRequestingPasswordReset || isLoadingUserProfile}
                    className="shrink-0 rounded-full bg-sky-400 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-wait px-5 py-2 text-xs font-semibold text-slate-950 transition-colors"
                  >
                    {isRequestingPasswordReset ? 'Sending code...' : 'Reset Password'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-1">
                <Link
                  to="/privacy"
                  className="rounded-lg border border-slate-200 dark:border-[#30333d] px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#20232c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="rounded-lg border border-slate-200 dark:border-[#30333d] px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#20232c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  Terms of Service
                </Link>
              </div>

              {}
            </div>
          )}
        </div>

        {}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('connected')}
            className="w-full p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#303030] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-full text-slate-600 dark:text-white flex items-center justify-center shrink-0">
                <FiLink size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                  Connected Accounts
                </h2>
                <p className="text-sm text-slate-500 dark:text-white/80 truncate">
                  Linked accounts and integrations
                </p>
              </div>
            </div>
            <div className="text-slate-500 dark:text-white/80">
              <FiChevronDown size={18} className={expandedSection.connected ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </div>
          </button>

          {expandedSection.connected && (
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#262833] bg-slate-50/50 dark:bg-[#15171d] animate-fadeIn space-y-3">
              <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    G
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      Google Calendar
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94a3b8] truncate">
                      Sync meetings and project schedules with your Google account.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isGoogleConnected ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200/80 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                      <button
                        type="button"
                        onClick={handleDisconnectGoogle}
                        disabled={isDisconnectingGoogle}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        {isDisconnectingGoogle ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingGoogle}
                      className="inline-flex min-w-20 items-center justify-center rounded-lg border border-blue-700 bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-offset-[#181a20]"
                    >
                      {isConnectingGoogle ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>

              {}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center shrink-0">
                    <FiGithub size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      GitHub
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94a3b8] truncate">
                      Link your GitHub account to connect repositories and view project contributions.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isGithubConnected ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200/80 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                      <button
                        type="button"
                        onClick={handleDisconnectGithub}
                        disabled={isDisconnectingGithub}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        {isDisconnectingGithub ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGithub}
                      disabled={isConnectingGithub}
                      className="inline-flex min-w-20 items-center justify-center rounded-lg border border-blue-700 bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-offset-[#181a20]"
                    >
                      {isConnectingGithub ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-[#777] text-center pt-2">
                Additional third-party integrations with GitLab and Slack are in development.
              </p>
            </div>
          )}
        </div>

        {}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('danger')}
            className="w-full p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#303030] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-[#F87171] flex items-center justify-center shrink-0 shadow-2xs">
                <FiAlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-rose-900 dark:text-rose-400 truncate">
                  Danger Zone
                </h2>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5 truncate">
                  Account actions and logout
                </p>
              </div>
            </div>
            <div className="text-rose-400">
              <FiChevronDown size={18} className={expandedSection.danger ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </div>
          </button>

          {expandedSection.danger && (
            <div className="p-4 sm:p-6 border-t border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20 animate-fadeIn space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#181a20] border border-rose-200/60 dark:border-rose-900/40">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sign Out
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5">
                    Sign out of your active FrietSync account session on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#454545] bg-slate-100 dark:bg-[#242424] hover:bg-slate-200 dark:hover:bg-[#303030] text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <FiLogOut size={16} />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#181a20] border border-rose-200/60 dark:border-rose-900/40">
                <div>
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Delete Account</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5">
                    Your account will be deleted or deactivated according to the account service policy.
                  </p>
                </div>
                {!showDeleteAccountConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteAccountConfirm(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition cursor-pointer shrink-0"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDeleteAccountConfirm(false)}
                      disabled={isDeletingAccount}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#28282c] transition cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingAccount && <FiRefreshCw className="animate-spin" size={13} />}
                      {isDeletingAccount ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 text-[11px] text-rose-600/80 dark:text-rose-400/80 bg-rose-100/50 dark:bg-rose-950/30 rounded-xl leading-normal">
                Note: Account deletion follows the account service policy.
              </div>
            </div>
          )}
        </div>

        {}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('workspace')}
            className="w-full p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#303030] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#242428] text-slate-700 dark:text-[#e0e0e0] flex items-center justify-center shrink-0 shadow-2xs">
                <FiLayers size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Workspace Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5 truncate">
                  {workspace?.name || 'Workspace details and membership'}
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              <FiChevronDown size={18} className={expandedSection.workspace ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </div>
          </button>

          {expandedSection.workspace && (
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#262833] bg-slate-50/50 dark:bg-[#15171d] animate-fadeIn space-y-5">
              {isLoadingWorkspace ? (
                <div className="p-6 text-center text-slate-400">
                  <FiRefreshCw size={20} className="animate-spin mb-2 mx-auto" />
                  <span className="text-xs">Loading workspace details...</span>
                </div>
              ) : !workspace ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-500">No active workspace found.</p>
                </div>
              ) : (
                <>
                  {}
                  {Boolean(workspace?.deletionRequestedAt || workspace?.permanentlyDeleteAt) && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                        <FiAlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Workspace Scheduled for Deletion (30-Day Grace Period)</span>
                      </div>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        This workspace is soft-deleted and hidden from members. It is scheduled for permanent deletion on{' '}
                        <strong className="font-semibold text-amber-950 dark:text-amber-100">
                          {workspace.permanentlyDeleteAt
                            ? new Date(workspace.permanentlyDeleteAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'in 30 days'}
                        </strong>
                        . Workspace administrators can restore it at any time during this grace period.
                      </p>
                      {isWorkspaceAdmin && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleRestoreWorkspace}
                            disabled={isRestoringWorkspace}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            {isRestoringWorkspace ? <FiRefreshCw className="animate-spin" size={13} /> : <FiRotateCcw size={13} />}
                            <span>{isRestoringWorkspace ? 'Restoring Workspace...' : 'Restore Workspace'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{workspace.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
                        {workspaceMembersCount > 0 ? `${workspaceMembersCount} active workspace members` : 'Manage workspace team members'}
                      </p>
                    </div>
                    <Link
                      to="/dashboard/team"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222] transition shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <FiUsers size={13} />
                      <span>View Team ({workspaceMembersCount})</span>
                    </Link>
                  </div>

                  {}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833] space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                      <FiEdit2 size={16} />
                      <span>Rename Workspace</span>
                    </div>
                    <form onSubmit={handleUpdateWorkspaceName} className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        required
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        placeholder="Workspace name"
                        className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#131418] border border-slate-200 dark:border-[#2a2c36] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition"
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingWorkspace || !renameInput.trim()}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isUpdatingWorkspace ? 'Saving...' : 'Rename'}
                      </button>
                    </form>
                  </div>

                  {}
                  {isWorkspaceAdmin && (
                    <div className="p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833] space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                        <FiShare2 size={16} className="text-amber-500 shrink-0" />
                        <span>Transfer Workspace Ownership</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94a3b8] leading-relaxed">
                        Transfer full ownership of this workspace to another person.
                      </p>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!transferEmail.trim()) {
                            setStatusMessage({ type: 'error', text: 'Please enter the email address to transfer ownership.' });
                            return;
                          }
                          setShowTransferConfirm(true);
                        }}
                        className="space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="email"
                            required
                            value={transferEmail}
                            onChange={(e) => {
                              setTransferEmail(e.target.value);
                              if (showTransferConfirm) setShowTransferConfirm(false);
                            }}
                            placeholder="Email address"
                            list="transfer-members-list"
                            disabled={isTransferringOwnership}
                            className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#131418] border border-slate-200 dark:border-[#2a2c36] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
                          />
                          {Array.isArray(workspaceMembers) && workspaceMembers.length > 0 && (
                            <datalist id="transfer-members-list">
                              {workspaceMembers.map((m) => {
                                const email = m.email || m.user?.email || '';
                                const name = m.name || m.user?.name || '';
                                return email ? (
                                  <option key={m.id || m._id || email} value={email}>
                                    {name ? `${name} (${email})` : email}
                                  </option>
                                ) : null;
                              })}
                            </datalist>
                          )}

                          {!showTransferConfirm ? (
                            <button
                              type="submit"
                              disabled={isTransferringOwnership || !transferEmail.trim()}
                              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              Transfer Ownership
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setShowTransferConfirm(false)}
                                disabled={isTransferringOwnership}
                                className="px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#20232c] transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleTransferOwnership}
                                disabled={isTransferringOwnership}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                {isTransferringOwnership ? <FiRefreshCw className="animate-spin" size={13} /> : null}
                                <span>{isTransferringOwnership ? 'Transferring...' : 'Confirm Transfer'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {showTransferConfirm && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 animate-fadeIn">
                            Are you sure you want to transfer workspace ownership to <strong>{transferEmail.trim()}</strong>?
                          </div>
                        )}
                      </form>
                    </div>
                  )}

                  {}
                  <div className="space-y-3 pt-1">
                    {}
                    <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-rose-800 dark:text-[#F87171]">
                          Leave Workspace
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5 max-w-md">
                          Leaving removes your membership and access to all its projects, tasks, and boards.
                        </p>
                      </div>

                      {!showLeaveConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowLeaveConfirm(true)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition cursor-pointer shrink-0"
                        >
                          Leave
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowLeaveConfirm(false)}
                            className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#20232c] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleLeaveWorkspace}
                            disabled={isLeavingWorkspace}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {isLeavingWorkspace ? 'Leaving...' : 'Confirm'}
                          </button>
                        </div>
                      )}
                    </div>

                    {}
                    {isWorkspaceAdmin &&
                      !(workspace?.deletionRequestedAt || workspace?.permanentlyDeleteAt) && (
                        <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-300/70 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-rose-900 dark:text-[#F87171]">
                              Delete Workspace
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-[#94a3b8] mt-0.5 max-w-md">
                              Soft-delete this workspace. Scheduled for permanent deletion after 30 days. Deletion will be rejected if unfinished projects remain.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition cursor-pointer shrink-0"
                          >
                            Delete Workspace
                          </button>
                        </div>
                      )}
                  </div>

                  {}
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a1d] p-6 shadow-2xl border border-slate-200 dark:border-[#303030] space-y-4 text-left">
                        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50">
                            <FiAlertTriangle size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Workspace</h3>
                            <p className="text-xs text-slate-500">Soft deletion with 30-day recovery window</p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 dark:bg-[#232326] p-3 text-xs text-slate-600 dark:text-[#ccc] space-y-2 leading-relaxed">
                          <p>
                            Deleting <strong className="text-slate-900 dark:text-white">{workspace?.name}</strong> will:
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-[#aaa]">
                            <li>Immediately hide this workspace from all non-admin members.</li>
                            <li>Schedule permanent purge after <strong>30 days</strong>.</li>
                            <li>Be rejected by the server if active or unfinished projects remain.</li>
                            <li>Allow workspace admins to restore it anytime during the 30-day grace period.</li>
                          </ul>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeletingWorkspace}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#bbb] hover:bg-slate-100 dark:hover:bg-[#28282c] rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteWorkspace}
                            disabled={isDeletingWorkspace}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            {isDeletingWorkspace ? <FiRefreshCw className="animate-spin" size={12} /> : null}
                            <span>{isDeletingWorkspace ? 'Deleting...' : 'Confirm Soft Deletion'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
