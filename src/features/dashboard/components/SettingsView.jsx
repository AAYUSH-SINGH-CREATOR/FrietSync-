import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
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
} from 'react-icons/fi';
import profileBanner from '../../../assets/profile-banner.png';
import { logoutUser, sendForgotPasswordOtp, getFriendlyErrorMessage as getAuthErrorMessage } from '../../auth/services/authApi';
import { getProfile } from '../services/profileApi';
import {
  getMyWorkspace,
  updateWorkspace,
  leaveWorkspace,
  getFriendlyErrorMessage,
} from '../services/workspaceApi';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notificationApi';
import { CiLock } from "react-icons/ci";


const DEFAULT_PREFERENCES = [
  // {
  //   type: 'PROJECT_UPDATES',
  //   title: 'Project updates',
  //   description: 'Notifications when milestones, sprints, or project statuses change.',
  //   inApp: true,
  //   email: false,
  // },
  // {
  //   type: 'TASK_ASSIGNMENT',
  //   title: 'Task assignment',
  //   description: 'Alerts when issues or tasks are assigned to you or updated.',
  //   inApp: true,
  //   email: true,
  // },
  // {
  //   type: 'MENTIONS',
  //   title: 'Mentions',
  //   description: 'When teammates mention you in project comments or chats.',
  //   inApp: true,
  //   email: false,
  // },
  // {
  //   type: 'COMMENTS',
  //   title: 'Comments',
  //   description: 'Activity and replies on issues and sprints you are following.',
  //   inApp: true,
  //   email: false,
  // },
  // {
  //   type: 'EMAIL_NOTIFICATIONS',
  //   title: 'Email Notification',
  //   description: 'Weekly digest summaries and important workspace updates.',
  //   inApp: false,
  //   email: true,
  // },
];

const SettingsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserProfile, isLoadingUserProfile } = useOutletContext() || {};

  // Expanded categories state
  const [expandedSection, setExpandedSection] = useState({
    notifications: false,
    security: false,
    connected: false,
    danger: false,
    workspace: false,
  });

  // Notification Preferences State
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [updatingPrefKey, setUpdatingPrefKey] = useState(null);

  // Workspace Management State
  const [workspace, setWorkspace] = useState(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [renameInput, setRenameInput] = useState('');
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Account State
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState(() => location.state?.passwordResetSuccess
    ? { type: 'success', text: 'Your password was reset successfully.' }
    : { type: '', text: '' });
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);

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

  // Load Notification Preferences
  const loadPreferences = useCallback(async () => {
    setIsLoadingPreferences(true);
    try {
      const serverPrefs = await getNotificationPreferences();
      if (Array.isArray(serverPrefs) && serverPrefs.length > 0) {
        setPreferences((prev) =>
          prev.map((item) => {
            const found = serverPrefs.find((sp) => sp.type === item.type);
            return found
              ? {
                  ...item,
                  inApp: found.inApp ?? item.inApp,
                  email: found.email ?? item.email,
                }
              : item;
          })
        );
      }
    } catch (err) {
      console.warn('Failed to fetch notification preferences:', err);
    } finally {
      setIsLoadingPreferences(false);
    }
  }, []);

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

  // Handle Toggle Notification Preference
  const handleTogglePreference = async (type, channel) => {
    const prevPreferences = [...preferences];
    const key = `${type}-${channel}`;
    setUpdatingPrefKey(key);

    // Optimistic update
    const updated = preferences.map((p) => {
      if (p.type === type) {
        return {
          ...p,
          [channel]: !p[channel],
        };
      }
      return p;
    });
    setPreferences(updated);

    try {
      // Call PUT /notifications/preferences
      const payload = updated.map((p) => ({
        type: p.type,
        inApp: p.inApp,
        email: p.email,
      }));
      await updateNotificationPreferences(payload);
    } catch (err) {
      console.error('Failed to update preference:', err);
      // Rollback on failure
      setPreferences(prevPreferences);
      setStatusMessage({
        type: 'error',
        text: 'Failed to update notification preference. Please try again.',
      });
    } finally {
      setUpdatingPrefKey(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getMyWorkspace()
      .then((ws) => {
        if (!isMounted) return;
        if (ws && (ws.name || ws.id || ws._id)) {
          setWorkspace(ws);
          setRenameInput(ws.name || '');
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

  // Rename Workspace
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

  // Leave Workspace
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

  // Handle Logout
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

  return (
    <div className="w-full min-w-0 space-y-0 animate-fadeIn pb-12">
      {/* Branded Header Banner */}
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

      {/* Status Notice */}
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

      {/* Main Settings Category List */}
      <div className="space-y-3 bg-slate-100 dark:bg-[#1d1d1d] p-2 sm:p-2.5 rounded-b-xl sm:rounded-b-2xl">
        {/* Category 1: Account (Navigates to Profile) */}
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

        {/* Category 2: Notifications (Expandable) */}
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
                <div className="flex items-center gap-6 text-[11px] font-semibold text-slate-400 uppercase pr-2">
                  <span>In-App</span>
                  <span>Email</span>
                </div>
              </div>

              {isLoadingPreferences ? (
                <div className="p-6 text-center text-slate-400 dark:text-[#858585] flex flex-col items-center justify-center">
                  <FiRefreshCw size={20} className="animate-spin mb-2" />
                  <span className="text-xs">Loading preferences...</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {preferences.map((item) => {
                    const isUpdatingInApp = updatingPrefKey === `${item.type}-inApp`;
                    const isUpdatingEmail = updatingPrefKey === `${item.type}-email`;

                    return (
                      <div
                        key={item.type}
                        className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833] flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5 leading-normal">
                            {item.description}
                          </p>
                        </div>

                        {/* Toggle Switches */}
                        <div className="flex items-center gap-6 shrink-0">
                          {/* In-App Toggle */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.inApp}
                            title={`${item.title} in-app alerts`}
                            disabled={isUpdatingInApp}
                            onClick={() => handleTogglePreference(item.type, 'inApp')}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                              item.inApp
                                ? 'bg-sky-600 dark:bg-blue-600'
                                : 'bg-slate-200 dark:bg-[#2b2e38]'
                            } ${isUpdatingInApp ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                item.inApp ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Email Toggle */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.email}
                            title={`${item.title} email notifications`}
                            disabled={isUpdatingEmail}
                            onClick={() => handleTogglePreference(item.type, 'email')}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                              item.email
                                ? 'bg-sky-600 dark:bg-blue-600'
                                : 'bg-slate-200 dark:bg-[#2b2e38]'
                            } ${isUpdatingEmail ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                item.email ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category 3: Privacy & Security (Expandable) */}
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
                    {/* <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1 leading-relaxed">
                      Reset your password using a verification code sent to your account email.
                    </p> */}
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

              {/* <div className="p-4 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262833]">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Two-Factor Authentication (2FA)
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1 leading-relaxed">
                  Multi-Factor Authentication and session revocation features are scheduled for the next workspace security update.
                </p>
              </div> */}
            </div>
          )}
        </div>

        {/* Category 4: Connected Accounts (Expandable) */}
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
            <div className="p-6 border-t border-slate-100 dark:border-[#262833] bg-slate-50/50 dark:bg-[#15171d] animate-fadeIn text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#20232c] text-slate-400 dark:text-[#94a3b8] mx-auto flex items-center justify-center mb-3">
                <FiLink size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                No Accounts Connected
              </p>
              <p className="text-xs text-slate-400 dark:text-[#858585] mt-1 max-w-sm mx-auto leading-relaxed">
                You do not currently have any third-party accounts linked. Third-party integrations with GitHub, GitLab, and Slack are in development.
              </p>
            </div>
          )}
        </div>

        {/* Category 5: Danger Zone (Expandable - LOGOUT ONLY, no fake deactivation/deletion) */}
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
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <FiLogOut size={16} />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>

              <div className="p-3 text-[11px] text-rose-600/80 dark:text-rose-400/80 bg-rose-100/50 dark:bg-rose-950/30 rounded-xl leading-normal">
                Note: Permanent account deactivation and deletion must be authorized by your workspace administrator.
              </div>
            </div>
          )}
        </div>

        {/* Category 6: Workspace Settings (Preserves Workspace Features) */}
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
                  {/* Rename Workspace Form */}
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

                  {/* Leave Workspace */}
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
