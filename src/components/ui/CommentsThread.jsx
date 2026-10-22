import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiMessageSquare, FiSend, FiEdit2, FiTrash2, FiCheck, FiX,
  FiClock, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';

const MAX_CHARS = 2000;

const unwrapComments = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.comments)) return res.comments;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.content)) return res.content;
  if (Array.isArray(res.data?.items)) return res.data.items;
  if (Array.isArray(res.data?.content)) return res.data.content;
  if (Array.isArray(res.data?.comments)) return res.data.comments;
  return [];
};

const unwrapSingleComment = (res) => {
  if (!res) return null;
  return res.data?.comment || res.data || res.comment || res;
};

const getCommentId = (c) => c?.id ?? c?._id ?? c?.commentId;

const getCommentContent = (c) => (typeof c === 'string' ? c : c?.content ?? c?.text ?? c?.message ?? '');

const getAuthorInfo = (c) => {
  const authorObj = c?.author || c?.user || (typeof c?.createdBy === 'object' ? c.createdBy : null) || {};
  const name =
    (typeof authorObj === 'string' ? authorObj : null) ||
    authorObj?.name ||
    authorObj?.fullName ||
    c?.authorName ||
    c?.userName ||
    (authorObj?.email ? authorObj.email.split('@')[0] : '') ||
    (c?.authorEmail ? c.authorEmail.split('@')[0] : '') ||
    (typeof c?.createdBy === 'string' ? c.createdBy : '') ||
    'Member';

  const email = authorObj?.email || c?.authorEmail || c?.userEmail || '';
  const id =
    authorObj?.id ||
    authorObj?._id ||
    authorObj?.userId ||
    c?.authorId ||
    c?.userId ||
    (typeof c?.createdBy === 'string' ? c.createdBy : c?.createdBy?.id);

  const avatar = authorObj?.profilePictureUrl || authorObj?.avatarUrl || c?.avatarUrl || '';
  return { name, email, id, avatar };
};

