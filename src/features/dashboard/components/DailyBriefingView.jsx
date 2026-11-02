import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiActivity, FiAlertCircle, FiBell, FiCalendar, FiCheck, FiClock, FiMail, FiRefreshCw, FiSettings } from 'react-icons/fi';
import { getBriefing, getBriefingPreferences, updateBriefingPreferences } from '../services/briefingApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const LIST_SECTIONS = [
  { key: 'overdue', title: 'Overdue', hint: 'Needs attention', color: 'rose' },
  { key: 'dueToday', title: 'Due today', hint: 'On your plate today', color: 'amber' },
  { key: 'dueSoon', title: 'Coming up', hint: 'Due soon', color: 'sky' },
  { key: 'assignedTasks', title: 'Assigned to you', hint: 'Your open tasks', color: 'violet' },
  { key: 'newIssues', title: 'New issues', hint: 'Recently added', color: 'emerald' },
  { key: 'completedYesterday', title: 'Completed yesterday', hint: 'Nice progress', color: 'teal' },
];
const colorClasses = {
  rose: 'border-rose-200 dark:border-rose-500/20', amber: 'border-amber-200 dark:border-amber-500/20',
  sky: 'border-sky-200 dark:border-sky-500/20', violet: 'border-violet-200 dark:border-violet-500/20',
  emerald: 'border-emerald-200 dark:border-emerald-500/20', teal: 'border-teal-200 dark:border-teal-500/20',
};
const dateLabel = (value, options = { day: 'numeric', month: 'short' }) => {
  if (!value) return 'No due date';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, options);
};
const unwrapPreferenceFallback = (value) => ({
  deliveryTime: value?.deliveryTime || '09:00',
  timeZone: value?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  emailEnabled: value?.emailEnabled ?? true,
});

