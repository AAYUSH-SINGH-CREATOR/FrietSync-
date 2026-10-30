import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiX,
  FiCalendar,
  FiClock,
  FiTag,
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiCheckCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import { formatTime, deleteMeeting } from '../services/calendarApi';

const getSourceBadgeStyle = (sourceType) => {
  switch (sourceType) {
    case 'meeting':
      return 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800';
    case 'issue':
      return 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    case 'sprint':
      return 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    case 'milestone':
      return 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    case 'google':
      return 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    default:
      return 'bg-gray-100 dark:bg-[#252525] text-gray-800 dark:text-gray-200 border-gray-300 dark:border-[#444]';
  }
};

const EventDetailsModal = ({
  isOpen,
  onClose,
  event = null,
  onEditMeeting,
  onEventDeleted,
  onOpenIssueModal,
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !event) return null;

  const handleDeleteMeeting = async () => {
    setIsDeleting(true);
    setErrorMsg('');
    try {
      const meetingId = event.rawId || event.id?.replace(/^meeting-/, '');
      await deleteMeeting(meetingId);
      onEventDeleted();
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to delete meeting.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleOpenSourceDetails = () => {
    onClose();
    if (event.sourceType === 'issue') {
      if (onOpenIssueModal) {
        onOpenIssueModal(event.rawId, event.projectName, event.rawItem);
      } else {
        navigate('/dashboard/issues');
      }
    } else if (event.sourceType === 'sprint') {
      navigate('/dashboard/sprints');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#383838] shadow-2xl overflow-hidden animate-scaleUp select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2f2f2f] flex items-center justify-between">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getSourceBadgeStyle(
              event.sourceType
            )}`}
          >
            {event.sourceType}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
              {event.title}
            </h2>
            {event.projectName && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                <FiTag size={13} className="text-gray-400" />
                <span>{event.projectName}</span>
              </p>
            )}
          </div>

          {}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#181818] border border-gray-100 dark:border-[#282828] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FiCalendar size={14} className="text-sky-600 shrink-0" />
              <span className="font-semibold">
                {event.start.toLocaleDateString('default', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {!event.isAllDay && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FiClock size={14} className="text-sky-600 shrink-0" />
                <span>
                  {formatTime(event.start)} – {formatTime(event.end)}
                </span>
              </div>
            )}

            {event.status && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FiCheckCircle size={14} className="text-emerald-500 shrink-0" />
                <span className="capitalize">
                  Status: <strong className="text-gray-800 dark:text-gray-200">{event.status.toLowerCase().replace('_', ' ')}</strong>
                </span>
              </div>
            )}
          </div>

          {}
          {event.description ? (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                {event.sourceType === 'meeting' ? 'Agenda' : 'Details'}
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/50 dark:bg-[#181818]/60 p-3 rounded-xl border border-gray-100 dark:border-[#282828]">
                {event.description}
              </p>
            </div>
          ) : null}

          {}
          {event.sourceType === 'meeting' && event.attendees && event.attendees.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FiUsers size={13} />
                <span>Attendees ({event.attendees.length})</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {event.attendees.map((attendee, i) => {
                  const name =
                    typeof attendee === 'string'
                      ? attendee
                      : attendee.name || attendee.email || `Attendee ${i + 1}`;
                  return (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#252525] text-[11px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-[#333]"
                    >
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {}
          {showConfirmDelete && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <FiAlertTriangle size={14} />
                <span>Cancel this meeting?</span>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                This will remove the meeting and notify all project members.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333]"
                >
                  Keep Meeting
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMeeting}
                  disabled={isDeleting}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-[#2f2f2f] bg-gray-50/50 dark:bg-[#181818] flex items-center justify-between">
          {event.sourceType === 'meeting' ? (
            <>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 transition cursor-pointer"
              >
                <FiTrash2 size={13} />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onEditMeeting) onEditMeeting(event);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2b2b2b] border border-gray-200 dark:border-[#383838] transition cursor-pointer flex items-center gap-1.5"
                >
                  <FiEdit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </>
          ) : event.sourceType === 'issue' || event.sourceType === 'sprint' ? (
            <>
              <button
                type="button"
                onClick={handleOpenSourceDetails}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FiExternalLink size={13} />
                <span>Open in {event.sourceType === 'issue' ? 'Issues' : 'Sprints'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2b2b2b] transition cursor-pointer"
              >
                Close
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2b2b2b] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;

