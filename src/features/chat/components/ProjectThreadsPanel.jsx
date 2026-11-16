import { useCallback, useEffect, useRef, useState } from 'react';
import { FiArrowUp, FiChevronLeft, FiChevronRight, FiCornerUpRight, FiMessageSquare, FiPlus, FiSend, FiTrash2, FiX } from 'react-icons/fi';
import { addProjectThreadComment, createProjectThread, deleteProjectThread, getProjectThread, getProjectThreads, upvoteProjectThread } from '../services/threadApi';

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return !date || Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const ProjectThreadsPanel = ({ projectId, currentUserId, canManage = false, readOnly = false, onClose }) => {
  const [threads, setThreads] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [activeThread, setActiveThread] = useState(null);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [upvotedIds, setUpvotedIds] = useState(() => new Set());
  const [focusReplyAfterOpen, setFocusReplyAfterOpen] = useState(false);
  const commentInputRef = useRef(null);
  const upvoteStorageKey = `frietSyncProjectThreadUpvotes_${projectId}_${currentUserId || 'user'}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(upvoteStorageKey) || '[]');
      setUpvotedIds(new Set(saved.map(String)));
    } catch {
      setUpvotedIds(new Set());
    }
  }, [upvoteStorageKey]);

  useEffect(() => {
    if (activeThread && !activeThread.loading && focusReplyAfterOpen) {
      commentInputRef.current?.focus();
      setFocusReplyAfterOpen(false);
    }
  }, [activeThread, focusReplyAfterOpen]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getProjectThreads(projectId, page, 10);
      setThreads(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load project threads.');
    } finally { setLoading(false); }
  }, [projectId, page]);
  useEffect(() => { if (projectId) loadThreads(); }, [loadThreads, projectId]);

  const create = async (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) { setError('Add a title and content.'); return; }
    setSaving(true); setError('');
    try {
      await createProjectThread(projectId, { title: draft.title.trim(), content: draft.content.trim() });
      setDraft({ title: '', content: '' }); setCreating(false);
      if (page !== 0) setPage(0); else await loadThreads();
    } catch (err) { setError(err.response?.data?.message || err.message || 'Could not create thread.'); }
    finally { setSaving(false); }
  };

  const open = async (item, focusReply = false) => {
    setActiveThread({ ...item, loading: true }); setError(''); setReply(null); setComment('');
    setFocusReplyAfterOpen(focusReply);
    try { setActiveThread(await getProjectThread(projectId, item.id)); }
    catch (err) { setActiveThread({ ...item, loading: false }); setError(err.response?.data?.message || err.message || 'Could not load thread.'); }
  };

  const upvote = async (item) => {
    setBusyId(item.id); setError('');
    try {
      const updated = await upvoteProjectThread(projectId, item.id);
      const wasUpvoted = upvotedIds.has(String(item.id));
      const nextUpvoted = new Set(upvotedIds);
      if (wasUpvoted) nextUpvoted.delete(String(item.id));
      else nextUpvoted.add(String(item.id));
      setUpvotedIds(nextUpvoted);
      localStorage.setItem(upvoteStorageKey, JSON.stringify([...nextUpvoted]));
      const count = Number.isFinite(Number(updated?.upvotes))
        ? Number(updated.upvotes)
        : Math.max(0, (Number(item.upvotes) || 0) + (wasUpvoted ? -1 : 1));
      setThreads((current) => current.map((thread) => thread.id === item.id ? { ...thread, upvotes: count } : thread));
      setActiveThread((current) => current?.id === item.id ? { ...current, upvotes: count } : current);
    } catch (err) { setError(err.response?.data?.message || err.message || 'Could not upvote thread.'); }
    finally { setBusyId(null); }
  };

  const postComment = async (event) => {
    event.preventDefault();
    if (!comment.trim() || !activeThread) return;
    setSaving(true); setError('');
    try {
      await addProjectThreadComment(projectId, activeThread.id, comment.trim(), reply?.id);
      setComment(''); setReply(null);
      setActiveThread(await getProjectThread(projectId, activeThread.id));
    } catch (err) { setError(err.response?.data?.message || err.message || 'Could not post comment.'); }
    finally { setSaving(false); }
  };

  const remove = async (thread) => {
    if (!window.confirm(`Delete “${thread.title}”? This cannot be undone.`)) return;
    setError('');
    try { await deleteProjectThread(projectId, thread.id); setActiveThread(null); await loadThreads(); }
    catch (err) { setError(err.response?.data?.message || err.message || 'Could not delete thread.'); }
  };

  const comments = Array.isArray(activeThread?.comments) ? activeThread.comments : [];
  const mayDelete = (thread) => !readOnly && (canManage || (currentUserId && String(thread.authorId) === String(currentUserId)));

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1f1f1f] sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><FiMessageSquare size={18} /></span><div><h2 className="text-base font-bold text-slate-900 dark:text-white">Project threads</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Ideas, questions, and conversations</p></div></div>
        <div className="flex items-center gap-2">{!readOnly && <button type="button" onClick={() => { setCreating((value) => !value); setError(''); }} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-sky-700">{creating ? <FiX size={14} /> : <FiPlus size={14} />}{creating ? 'Cancel' : 'New thread'}</button>}{onClose && <button type="button" onClick={onClose} aria-label="Close threads" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#303036]"><FiX size={17} /></button>}</div>
      </header>
      {error && !activeThread && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      {creating && <form onSubmit={create} className="mb-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#38383e] dark:bg-[#242428]"><input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} maxLength={180} placeholder="Thread title" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-sky-400 dark:border-[#38383e] dark:bg-[#1f1f1f] dark:text-white" /><textarea value={draft.content} onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))} rows={4} placeholder="What would you like to discuss?" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-sky-400 dark:border-[#38383e] dark:bg-[#1f1f1f] dark:text-white" /><div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"><FiSend size={14} />{saving ? 'Creating…' : 'Create thread'}</button></div></form>}
      {loading ? <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#29292f]" />)}</div> : threads.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-9 text-center dark:border-[#38383e]"><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No threads yet</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Start a conversation with your project team.</p></div> : <div className="space-y-3">{threads.map((thread) => { const isUpvoted = upvotedIds.has(String(thread.id)); return <article key={thread.id} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-[#34343a] dark:bg-[#242428]"><button type="button" onClick={() => open(thread)} className="min-w-0 flex-1 text-left"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{thread.title || 'Untitled thread'}</h3><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-slate-300">{thread.content}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400"><span>{formatDate(thread.createdAt)}</span><span>{thread.upvotes || 0} upvotes</span></div></button><div className="flex shrink-0 flex-col items-center gap-1"><button type="button" disabled={readOnly || busyId === thread.id} onClick={() => upvote(thread)} aria-pressed={isUpvoted} aria-label={isUpvoted ? 'Remove upvote' : 'Upvote thread'} className={`flex h-9 flex-col items-center rounded-xl border px-2 py-1 disabled:opacity-50 ${isUpvoted ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300' : 'border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600 dark:border-[#414149] dark:text-slate-300'}`}><FiArrowUp size={14} /><span className="text-[10px] font-semibold">{thread.upvotes || 0}</span></button><button type="button" onClick={() => open(thread, true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"><FiCornerUpRight size={13} /> Reply</button></div></article>; })}</div>}
      {totalPages > 1 && <div className="mt-4 flex items-center justify-between"><button type="button" disabled={page <= 0 || loading} onClick={() => setPage((value) => value - 1)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-[#303036]"><FiChevronLeft size={14} /> Previous</button><span className="text-xs text-slate-500 dark:text-slate-400">Page {page + 1} of {totalPages}</span><button type="button" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-[#303036]">Next <FiChevronRight size={14} /></button></div>}

      {activeThread && <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveThread(null); }}><div role="dialog" aria-modal="true" aria-label="Project thread" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[#38383e] dark:bg-[#202024]"><header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-[#34343a] sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Project thread</p><h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{activeThread.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeThread.authorName || 'Project member'} · {formatDate(activeThread.createdAt)}</p></div><button type="button" onClick={() => setActiveThread(null)} aria-label="Close thread" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#303036]"><FiX size={18} /></button></header>{error && <p className="mx-5 mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">{activeThread.loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-[#29292f]" /> : <><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{activeThread.content}</p><div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-[#34343a]"><button type="button" disabled={readOnly || busyId === activeThread.id} onClick={() => upvote(activeThread)} aria-pressed={upvotedIds.has(String(activeThread.id))} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${upvotedIds.has(String(activeThread.id)) ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300' : 'border-slate-200 text-slate-700 hover:border-sky-300 hover:text-sky-600 dark:border-[#414149] dark:text-slate-200'}`}><FiArrowUp size={14} /> {upvotedIds.has(String(activeThread.id)) ? 'Undo upvote' : 'Upvote'} · {activeThread.upvotes || 0}</button>{mayDelete(activeThread) && <button type="button" onClick={() => remove(activeThread)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><FiTrash2 size={14} /> Delete thread</button>}</div><div className="mt-5"><h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Comments ({comments.length})</h4>{comments.length === 0 ? <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">No comments yet.</p> : <div className="space-y-3">{comments.map((item) => <div key={item.id} className={`rounded-xl bg-slate-50 p-3 dark:bg-[#29292f] ${item.parentCommentId ? 'ml-5 border-l-2 border-sky-300 dark:border-sky-700' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.authorName || 'Project member'} <span className="ml-1 font-normal text-slate-500">· {formatDate(item.createdAt)}</span></p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{item.content}</p></div>{!readOnly && <button type="button" onClick={() => setReply(item)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"><FiCornerUpRight size={13} /> Reply</button>}</div></div>)}</div>}{!readOnly && <form onSubmit={postComment} className="mt-4 space-y-2">{reply && <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><span>Replying to {reply.authorName || 'comment'}</span><button type="button" onClick={() => setReply(null)} aria-label="Cancel reply"><FiX size={14} /></button></div>}<textarea ref={commentInputRef} value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Write a comment…" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-sky-400 dark:border-[#38383e] dark:bg-[#242428] dark:text-white" /><div className="flex justify-end"><button type="submit" disabled={saving || !comment.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"><FiSend size={13} />{saving ? 'Posting…' : 'Post comment'}</button></div></form>}</div></>}</div></div></div>}
    </section>
  );
};

export default ProjectThreadsPanel;
