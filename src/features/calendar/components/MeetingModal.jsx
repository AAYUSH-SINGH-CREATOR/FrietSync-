import { useState, useEffect } from 'react';
import { FiX, FiClock, FiCalendar, FiUsers, FiTag, FiFileText } from 'react-icons/fi';
import { getProjectMembers } from '../../projects/services/projectApi';
import { createMeeting, updateMeeting, getFriendlyErrorMessage } from '../services/calendarApi';

const toDateTimeLocalString = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const MeetingForm = ({
  onClose,
  meetingToEdit,
  initialDate,
  projects = [],
  onMeetingSaved,
}) => {
  const isEditing = Boolean(meetingToEdit?.id || meetingToEdit?.rawId);

  const [title, setTitle] = useState(() => meetingToEdit?.title || '');
  const [projectId, setProjectId] = useState(
    () => meetingToEdit?.projectId || (projects[0]?.id || projects[0]?._id || '')
  );
  const [agenda, setAgenda] = useState(
    () => meetingToEdit?.description || meetingToEdit?.rawItem?.agenda || ''
  );
  const [startAt, setStartAt] = useState(() => {
    if (meetingToEdit?.start) return toDateTimeLocalString(meetingToEdit.start);
    const defaultStart = initialDate ? new Date(initialDate) : new Date();
    if (!initialDate) defaultStart.setMinutes(defaultStart.getMinutes() > 30 ? 60 : 30, 0, 0);
    return toDateTimeLocalString(defaultStart);
  });
  const [endAt, setEndAt] = useState(() => {
    if (meetingToEdit?.end) return toDateTimeLocalString(meetingToEdit.end);
    const defaultStart = initialDate ? new Date(initialDate) : new Date();
    if (!initialDate) defaultStart.setMinutes(defaultStart.getMinutes() > 30 ? 60 : 30, 0, 0);
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
    return toDateTimeLocalString(defaultEnd);
  });
  const [attendeeIds, setAttendeeIds] = useState(() => {
    if (!meetingToEdit?.attendees) return [];
    return Array.isArray(meetingToEdit.attendees)
      ? meetingToEdit.attendees.map((a) => (typeof a === 'string' ? a : a.id || a._id || a.userId))
      : [];
  });

  const [projectMembers, setProjectMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  
  useEffect(() => {
    if (!projectId) return undefined;
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) setIsLoadingMembers(true);
    });

    getProjectMembers(projectId)
      .then((members) => {
        if (isMounted) setProjectMembers(Array.isArray(members) ? members : []);
      })
      .catch(() => {
        if (isMounted) setProjectMembers([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const toggleAttendee = (userId) => {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a meeting title.');
      return;
    }
    if (!projectId) {
      setErrorMsg('Please select a project for this meeting.');
      return;
    }
    if (!startAt || !endAt) {
      setErrorMsg('Start time and end time are required.');
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setErrorMsg('Please enter valid dates.');
      return;
    }

    if (endDate <= startDate) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    setIsSubmitting(true);

    const attendeeEmails = projectMembers
      .filter((member) => {
        const memberId = member.id || member._id || member.userId || member.user?.id || member.user?._id;
        return attendeeIds.some((id) => String(id) === String(memberId));
      })
      .map((member) => member.email || member.user?.email)
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      agenda: agenda.trim(),
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      attendeeIds,
      attendeeEmails,
    };

    try {
      if (isEditing) {
        const meetingId = meetingToEdit.rawId || meetingToEdit.id?.replace(/^meeting-/, '');
        await updateMeeting(meetingId, payload);
      } else {
        await createMeeting(projectId, payload);
      }
      onMeetingSaved();
      onClose();
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err, 'meeting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2f2f2f] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <FiCalendar size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Meeting' : 'Schedule Meeting'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#888]">
              {isEditing ? 'Update meeting timing and agenda' : 'Set up a new team sync or review'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition cursor-pointer"
        >
          <FiX size={18} />
        </button>
      </div>

      {}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Sprint Planning & Roadmap Review"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#181818] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            required
          />
        </div>

        {}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            <FiTag size={13} />
            <span>Project <span className="text-rose-500">*</span></span>
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={isEditing}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#181818] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition disabled:opacity-60 cursor-pointer"
          >
            {projects.map((p) => {
              const pid = p.id || p._id;
              return (
                <option key={pid} value={pid}>
                  {p.name}
                </option>
              );
            })}
          </select>
        </div>

        {}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <FiClock size={13} />
              <span>Starts <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#181818] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <FiClock size={13} />
              <span>Ends <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#181818] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              required
            />
          </div>
        </div>

        {}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            <FiFileText size={13} />
            <span>Agenda / Notes</span>
          </label>
          <textarea
            rows={3}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Outline the meeting discussion points..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#181818] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        {}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FiUsers size={13} />
              <span>Attendees</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">
              {attendeeIds.length} selected
            </span>
          </label>

          <div className="max-h-32 overflow-y-auto p-2 rounded-xl border border-gray-200 dark:border-[#333] bg-slate-50/50 dark:bg-[#181818] space-y-1">
            {isLoadingMembers ? (
              <p className="text-xs text-gray-400 p-2 text-center">Loading project members…</p>
            ) : projectMembers.length === 0 ? (
              <p className="text-xs text-gray-400 p-2 text-center">No project members found.</p>
            ) : (
              projectMembers.map((member) => {
                const uid = member.id || member._id || member.userId || member.user?.id || member.user?._id;
                const name = member.name || member.user?.name || member.email || 'Member';
                const email = member.email || member.user?.email || '';
                const isChecked = attendeeIds.includes(uid);

                return (
                  <label
                    key={uid}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white dark:hover:bg-[#252525] transition cursor-pointer text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p>
                      {email && <p className="text-[10px] text-gray-400 truncate">{email}</p>}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAttendee(uid)}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>

        {}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-[#2f2f2f]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sm shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </>
  );
};

const MeetingModal = ({
  isOpen,
  onClose,
  meetingToEdit = null,
  initialDate = null,
  projects = [],
  onMeetingSaved,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#383838] shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <MeetingForm
          key={meetingToEdit?.rawId || meetingToEdit?.id || 'new-meeting'}
          onClose={onClose}
          meetingToEdit={meetingToEdit}
          initialDate={initialDate}
          projects={projects}
          onMeetingSaved={onMeetingSaved}
        />
      </div>
    </div>
  );
};

export default MeetingModal;

