import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCamera,
  FiStar,
  FiChevronDown,
  FiX,
  FiCheck,
} from 'react-icons/fi';
import { getProfile, updateProfile, uploadAvatar } from '../services/profileApi';
import profileBanner from '../../../assets/profile-banner.png';
import defaultAvatar from '../../../assets/oggy-img.png';

const ROLE_OPTIONS = [
  'Contributor',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Engineer',
  'Project Manager',
  'Team Lead',
  'Admin',
];

const ProfileView = () => {
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    jobTitle: '',
    role: 'Contributor',
    skills: [],
    about: '',
    avatarUrl: defaultAvatar,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');

  useEffect(() => {
    let isMounted = true;
    getProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile({
          fullName: data.fullName || '',
          email: data.email || '',
          jobTitle: data.jobTitle || '',
          role: data.role || 'Contributor',
          skills: Array.isArray(data.skills) ? data.skills : [],
          about: data.about || '',
          avatarUrl: defaultAvatar,
        });
      })
      .catch(() => {
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const updated = await uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatarUrl: updated.avatarUrl }));
      setFeedbackMsg({ type: 'success', text: 'Avatar updated successfully!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to upload avatar.' });
    }
  };

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const trimmed = newSkillText.trim();
    if (trimmed && !profile.skills.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
    }
    setNewSkillText('');
    setIsAddingSkill(false);
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      await updateProfile(profile);
      setFeedbackMsg({ type: 'success', text: 'Changes saved successfully!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-[1098px] mx-auto pb-12">
      <div>
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-normal text-slate-300 hover:text-white transition group cursor-pointer"
        >
          <FiArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          <span>Back to Settings</span>
        </Link>
      </div>

      <div className="bg-[#171717] rounded-2xl border border-white/5 shadow-2xl overflow-hidden transition-all text-white">
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
              <div className="-mt-[88px] relative w-[247px] shrink-0 pb-7">
                <div className="w-[247px] h-[327px] rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl bg-[#1e293b]">
                  <img
                    src={profile.avatarUrl || defaultAvatar}
                    alt={profile.fullName || 'User Portrait'}
                    className="w-full h-full object-cover object-top"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change profile picture"
                    className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white text-slate-800 hover:bg-slate-100 shadow-md flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                  >
                    <FiCamera size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[190px] py-3 px-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shadow-2xl z-10">
                  <h3 className="text-lg font-semibold text-white tracking-tight truncate">
                    {profile.fullName || 'Arjun Mehta'}
                  </h3>
                  <p className="text-xs text-slate-200 mt-0.5 truncate">
                    {profile.jobTitle || 'Backend developer'}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <span className="inline-block px-5 py-1 rounded-full bg-[#252525] text-white text-[11px] font-medium border border-sky-400/40 shadow-xs">
                      {profile.role || 'Contributor'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-[247px] mt-4">
                <div className="flex items-center gap-2 text-white font-semibold text-lg mb-3">
                  <FiStar size={18} className="text-white" />
                  <span>Skills</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="group relative h-7 bg-white text-slate-900 rounded-full text-xs font-bold px-2 flex items-center justify-center shadow-xs transition select-none truncate"
                    >
                      <span className="truncate">{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        title={`Remove ${skill}`}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                      >
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}

                  {isAddingSkill ? (
                    <div className="col-span-1 h-7 bg-[#171717] border border-sky-400 rounded-full px-1.5 flex items-center justify-between">
                      <input
                        type="text"
                        value={newSkillText}
                        onChange={(e) => setNewSkillText(e.target.value)}
                        placeholder="Skill"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSkill(e);
                          if (e.key === 'Escape') setIsAddingSkill(false);
                        }}
                        className="w-10 bg-transparent text-white text-[11px] focus:outline-none px-0.5"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        <FiCheck size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(true)}
                      className="h-7 bg-[#6BBBEB] hover:bg-[#52aae0] text-slate-900 rounded-full text-xs font-bold px-2 flex items-center justify-center transition shadow-xs cursor-pointer"
                    >
                      <span>Add+</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6 pt-4 lg:pt-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  Personal Information
                </h2>

                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-white sm:w-24 shrink-0">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      placeholder="Enter full name"
                      disabled={isLoading}
                      className="flex-1 h-9 px-4 rounded-full bg-[#171717] border border-white/20 hover:border-white/30 text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-white sm:w-24 shrink-0">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="Enter email address"
                      disabled={isLoading}
                      className="flex-1 h-9 px-4 rounded-full bg-[#171717] border border-white/20 hover:border-white/30 text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-white sm:w-24 shrink-0">
                      Job title
                    </label>
                    <input
                      type="text"
                      value={profile.jobTitle}
                      onChange={(e) => handleChange('jobTitle', e.target.value)}
                      placeholder="e.g. Backend Developer"
                      disabled={isLoading}
                      className="flex-1 h-9 px-4 rounded-full bg-[#171717] border border-white/20 hover:border-white/30 text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <label className="text-sm font-normal text-white sm:w-24 shrink-0">
                      Role
                    </label>
                    <div className="relative flex-1">
                      <select
                        value={profile.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        disabled={isLoading}
                        className="w-full h-9 appearance-none px-4 pr-10 rounded-full bg-[#171717] border border-white/20 hover:border-white/30 text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition shadow-inner cursor-pointer"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#171717] text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown
                        size={15}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#252525] border border-white/5 space-y-2 shadow-xs">
                <h3 className="text-base font-semibold text-white">About</h3>
                <textarea
                  rows={4}
                  value={profile.about}
                  onChange={(e) => handleChange('about', e.target.value)}
                  placeholder="Tell the team about yourself, your expertise, and interests..."
                  disabled={isLoading}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-300 focus:outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-slate-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {feedbackMsg && (
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-xl ${
                        feedbackMsg.type === 'success'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {feedbackMsg.text}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSaving || isLoading}
                  className="w-[131px] h-[40px] rounded-full bg-[#007DFE] hover:bg-[#006FDF] active:bg-[#005ECE] text-white font-medium text-sm transition shadow-lg shadow-sky-600/30 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0 self-end sm:self-auto"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileView;