const DailyBriefingView = () => {
  const [briefing, setBriefing] = useState(null);
  const [preferences, setPreferences] = useState(unwrapPreferenceFallback());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const timeZones = useMemo(() => {
    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return [...new Set([preferences.timeZone, localZone, 'UTC', ...zones].filter(Boolean))];
  }, [preferences.timeZone]);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryResult, preferencesResult] = await Promise.allSettled([getBriefing(true), getBriefingPreferences()]);
      if (summaryResult.status === 'rejected') throw summaryResult.reason;
      setBriefing(summaryResult.value || {});
      if (preferencesResult.status === 'fulfilled') setPreferences(unwrapPreferenceFallback(preferencesResult.value));
    } catch (loadError) {
      setError(getFriendlyErrorMessage(loadError, 'briefing'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBriefing(); }, [loadBriefing]);

  const savePreferences = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const saved = await updateBriefingPreferences(preferences);
      setPreferences(unwrapPreferenceFallback(saved));
      setNotice('Your daily briefing preferences are saved.');
    } catch (saveError) {
      setError(getFriendlyErrorMessage(saveError, 'briefing'));
    } finally {
      setSaving(false);
    }
  };

  const issueCount = (key) => Array.isArray(briefing?.[key]) ? briefing[key].length : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-10 text-slate-900 dark:text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">Your day, at a glance</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Daily Briefing</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{briefing?.date ? dateLabel(briefing.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'A focused summary of what matters today.'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowPreferences((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:border-sky-400 dark:border-[#35353d] dark:bg-[#202026]"><FiSettings /> Preferences</button>
          <button type="button" onClick={loadBriefing} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:border-sky-400 disabled:opacity-50 dark:border-[#35353d] dark:bg-[#202026]"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</div>}

      {showPreferences && <form onSubmit={savePreferences} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#303038] dark:bg-[#1f1f25] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Delivery time<input type="time" value={preferences.deliveryTime} onChange={(event) => setPreferences((current) => ({ ...current, deliveryTime: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-[#35353d] dark:bg-[#202026] dark:text-white" /></label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Time zone<select value={preferences.timeZone} onChange={(event) => setPreferences((current) => ({ ...current, timeZone: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-[#35353d] dark:bg-[#202026] dark:text-white">{timeZones.map((zone) => <option value={zone} key={zone}>{zone}</option>)}</select></label>
        <label className="flex h-10 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={preferences.emailEnabled} onChange={(event) => setPreferences((current) => ({ ...current, emailEnabled: event.target.checked }))} className="h-4 w-4 accent-sky-600" /><FiMail /> Email delivery</label>
        <button type="submit" disabled={saving} className="h-10 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save preferences'}</button>
      </form>}

      <section className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-sm dark:border-sky-500/20 dark:from-[#172536] dark:via-[#1f1f25] dark:to-[#211e35] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-bold text-sky-700 dark:border-sky-500/20 dark:bg-white/5 dark:text-sky-300"><FiActivity /> TODAY’S OVERVIEW</span><h2 className="mt-4 text-xl font-bold sm:text-2xl">{briefing?.headline || (loading ? 'Preparing your briefing…' : `Good day${briefing?.userName ? `, ${briefing.userName}` : ''}`)}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">A concise snapshot of your work, deadlines, and team activity.</p></div>
          <div className="flex gap-3"><div className="min-w-28 rounded-2xl border border-white bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5"><span className="block text-xs text-slate-500 dark:text-slate-400">Open issues</span><strong className="mt-1 block text-2xl">{loading ? '—' : briefing?.openIssues ?? 0}</strong></div><div className="min-w-28 rounded-2xl border border-white bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5"><span className="block text-xs text-slate-500 dark:text-slate-400">Completed</span><strong className="mt-1 block text-2xl">{loading ? '—' : briefing?.completedIssues ?? 0}</strong></div></div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {LIST_SECTIONS.map((section) => <section key={section.key} className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-[#1f1f25] ${colorClasses[section.color]}`}>
            <div className="mb-3 flex items-start justify-between gap-2"><div><h3 className="font-bold">{section.title}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{section.hint}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-white/10">{loading ? '—' : issueCount(section.key)}</span></div>
            {loading ? <p className="py-3 text-sm text-slate-400">Loading…</p> : issueCount(section.key) === 0 ? <p className="py-3 text-sm text-slate-400">Nothing here right now.</p> : <ul className="divide-y divide-slate-100 dark:divide-white/5">{briefing[section.key].slice(0, 5).map((issue, index) => <li key={issue.id || index} className="py-2.5 first:pt-1"><div className="flex items-start justify-between gap-3"><p className="min-w-0 text-sm font-medium leading-snug">{issue.issueNumber ? <span className="mr-1.5 text-xs text-slate-400">#{issue.issueNumber}</span> : null}{issue.title || 'Untitled issue'}</p><span className="shrink-0 text-[11px] text-slate-500">{dateLabel(issue.dueDate)}</span></div><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{String(issue.status || 'OPEN').replace(/_/g, ' ')} · {String(issue.priority || 'NORMAL').replace(/_/g, ' ')}</p></li>)}</ul>}
          </section>)}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#303038] dark:bg-[#1f1f25]"><h3 className="flex items-center gap-2 font-bold"><FiCalendar className="text-sky-500" /> Upcoming meetings</h3>{loading ? <p className="mt-4 text-sm text-slate-400">Loading…</p> : (briefing?.upcomingMeetings || []).length === 0 ? <p className="mt-4 text-sm text-slate-400">No upcoming meetings.</p> : <ul className="mt-3 space-y-3">{briefing.upcomingMeetings.slice(0, 5).map((meeting) => <li key={meeting.meetingId} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-sm font-semibold">{meeting.title || 'Untitled meeting'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><FiClock />{new Date(meeting.startAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p>{meeting.agenda && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{meeting.agenda}</p>}</li>)}</ul>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#303038] dark:bg-[#1f1f25]"><h3 className="flex items-center gap-2 font-bold"><FiBell className="text-amber-500" /> Project alerts <span className="ml-auto rounded-lg bg-slate-100 px-2 py-0.5 text-xs dark:bg-white/10">{loading ? '—' : briefing?.unreadNotifications ?? 0} unread</span></h3>{loading ? <p className="mt-4 text-sm text-slate-400">Loading…</p> : (briefing?.projectAlerts || []).length === 0 ? <p className="mt-4 text-sm text-slate-400">No project alerts.</p> : <ul className="mt-3 space-y-2">{briefing.projectAlerts.slice(0, 5).map((alert, index) => <li key={index} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><FiAlertCircle className="mt-0.5 shrink-0" />{alert}</li>)}</ul>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#303038] dark:bg-[#1f1f25]"><h3 className="flex items-center gap-2 font-bold"><FiCheck className="text-emerald-500" /> Project updates</h3>{loading ? <p className="mt-4 text-sm text-slate-400">Loading…</p> : (briefing?.projectUpdates || []).length === 0 ? <p className="mt-4 text-sm text-slate-400">No recent updates.</p> : <ul className="mt-3 space-y-3">{briefing.projectUpdates.slice(0, 6).map((update) => <li key={update.id} className="border-l-2 border-sky-400 pl-3"><p className="text-sm font-medium">{update.message || `${update.actorName || 'Someone'} updated ${update.resourceName || update.issueTitle || 'a project item'}`}</p><p className="mt-1 text-xs text-slate-500">{update.actorName && `${update.actorName} · `}{update.createdAt ? new Date(update.createdAt).toLocaleString() : 'Recently'}</p></li>)}</ul>}</section>
        </aside>
      </div>
    </div>
  );
};

export default DailyBriefingView;
