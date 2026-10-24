import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import CalendarHeader from '../components/CalendarHeader';
import MonthView from '../components/MonthView';
import WeekView from '../components/WeekView';
import DayView from '../components/DayView';
import AgendaView from '../components/AgendaView';
import MeetingModal from '../components/MeetingModal';
import EventDetailsModal from '../components/EventDetailsModal';
import { IssueDetailsModal } from '../../issues/components';
import { getMyProjects, getProjectMilestones } from '../../projects/services/projectApi';
import { getProjectIssues } from '../../issues/services/issueApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import {
  getMyMeetings,
  getProjectMeetings,
  getProjectCalendar,
  getGoogleConnectUrl,
  disconnectGoogleCalendar,
  normalizeMeetingEvent,
  normalizeIssueEvent,
  normalizeSprintEvent,
  normalizeMilestoneEvent,
  normalizeGenericCalendarEvent,
} from '../services/calendarApi';

const DEFAULT_CATEGORIES = ['meeting', 'issue', 'sprint', 'milestone', 'google'];

const CalendarView = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState('month');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [activeCategories, setActiveCategories] = useState(DEFAULT_CATEGORIES);

  const [rawEvents, setRawEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState(null);
  const [selectedDateForMeeting, setSelectedDateForMeeting] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  // Issue details modal state
  const [selectedIssueModal, setSelectedIssueModal] = useState({
    isOpen: false,
    issueId: null,
    projectName: '',
    initialIssue: null,
  });

  const { currentUserProfile, refreshCurrentUserProfile } = useOutletContext() || {};

  // Google Calendar OAuth status
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
  const [googleNotice, setGoogleNotice] = useState(null);

  // Synchronize Google connected status from profile
  useEffect(() => {
    if (currentUserProfile && typeof currentUserProfile.googleConnected === 'boolean') {
      Promise.resolve().then(() => {
        setIsGoogleConnected(currentUserProfile.googleConnected);
      });
      if (currentUserProfile.googleConnected) {
        localStorage.setItem('frietSyncGoogleConnected', 'true');
      } else {
        localStorage.removeItem('frietSyncGoogleConnected');
      }
    }
  }, [currentUserProfile]);

  // Check URL query parameters for Google OAuth callback results
  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (googleParam) {
      if (googleParam === 'connected') {
        localStorage.setItem('frietSyncGoogleConnected', 'true');
        Promise.resolve().then(() => {
          setIsGoogleConnected(true);
          setGoogleNotice({ type: 'success', message: 'Google Calendar successfully connected!' });
          refreshCurrentUserProfile?.();
        });
      } else if (googleParam === 'denied') {
        Promise.resolve().then(() => {
          setGoogleNotice({ type: 'error', message: 'Google Calendar connection was denied.' });
        });
      } else if (googleParam === 'failed') {
        Promise.resolve().then(() => {
          setGoogleNotice({ type: 'error', message: 'Google Calendar connection failed. Please try again.' });
        });
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('google');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshCurrentUserProfile]);

  // Load Projects
  useEffect(() => {
    let isMounted = true;
    getMyProjects()
      .then((data) => {
        if (isMounted) {
          const list = Array.isArray(data) ? data : data?.projects || [];
          setProjects(list);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user projects:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch all calendar data across accessible projects
  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Fetch user's direct meetings
      const myMeetingsPromise = getMyMeetings().catch(() => []);

      // 2. Resolve accessible projects
      let projectList = projects;
      if (!projectList || projectList.length === 0) {
        try {
          const pData = await getMyProjects();
          projectList = Array.isArray(pData) ? pData : pData?.projects || [];
          setProjects(projectList);
        } catch {
          projectList = [];
        }
      }

      // Filter projects to query based on selectedProject
      const targetProjects =
        selectedProject === 'all'
          ? projectList
          : projectList.filter((p) => (p.id || p._id) === selectedProject);

      // 3. For each target project, fetch its calendar resources in parallel
      const projectDataPromises = targetProjects.map(async (project) => {
        const pid = project.id || project._id;
        const pName = project.name || 'Project';

        const [pMeetings, pCal, pIssues, pSprints, pMilestones] = await Promise.all([
          getProjectMeetings(pid).catch(() => []),
          getProjectCalendar(pid).catch(() => []),
          getProjectIssues(pid, { page: 0, size: 50 }).catch(() => ({ items: [] })),
          getProjectSprints(pid).catch(() => []),
          getProjectMilestones(pid).catch(() => []),
        ]);

        const projectEvents = [];

        // Project Meetings
        if (Array.isArray(pMeetings)) {
          pMeetings.forEach((m) => {
            const ev = normalizeMeetingEvent(m, pName);
            if (ev) projectEvents.push(ev);
          });
        }

        // Project Calendar Events
        if (Array.isArray(pCal)) {
          pCal.forEach((c) => {
            const ev = normalizeGenericCalendarEvent(c, pName);
            if (ev) projectEvents.push(ev);
          });
        }

        // Issues with due dates
        const issueItems = pIssues?.items || (Array.isArray(pIssues) ? pIssues : []);
        issueItems.forEach((issue) => {
          if (issue.dueDate || issue.deadline) {
            const ev = normalizeIssueEvent(issue, pName);
            if (ev) projectEvents.push(ev);
          }
        });

        // Sprints
        if (Array.isArray(pSprints)) {
          pSprints.forEach((sprint) => {
            const ev = normalizeSprintEvent(sprint, pName);
            if (ev) projectEvents.push(ev);
          });
        }

        // Milestones
        if (Array.isArray(pMilestones)) {
          pMilestones.forEach((ms) => {
            const ev = normalizeMilestoneEvent(ms, pName);
            if (ev) projectEvents.push(ev);
          });
        }

        return projectEvents;
      });

      const [myMeetings, ...projectResults] = await Promise.all([
        myMeetingsPromise,
        ...projectDataPromises,
      ]);

      // Deduplicate all events by a stable composite key: `${sourceType}-${rawId}`
      const deduplicatedMap = new Map();

      // Insert personal meetings
      if (Array.isArray(myMeetings)) {
        myMeetings.forEach((m) => {
          const ev = normalizeMeetingEvent(m);
          if (ev && !deduplicatedMap.has(ev.id)) {
            deduplicatedMap.set(ev.id, ev);
          }
        });
      }

      // Insert all project events
      projectResults.flat().forEach((ev) => {
        if (ev && !deduplicatedMap.has(ev.id)) {
          deduplicatedMap.set(ev.id, ev);
        }
      });

      setRawEvents(Array.from(deduplicatedMap.values()));
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setErrorMessage(err?.message || 'Failed to load calendar events.');
    } finally {
      setIsLoading(false);
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) fetchCalendarData();
    });
    return () => {
      isMounted = false;
    };
  }, [fetchCalendarData]);

  // Filter events based on active category checkboxes
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((ev) => activeCategories.includes(ev.sourceType));
  }, [rawEvents, activeCategories]);

  // Calendar Navigation
  const handleNavigate = (direction) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === 'month' || view === 'agenda') {
        next.setMonth(next.getMonth() + direction);
      } else if (view === 'week') {
        next.setDate(next.getDate() + direction * 7);
      } else if (view === 'day') {
        next.setDate(next.getDate() + direction);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleToggleCategory = (catId) => {
    setActiveCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // Google Calendar Handlers
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setGoogleNotice(null);
    try {
      const url = await getGoogleConnectUrl();
      if (url && typeof url === 'string') {
        window.location.href = url;
      } else {
        throw new Error('Google authorization URL not returned by server.');
      }
    } catch (err) {
      setGoogleNotice({
        type: 'error',
        message: err?.message || 'Could not initiate Google connection.',
      });
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogleCalendar();
      setIsGoogleConnected(false);
      localStorage.removeItem('frietSyncGoogleConnected');
      setGoogleNotice({ type: 'success', message: 'Google Calendar disconnected.' });
      await refreshCurrentUserProfile?.();
    } catch (err) {
      setGoogleNotice({
        type: 'error',
        message: err?.message || 'Failed to disconnect Google Calendar.',
      });
    }
  };

  // Open Issue details modal
  const handleOpenIssueModal = (issueId, projectName, initialIssue) => {
    setSelectedIssueModal({
      isOpen: true,
      issueId,
      projectName,
      initialIssue,
    });
  };

  return (
    <div className="w-full min-w-0 space-y-4 animate-fadeIn pb-12">
      {/* Google Notice Banner */}
      {googleNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            googleNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-[#F87171]'
          }`}
        >
          <div className="flex items-center gap-2">
            {googleNotice.type === 'success' ? (
              <FiCheckCircle size={17} className="shrink-0 text-emerald-600 dark:text-[#34D399]" />
            ) : (
              <FiAlertCircle size={17} className="shrink-0 text-rose-600 dark:text-[#F87171]" />
            )}
            <span className="font-medium">{googleNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setGoogleNotice(null)}
            className="text-xs font-semibold opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Calendar Header Controls */}
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={handleNavigate}
        onToday={handleToday}
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        activeCategories={activeCategories}
        onToggleCategory={handleToggleCategory}
        onOpenCreateMeeting={() => {
          setMeetingToEdit(null);
          setSelectedDateForMeeting(new Date());
          setIsMeetingModalOpen(true);
        }}
        isGoogleConnected={isGoogleConnected}
        onConnectGoogle={handleConnectGoogle}
        onDisconnectGoogle={handleDisconnectGoogle}
        isConnectingGoogle={isConnectingGoogle}
      />

      {/* Main Calendar Views */}
      {isLoading && rawEvents.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] p-16 text-center shadow-xs flex flex-col items-center justify-center">
          <FiRefreshCw size={24} className="animate-spin text-sky-600 mb-3" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Loading your schedule…
          </p>
          <p className="text-xs text-gray-400 dark:text-[#777] mt-1">
            Aggregating meetings, sprints, milestones, and issues.
          </p>
        </div>
      ) : errorMessage && rawEvents.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-rose-600 mb-2">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchCalendarData}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEventDetails}
              onSelectDate={(date) => {
                setMeetingToEdit(null);
                setSelectedDateForMeeting(date);
                setIsMeetingModalOpen(true);
              }}
            />
          )}

          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEventDetails}
              onSelectDate={(date) => {
                setMeetingToEdit(null);
                setSelectedDateForMeeting(date);
                setIsMeetingModalOpen(true);
              }}
            />
          )}

          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEventDetails}
              onSelectDate={(date) => {
                setMeetingToEdit(null);
                setSelectedDateForMeeting(date);
                setIsMeetingModalOpen(true);
              }}
            />
          )}

          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEventDetails}
            />
          )}
        </>
      )}

      {/* Schedule / Edit Meeting Modal */}
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        meetingToEdit={meetingToEdit}
        initialDate={selectedDateForMeeting}
        projects={projects}
        onMeetingSaved={fetchCalendarData}
      />

      {/* Inspect Event Details Modal */}
      <EventDetailsModal
        isOpen={Boolean(selectedEventDetails)}
        onClose={() => setSelectedEventDetails(null)}
        event={selectedEventDetails}
        onEditMeeting={(ev) => {
          setSelectedEventDetails(null);
          setMeetingToEdit(ev);
          setIsMeetingModalOpen(true);
        }}
        onEventDeleted={fetchCalendarData}
        onOpenIssueModal={handleOpenIssueModal}
      />

      {/* Reused Issue Details Modal */}
      <IssueDetailsModal
        isOpen={selectedIssueModal.isOpen}
        onClose={() =>
          setSelectedIssueModal({
            isOpen: false,
            issueId: null,
            projectName: '',
            initialIssue: null,
          })
        }
        issueId={selectedIssueModal.issueId}
        projectName={selectedIssueModal.projectName}
        initialIssue={selectedIssueModal.initialIssue}
        onIssueUpdated={fetchCalendarData}
        onIssueDeleted={fetchCalendarData}
      />
    </div>
  );
};

export default CalendarView;