const isOwnComment = (comment, profile) => {
  if (!comment) return false;
  const currentUserId = profile?.id || profile?._id || profile?.userId || profile?.user?.id || profile?.user?._id || localStorage.getItem('frietSyncUserId') || '';
  const currentUserEmail = String(profile?.email || profile?.user?.email || localStorage.getItem('frietSyncEmail') || '').toLowerCase().trim();
  const currentUserName = String(profile?.name || profile?.user?.name || localStorage.getItem('frietSyncName') || '').toLowerCase().trim();

  const author = getAuthorInfo(comment);
  if (currentUserId && author.id && String(currentUserId) === String(author.id)) return true;
  if (currentUserEmail && author.email && currentUserEmail === author.email.toLowerCase().trim()) return true;
  if (!author.id && !author.email && currentUserName && author.name && currentUserName === author.name.toLowerCase().trim()) return true;
  return false;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

const CommentsThread = ({
  entityId,
  entityType = 'item',
  currentUserProfile = null,
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  compact = false,
  onCountChange,
}) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(entityId && fetchComments));
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deletion state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const editInputRef = useRef(null);

  const loadComments = useCallback(async () => {
    if (!entityId || !fetchComments) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchComments(entityId);
      const list = unwrapComments(res);
      setComments(list);
      onCountChange?.(list.length);
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message || `Failed to load ${entityType} comments.`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityType, fetchComments, onCountChange]);

  useEffect(() => {
    if (!entityId || !fetchComments) return;
    let active = true;
    fetchComments(entityId)
      .then((res) => {
        if (!active) return;
        const list = unwrapComments(res);
        setComments(list);
        setError('');
        setIsLoading(false);
        onCountChange?.(list.length);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err?.message || err?.response?.data?.message || `Failed to load ${entityType} comments.`;
        setError(msg);
        setIsLoading(false);
      });

    return () => { active = false; };
  }, [entityId, entityType, fetchComments, onCountChange]);

  // Handle Add Comment
  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    const content = newContent.trim();
    if (!content || content.length > MAX_CHARS || isSubmitting) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      const res = await createComment(entityId, content);
      const created = unwrapSingleComment(res);
      if (created && getCommentId(created)) {
        setComments((prev) => {
          const next = [...prev, created];
          onCountChange?.(next.length);
          return next;
        });
      } else {
        await loadComments();
      }
      setNewContent('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to post comment.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing
  const handleStartEdit = (comment) => {
    setEditingId(getCommentId(comment));
    setEditingContent(getCommentContent(comment));
    setActionError('');
    setConfirmDeleteId(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  // Save edit
  const handleSaveEdit = async (commentId) => {
    const content = editingContent.trim();
    if (!content || content.length > MAX_CHARS || isSavingEdit) return;

    setIsSavingEdit(true);
    setActionError('');
    try {
      const res = await updateComment(entityId, commentId, content);
      const updated = unwrapSingleComment(res);
      setComments((prev) =>
        prev.map((c) => {
          if (String(getCommentId(c)) === String(commentId)) {
            return updated && getCommentId(updated) ? updated : { ...c, content, updatedAt: new Date().toISOString() };
          }
          return c;
        })
      );
      setEditingId(null);
      setEditingContent('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update comment.';
      setActionError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete comment
  const handleConfirmDelete = async (commentId) => {
    setIsDeleting(true);
    setActionError('');
    try {
      await deleteComment(entityId, commentId);
      setComments((prev) => {
        const next = prev.filter((c) => String(getCommentId(c)) !== String(commentId));
        onCountChange?.(next.length);
        return next;
      });
      setConfirmDeleteId(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete comment.';
      setActionError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`space-y-3.5 text-slate-800 dark:text-slate-100 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Action Error Banner */}
      {actionError && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="shrink-0 text-rose-500" size={14} />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError('')} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer">
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Comment Input Composer */}
      <form onSubmit={handleAddComment} className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-[#2d2d32] dark:bg-[#1a1a1d] transition">
        <textarea
          rows={compact ? 2 : 3}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={`Write a comment... (max ${MAX_CHARS.toLocaleString()} characters)`}
          disabled={isSubmitting}
          maxLength={MAX_CHARS + 50}
          className="w-full resize-none rounded-xl border-0 bg-transparent p-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-[#777]"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2 dark:border-[#2b2b30]">
          <span className={`text-[10px] font-medium ${newContent.length > MAX_CHARS ? 'text-rose-600 font-bold' : newContent.length > MAX_CHARS - 100 ? 'text-amber-500' : 'text-slate-400 dark:text-[#777]'}`}>
            {newContent.length} / {MAX_CHARS}
          </span>
          <button
            type="submit"
            disabled={!newContent.trim() || newContent.length > MAX_CHARS || isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <FiRefreshCw className="animate-spin" size={12} />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <FiSend size={12} />
                <span>Comment</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-2.5 py-2">
          {[0, 1].map((n) => (
            <div key={n} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-[#2d2d32] dark:bg-[#202024] animate-pulse">
              <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-[#34343a]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded-sm bg-slate-200 dark:bg-[#34343a]" />
                <div className="h-3 w-full rounded-sm bg-slate-200 dark:bg-[#34343a]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={loadComments}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer"
          >
            <FiRefreshCw size={11} /> Retry
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 dark:border-[#2d2d32] dark:text-[#777]">
          <FiMessageSquare className="mx-auto mb-1.5 opacity-60" size={20} />
          <p className="text-xs font-medium">No comments yet</p>
          <p className="text-[11px]">Be the first to share your thoughts or updates.</p>
        </div>
      ) : (
        <div className={`space-y-2.5 ${compact ? 'max-h-[380px] overflow-y-auto pr-1' : ''}`}>
          {comments.map((comment, idx) => {
            const commentId = getCommentId(comment) || idx;
            const content = getCommentContent(comment);
            const author = getAuthorInfo(comment);
            const isEditing = editingId && String(editingId) === String(commentId);
            const isDeletingThis = isDeleting && String(confirmDeleteId) === String(commentId);
            const isOwner = isOwnComment(comment, currentUserProfile);
            const createdAt = comment?.createdAt || comment?.timestamp || comment?.createdDate;
            const updatedAt = comment?.updatedAt || comment?.modifiedAt;
            const isEdited = Boolean(updatedAt && createdAt && updatedAt !== createdAt) || Boolean(comment?.edited);

            return (
              <div
                key={commentId}
                className="group relative rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-[#2d2d32] dark:bg-[#1f1f23] transition hover:border-slate-300 dark:hover:border-[#38383e]"
              >
                {/* Author row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {author.avatar ? (
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="h-7 w-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-[10px] text-slate-700 dark:bg-[#34343a] dark:text-slate-200">
                        {author.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 leading-tight">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {author.name}
                        </span>
                        {isOwner && (
                          <span className="rounded-full bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-[#777] mt-0.5">
                        {createdAt && (
                          <span className="inline-flex items-center gap-1">
                            <FiClock size={10} />
                            {formatTime(createdAt)}
                          </span>
                        )}
                        {isEdited && <span className="italic">(edited)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions for owner */}
                  {isOwner && !isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment)}
                        title="Edit comment"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#888] dark:hover:bg-[#2c2c31] dark:hover:text-white transition cursor-pointer"
                      >
                        <FiEdit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(commentId)}
                        title="Delete comment"
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-[#888] dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition cursor-pointer"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Delete Confirmation */}
                {confirmDeleteId && String(confirmDeleteId) === String(commentId) ? (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-2 text-xs dark:border-rose-900/40 dark:bg-rose-950/40">
                    <span className="text-[11px] font-medium text-rose-800 dark:text-rose-200">
                      Delete this comment?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeletingThis}
                        className="rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-white dark:text-[#bbb] dark:hover:bg-[#222] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(commentId)}
                        disabled={isDeletingThis}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                      >
                        {isDeletingThis ? <FiRefreshCw className="animate-spin" size={10} /> : <FiTrash2 size={10} />}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Inline Editing Form */}
                {isEditing ? (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      ref={editInputRef}
                      rows={compact ? 2 : 3}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      maxLength={MAX_CHARS + 50}
                      disabled={isSavingEdit}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-[#35353a] dark:bg-[#19191c] dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleCancelEdit();
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(commentId);
                        }
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${editingContent.length > MAX_CHARS ? 'text-rose-600 font-bold' : 'text-slate-400 dark:text-[#777]'}`}>
                        {editingContent.length} / {MAX_CHARS}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-[#35353a] dark:text-[#bbb] dark:hover:bg-[#28282c] transition cursor-pointer"
                        >
                          <FiX size={11} /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(commentId)}
                          disabled={!editingContent.trim() || editingContent.length > MAX_CHARS || isSavingEdit}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-700 transition cursor-pointer disabled:opacity-50"
                        >
                          {isSavingEdit ? <FiRefreshCw className="animate-spin" size={11} /> : <FiCheck size={11} />}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Comment text body */
                  <div className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentsThread;
