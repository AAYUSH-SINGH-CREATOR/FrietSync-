import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCamera,
  FiStar,
} from 'react-icons/fi';
import { updateProfile, uploadAvatar } from '../services/profileApi';
import profileBanner from '../../../assets/profile-banner.png';
import defaultAvatar from '../../../assets/oggy-img.png';

const mapProfile = (data) => ({
  id: data?.id || '',
  workspaceId: data?.workspaceId || '',
  name: data?.name || '',
  email: data?.email || '',
  jobTitle: data?.jobTitle || '',
  role: data?.role || '',
  bio: data?.bio || '',
  githubUrl: data?.githubUrl || '',
  linkedinUrl: data?.linkedinUrl || '',
  portfolioUrl: data?.portfolioUrl || '',
  profilePictureUrl: data?.profilePictureUrl || '',
  skills: Array.isArray(data?.skills) ? data.skills : [],
});

const safeExternalUrl = (value) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
};

const ProfileView = () => {
  const fileInputRef = useRef(null);
  const {
    currentUserProfile,
    refreshCurrentUserProfile,
    isLoadingUserProfile,
    userProfileError,
  } = useOutletContext() || {};

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(() => mapProfile(currentUserProfile));
  const profile = isEditing ? draftProfile : mapProfile(currentUserProfile);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');

  useEffect(() => () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  const handleChange = (field, value) => {
    setDraftProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setFeedbackMsg({ type: 'error', text: 'Choose an image file to upload.' });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(previewUrl);
    setIsUploadingAvatar(true);
    setFeedbackMsg(null);
    try {
      await uploadAvatar(file);
      const refreshedProfile = await refreshCurrentUserProfile();
      setDraftProfile((prev) => ({ ...prev, profilePictureUrl: refreshedProfile?.profilePictureUrl || prev.profilePictureUrl }));
      setAvatarPreviewUrl('');
      setFeedbackMsg({ type: 'success', text: 'Avatar updated successfully!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (error) {
      setAvatarPreviewUrl('');
      setFeedbackMsg({ type: 'error', text: error?.message || 'Failed to upload avatar.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg(null);

    if (!profile.name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Name is required.' });
      setIsSaving(false);
      return;
    }

    try {
      await updateProfile(draftProfile);
      await refreshCurrentUserProfile();
      setFeedbackMsg({ type: 'success', text: 'Changes saved successfully!' });
      setIsEditing(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFeedbackMsg(null);
  };

  const handleStartEditing = () => {
    setDraftProfile(mapProfile(currentUserProfile));
    setIsEditing(true);
  };

  return (
    <div className="w-full min-w-0 space-y-4 animate-fadeIn pb-12">
      <div>
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-normal text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition group cursor-pointer"
        >
          <FiArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          <span>Back to Settings</span>
        </Link>
      </div>

      {isLoadingUserProfile && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200" role="status">
          Loading your profile…
        </p>
      )}
      {userProfileError && !currentUserProfile && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="alert">
          <span>{userProfileError}</span>
          <button type="button" onClick={() => refreshCurrentUserProfile().catch(() => {})} className="font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-white">
        <div className="relative h-[185px] w-full overflow-hidden bg-[#0C101B]">
          <img
            src={profileBanner}
            alt="Profile Banner"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-10 lg:px-16 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
              <div className="-mt-[88px] relative w-full max-w-[247px] shrink-0 pb-7">
                <div className="w-full h-[327px] rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl bg-[#1e293b]">
                  <img
                    src={avatarPreviewUrl || profile.profilePictureUrl || defaultAvatar}
                    alt={profile.name || 'Profile picture'}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = defaultAvatar;
                    }}
                    className="w-full h-full object-cover object-top"
                  />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      title="Change profile picture"
                      className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white text-slate-800 hover:bg-slate-100 shadow-md flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                    >
                      {isUploadingAvatar ? '…' : <FiCamera size={16} />}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[190px] py-3 px-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shadow-2xl z-10">
                  <h3 className="text-lg font-semibold text-white tracking-tight truncate">
                    {profile.name || 'Your name'}
                  </h3>
                  <p className="text-xs text-slate-200 mt-0.5 truncate">
                    {profile.jobTitle || 'Job title not set'}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <span className="inline-block px-5 py-1 rounded-full bg-[#252525] text-white text-[11px] font-medium border border-sky-400/40 shadow-xs">
                      {profile.role || 'Role not set'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[247px] mt-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-lg mb-3">
                  <FiStar size={18} className="text-slate-600 dark:text-white" />
                  <span>Skills</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {profile.skills.length > 0 ? profile.skills.map((skill) => (
                    <span key={skill} className="h-7 bg-white text-slate-900 rounded-full text-xs font-bold px-2 flex items-center justify-center shadow-xs truncate">
                      {skill}
                    </span>
                  )) : (
                    <p className="col-span-3 text-xs text-slate-500 dark:text-slate-400">No skills listed.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6 pt-4 lg:pt-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  Personal Information
                </h2>

                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-slate-700 dark:text-white sm:w-24 shrink-0">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter full name"
                      disabled={!isEditing || isLoadingUserProfile}
                      className="flex-1 h-9 px-4 rounded-full bg-slate-50 dark:bg-[#171717] border border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-slate-700 dark:text-white sm:w-24 shrink-0">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="Enter email address"
                      disabled
                      className="flex-1 h-9 px-4 rounded-full bg-slate-50 dark:bg-[#171717] border border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-slate-700 dark:text-white sm:w-24 shrink-0">
                      Job title
                    </label>
                    <input
                      type="text"
                      value={profile.jobTitle}
                      onChange={(e) => handleChange('jobTitle', e.target.value)}
                      placeholder="e.g. Backend Developer"
                      disabled={!isEditing || isLoadingUserProfile}
                      className="flex-1 h-9 px-4 rounded-full bg-slate-50 dark:bg-[#171717] border border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-slate-700 dark:text-white sm:w-24 shrink-0">
                      Role
                    </label>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={profile.role}
                        disabled
                        className="w-full h-9 appearance-none px-4 rounded-full bg-slate-100 dark:bg-[#171717] border border-slate-300 dark:border-white/20 text-slate-600 dark:text-white text-xs sm:text-sm shadow-inner"
                      />
                    </div>
                  </div>

                  {[
                    ['GitHub URL', 'githubUrl'],
                    ['LinkedIn URL', 'linkedinUrl'],
                  ].map(([label, field]) => (
                    <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <label className="text-sm font-normal text-slate-700 dark:text-white sm:w-24 shrink-0">{label}</label>
                      {isEditing ? (
                        <input
                          type="url"
                          value={profile[field]}
                          onChange={(e) => handleChange(field, e.target.value)}
                          placeholder="https://"
                          disabled={isLoadingUserProfile}
                          className="flex-1 h-9 px-4 rounded-full bg-slate-50 dark:bg-[#171717] border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                        />
                      ) : safeExternalUrl(profile[field]) ? (
                        <a href={safeExternalUrl(profile[field])} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-sm text-sky-700 dark:text-sky-300 hover:underline">{profile[field]}</a>
                      ) : (
                        <span className="flex-1 text-sm text-slate-400 dark:text-slate-500">Not provided</span>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <span className="text-sm font-normal text-slate-700 dark:text-white sm:w-24 shrink-0">Portfolio</span>
                    {safeExternalUrl(profile.portfolioUrl) ? (
                      <a href={safeExternalUrl(profile.portfolioUrl)} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-sm text-sky-700 dark:text-sky-300 hover:underline">{profile.portfolioUrl}</a>
                    ) : (
                      <span className="flex-1 text-sm text-slate-400 dark:text-slate-500">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-white/5 space-y-2 shadow-xs">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">About</h3>
                <textarea
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell the team about yourself, your expertise, and interests..."
                  disabled={!isEditing || isLoadingUserProfile}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {feedbackMsg && (
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-xl ${
                        feedbackMsg.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                      }`}
                    >
                      {feedbackMsg.text}
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving || isUploadingAvatar}
                      className="h-10 px-4 rounded-full border border-slate-300 dark:border-[#454545] text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-100 dark:hover:bg-[#252525] transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isLoadingUserProfile || isUploadingAvatar}
                      className="w-[131px] h-[40px] rounded-full bg-[#007DFE] hover:bg-[#006FDF] active:bg-[#005ECE] text-white font-medium text-sm transition shadow-lg shadow-sky-600/30 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0"
                    >
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLoadingUserProfile || !currentUserProfile}
                    onClick={handleStartEditing}
                    className="w-[131px] h-[40px] rounded-full bg-[#007DFE] hover:bg-[#006FDF] active:bg-[#005ECE] text-white font-medium text-sm transition shadow-lg shadow-sky-600/30 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0 self-end sm:self-auto"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileView;
