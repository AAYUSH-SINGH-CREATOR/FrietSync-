import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiX, FiFolder, FiAlertCircle, FiLayers, FiEdit2, FiTrash2, FiCheck, FiUserPlus, FiPaperclip, FiDownload, FiLink, FiCheckCircle, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import { getIssueDetails, updateIssue, deleteIssue, assignIssue, resolveIssue, reviewIssue, getIssueHistory, getIssueLabels, removeIssueLabel, getIssueLinks, createIssueLink, deleteIssueLink, getIssueDependencies, getIssueImpact, getIssueAttachments, uploadIssueAttachment, downloadIssueAttachment, deleteIssueAttachment, requestIssueAssignment, getMyIssueAssignmentRequest, cancelIssueAssignmentRequest, getProjectIssueRequests, manageProjectIssueRequest } from '../services/issueApi';
import { getProjectMembers } from '../../projects/services/projectApi';
import { getPriorityBadge, getStatusBadge, formatIssueDate, formatEstimatedHours, PRIORITY_OPTIONS } from '../utils/issueUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const listFrom = (data) => {
  if (Array.isArray(data)) return data;
  const body = data?.data && !Array.isArray(data.data) ? data.data : data;
  const values = body?.items || body?.content || body?.history || body?.labels || body?.links || body?.attachments || body?.requests || (Array.isArray(body?.data) ? body.data : null);
  return Array.isArray(values) ? values : [];
};
const getId = (value) => value?.id || value?._id || value?.requestId || value?.labelId || value?.linkId || value?.attachmentId || value?.userId;
const getMemberLabel = (member) => member.name || member.fullName || member.user?.name || member.email || member.user?.email || 'Member';
const asIds = (issue) => issue?.assigneeIds || issue?.assignedUserIds || issue?.assignees?.map(getId) || issue?.assignedTo?.map?.(getId) || [];
const TabButton = ({ active, onClick, children }) => <button type="button" onClick={onClick} className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold ${active ? 'border-sky-500 text-sky-700 dark:text-sky-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-[#aaa] dark:hover:text-white'}`}>{children}</button>;
const Field = ({ label, children }) => <label className="block space-y-1"><span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-[#aaa]">{label}</span>{children}</label>;
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 dark:border-[#424242] dark:bg-[#202020] dark:text-white';

const IssueDetailsModal = ({ isOpen, onClose, issueId, initialIssue = null, projectName = '', onIssueUpdated, onIssueDeleted }) => {
  const [issue, setIssue] = useState(initialIssue);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [notice, setNotice] = useState('');
  const [panelData, setPanelData] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editValues, setEditValues] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', estimatedHours: '' });
  const [reviewComment, setReviewComment] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [myRequest, setMyRequest] = useState(null);
  const [targetIssueId, setTargetIssueId] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const projectId = issue?.projectId || issue?.project?.id || issue?.project?._id || initialIssue?.projectId;

  const refreshIssue = useCallback(async () => {
    if (!issueId) return null;
    setIsLoading(true);
    try {
      const fresh = await getIssueDetails(issueId);
      if (fresh) setIssue((prev) => ({ ...prev, ...fresh }));
      return fresh;
    } catch (err) {
      setPanelError(getFriendlyErrorMessage(err, 'issue'));
      return null;
    } finally { setIsLoading(false); }
  }, [issueId]);

  useEffect(() => {
    if (!isOpen || !issueId) return undefined;
    let active = true;
    getIssueDetails(issueId).then((fresh) => { if (active && fresh) setIssue({ ...initialIssue, ...fresh }); })
      .catch((err) => { if (active) setPanelError(getFriendlyErrorMessage(err, 'issue')); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [isOpen, issueId, initialIssue]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    getProjectMembers(projectId).then((result) => { setMembers(Array.isArray(result) ? result : []); setMembersError(''); }).catch((err) => { setMembers([]); setMembersError(getFriendlyErrorMessage(err, 'project')); });
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen || !issueId) return undefined;
    if (activeTab === 'overview') return undefined;
    let active = true;
    const load = async () => {
      if (activeTab === 'history') {
        const result = await getIssueHistory(issueId, { page: historyPage, size: 20 });
        const body = result?.data && !Array.isArray(result.data) ? result.data : result;
        const items = listFrom(body);
        setHistoryHasMore(typeof body?.totalPages === 'number' ? historyPage + 1 < body.totalPages : items.length >= 20);
        return items;
      }
      if (activeTab === 'labels') return listFrom(await getIssueLabels(issueId));
      if (activeTab === 'attachments') return listFrom(await getIssueAttachments(issueId));
      if (activeTab === 'relations') {
        const [links, dependencies, impact] = await Promise.all([getIssueLinks(issueId), getIssueDependencies(issueId), getIssueImpact(issueId)]);
        return { links: listFrom(links), dependencies, impact };
      }
      if (activeTab === 'requests') {
        const [mine, projectRequests] = await Promise.allSettled([getMyIssueAssignmentRequest(issueId), projectId ? getProjectIssueRequests(projectId) : Promise.resolve([])]);
        if (active) setMyRequest(mine.status === 'fulfilled' ? mine.value?.request || mine.value?.data || mine.value : null);
        if (active && projectRequests.status === 'rejected') setPanelError(getFriendlyErrorMessage(projectRequests.reason, 'project'));
        return projectRequests.status === 'fulfilled' ? listFrom(projectRequests.value) : [];
      }
      return [];
    };
    load().then((data) => { if (active) setPanelData(data); }).catch((err) => { if (active) setPanelError(getFriendlyErrorMessage(err, 'issue')); })
      .finally(() => { if (active) setPanelLoading(false); });
    return () => { active = false; };
  }, [isOpen, issueId, activeTab, historyPage, projectId]);

  const membersById = useMemo(() => new Map(members.map((member) => [String(getId(member)), getMemberLabel(member)])), [members]);
  const execute = async (key, action, after = refreshIssue) => {
    setBusyAction(key); setPanelError(''); setNotice('');
    try { const result = await action(); await after?.(result); setNotice('Saved successfully.'); onIssueUpdated?.(); }
    catch (err) { setPanelError(getFriendlyErrorMessage(err, 'issue')); }
    finally { setBusyAction(''); }
  };
  const closeModal = useCallback(() => { setPanelError(''); setNotice(''); setConfirmDelete(false); onClose(); }, [onClose]);
  const openEdit = () => {
    setEditValues({ title: issue?.title || '', description: issue?.description || '', priority: issue?.priority || 'MEDIUM', dueDate: issue?.dueDate ? String(issue.dueDate).slice(0, 10) : '', estimatedHours: issue?.estimatedHours ?? '' });
    setActiveTab('edit');
  };
  const openAssignment = () => { setSelectedUsers(asIds(issue).map(String)); setActiveTab('assign'); };
  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape' && isOpen && !busyAction && activeTab !== 'edit') closeModal(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, busyAction, activeTab, closeModal]);

  if (!isOpen) return null;
  const title = issue?.title || 'Issue details';
  const issueNumber = issue?.issueNumber;
  const rawAssignee = issue?.assigneeName || issue?.assignedTo?.name || issue?.assigneeEmail || '';
  const assigneeNames = asIds(issue).map((id) => membersById.get(String(id))).filter(Boolean);
  const attachments = activeTab === 'attachments' ? listFrom(panelData) : [];

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editValues.title.trim()) { setPanelError('Issue title is required.'); return; }
    await execute('edit', async () => {
      const updated = await updateIssue(issueId, { title: editValues.title.trim(), description: editValues.description.trim(), priority: editValues.priority, dueDate: editValues.dueDate || null, estimatedHours: editValues.estimatedHours === '' ? null : Number(editValues.estimatedHours) });
      if (updated) setIssue((prev) => ({ ...prev, ...(updated.issue || updated.data || updated) }));
      return updated;
    });
  };

  const handleDownload = async (attachment) => {
    const id = getId(attachment);
    try { const blob = await downloadIssueAttachment(id); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = attachment.fileName || attachment.filename || 'attachment'; anchor.click(); URL.revokeObjectURL(url); }
    catch (err) { setPanelError(getFriendlyErrorMessage(err, 'issue')); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="issue-dialog-title" onClick={(event) => { if (event.target === event.currentTarget && activeTab !== 'edit' && !busyAction) closeModal(); }}>
    <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#393939] dark:bg-[#242424]" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-[#393939] sm:p-5">
        <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"><FiLayers size={19} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-[#353535] dark:text-[#ddd]">{issueNumber ? `#${issueNumber}` : `#${String(issueId || '').slice(-6)}`}</span><span className={`rounded border px-2 py-0.5 text-[10px] ${getStatusBadge(issue?.status)}`}>{String(issue?.status || 'OPEN').replace(/[_-]/g, ' ')}</span><span className={`rounded border px-2 py-0.5 text-[10px] ${getPriorityBadge(issue?.priority)}`}>{issue?.priority || 'MEDIUM'}</span></div><h2 id="issue-dialog-title" className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{title}</h2>{(projectName || issue?.projectName || issue?.project?.name) && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#aaa]"><FiFolder />{projectName || issue?.projectName || issue?.project?.name}</p>}</div></div>
        <button type="button" onClick={closeModal} aria-label="Close issue details" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[#bbb] dark:hover:bg-[#373737]"><FiX /></button>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 dark:border-[#393939]" aria-label="Issue detail sections">
        {['overview', 'history', 'labels', 'relations', 'attachments', 'requests'].map((tab) => <TabButton key={tab} active={activeTab === tab} onClick={() => { setPanelLoading(tab !== 'overview'); setPanelError(''); setActiveTab(tab); }}>{tab[0].toUpperCase() + tab.slice(1)}</TabButton>)}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {panelError && <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><FiAlertCircle className="mt-0.5 shrink-0" />{panelError}</div>}
        {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}
        {(isLoading || !issue) && <p className="mb-3 flex items-center gap-2 text-xs text-slate-500"><FiRefreshCw className="animate-spin" />Loading issue…</p>}

        {activeTab === 'overview' && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Meta label="Status" value={String(issue?.status || 'OPEN').replace(/[_-]/g, ' ')} /><Meta label="Priority" value={issue?.priority || 'MEDIUM'} /><Meta label="Due date" value={issue?.dueDate ? formatIssueDate(issue.dueDate) : 'Not set'} /><Meta label="Estimate" value={formatEstimatedHours(issue?.estimatedHours)} /></div>
          <section><h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-[#aaa]">Description</h3><p className="min-h-16 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-[#303030] dark:text-[#ddd]">{issue?.description || 'No description provided.'}</p></section>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Meta label="Creator" value={issue?.creator?.name || issue?.creatorName || issue?.creatorEmail || issue?.createdBy || '—'} /><Meta label="Assignees" value={[...assigneeNames, rawAssignee && !assigneeNames.length ? rawAssignee : ''].filter(Boolean).join(', ') || 'Unassigned'} /><Meta label="Created" value={issue?.createdAt ? formatIssueDate(issue.createdAt) : '—'} /><Meta label="Updated" value={issue?.updatedAt ? formatIssueDate(issue.updatedAt) : '—'} />{issue?.resolvedAt && <Meta label="Resolved" value={formatIssueDate(issue.resolvedAt)} />}{issue?.closedAt && <Meta label="Closed" value={formatIssueDate(issue.closedAt)} />}</div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-[#393939]">
            <button type="button" onClick={openEdit} className="action-secondary"><FiEdit2 />Edit</button>
            <button type="button" disabled={busyAction === 'assign'} onClick={openAssignment} className="action-secondary"><FiUserPlus />Assign</button>
            {!['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(String(issue?.status || '').toUpperCase()) && <button type="button" disabled={!!busyAction} onClick={() => execute('resolve', () => resolveIssue(issueId))} className="action-secondary"><FiCheckCircle />{busyAction === 'resolve' ? 'Resolving…' : 'Resolve'}</button>}
            <button type="button" onClick={() => setActiveTab('review')} className="action-secondary"><FiCheck />Review</button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="action-danger"><FiTrash2 />Delete</button>
          </div>
          {confirmDelete && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30"><p className="text-xs font-semibold text-rose-800 dark:text-rose-200">Delete this issue? This action cannot be undone.</p><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setConfirmDelete(false)} className="action-secondary">Cancel</button><button type="button" disabled={!!busyAction} onClick={async () => { setBusyAction('delete'); setPanelError(''); try { await deleteIssue(issueId); onIssueDeleted?.(issueId); onClose(); } catch (err) { setPanelError(getFriendlyErrorMessage(err, 'issue')); } finally { setBusyAction(''); } }} className="action-danger">{busyAction === 'delete' ? 'Deleting…' : 'Confirm delete'}</button></div></div>}
        </div>}

        {activeTab === 'edit' && <form className="space-y-3" onSubmit={handleSaveEdit}><Field label="Title"><input className={inputClass} value={editValues.title} onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))} required /></Field><Field label="Description"><textarea className={inputClass} rows={4} value={editValues.description} onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))} /></Field><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Field label="Priority"><select className={inputClass} value={editValues.priority} onChange={(e) => setEditValues((v) => ({ ...v, priority: e.target.value }))}>{PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Due date"><input type="date" className={inputClass} value={editValues.dueDate} onChange={(e) => setEditValues((v) => ({ ...v, dueDate: e.target.value }))} /></Field><Field label="Estimated hours"><input type="number" min="0" step="0.5" className={inputClass} value={editValues.estimatedHours} onChange={(e) => setEditValues((v) => ({ ...v, estimatedHours: e.target.value }))} /></Field></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveTab('overview')} className="action-secondary">Cancel</button><button disabled={!!busyAction} className="action-primary">{busyAction === 'edit' ? 'Saving…' : 'Save changes'}</button></div></form>}

        {activeTab === 'assign' && <div className="space-y-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assign project members</h3>{!projectId && <p className="text-xs text-amber-700">This issue response has no project ID, so available members cannot be loaded.</p>}{membersError && <p className="text-xs text-rose-600">{membersError}</p>}{members.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-[#303030]">No project members are available to assign.</p> : <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-[#424242]">{members.map((member) => { const id = String(getId(member) || ''); return <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-slate-50 dark:hover:bg-[#333]"><input type="checkbox" checked={selectedUsers.includes(id)} onChange={(e) => setSelectedUsers((current) => e.target.checked ? [...new Set([...current, id])] : current.filter((value) => value !== id))} /><span className="text-slate-800 dark:text-white">{getMemberLabel(member)}</span><span className="ml-auto truncate text-[10px] text-slate-400">{member.email || member.user?.email}</span></label>; })}</div>}<div className="flex justify-end"><button type="button" disabled={!!busyAction || !members.length} onClick={() => execute('assign', () => assignIssue(issueId, selectedUsers))} className="action-primary">{busyAction === 'assign' ? 'Assigning…' : `Save ${selectedUsers.length ? `(${selectedUsers.length})` : ''}`}</button></div></div>}

        {activeTab === 'review' && <div className="space-y-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Review decision</h3><Field label="Comment (optional)"><textarea className={inputClass} rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Add context for your decision" /></Field><div className="flex justify-end gap-2"><button type="button" disabled={!!busyAction} onClick={() => execute('reject', () => reviewIssue(issueId, 'reject', reviewComment))} className="action-danger">{busyAction === 'reject' ? 'Sending…' : 'Reject review'}</button><button type="button" disabled={!!busyAction} onClick={() => execute('approve', () => reviewIssue(issueId, 'approve', reviewComment))} className="action-primary">{busyAction === 'approve' ? 'Sending…' : 'Approve review'}</button></div></div>}

        {activeTab === 'history' && <Panel loading={panelLoading} empty={!panelLoading && !panelData.length} emptyText="No issue history is available."><div className="space-y-2">{listFrom(panelData).map((entry, index) => <div key={getId(entry) || index} className="rounded-lg border border-slate-100 p-3 dark:border-[#393939]"><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-slate-800 dark:text-white">{entry.description || entry.action || entry.event || entry.message || entry.type || 'Issue updated'}</p><time className="shrink-0 text-[10px] text-slate-500">{entry.createdAt || entry.timestamp ? formatIssueDate(entry.createdAt || entry.timestamp) : ''}</time></div>{(entry.actor?.name || entry.user?.name || entry.actorName) && <p className="mt-1 text-[10px] text-slate-500">by {entry.actor?.name || entry.user?.name || entry.actorName}</p>}</div>)}</div><PageButtons page={historyPage} onChange={(next) => { setPanelLoading(true); setHistoryPage(next); }} hasMore={historyHasMore} /></Panel>}

        {activeTab === 'labels' && <Panel loading={panelLoading} empty={!panelLoading && !panelData.length} emptyText="No labels are attached to this issue. The API contract does not provide a label catalog, so labels can only be removed here."><div className="flex flex-wrap gap-2">{listFrom(panelData).map((label, index) => <span key={getId(label) || index} className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">{label.name || label.label || label.title || getId(label)}<button type="button" title="Remove label" onClick={() => execute(`label-${getId(label)}`, () => removeIssueLabel(issueId, getId(label)), async () => setPanelData((current) => listFrom(current).filter((item) => getId(item) !== getId(label))))}><FiX /></button></span>)}</div></Panel>}

        {activeTab === 'relations' && <Panel loading={panelLoading} empty={!panelLoading && !(panelData.links?.length || panelData.dependencies || panelData.impact)} emptyText="No dependency or impact data was returned for this issue."><div className="space-y-3"><section className="rounded-lg border border-slate-200 p-3 dark:border-[#424242]"><h3 className="text-xs font-semibold">Links</h3>{panelData.links?.length ? panelData.links.map((link, index) => <div key={getId(link) || index} className="mt-2 flex items-center justify-between gap-2 text-xs"><span>{link.type || link.linkType || 'Link'} · {link.targetIssue?.title || link.targetIssueId || link.targetId || 'Linked issue'}</span><button type="button" disabled={!!busyAction} onClick={() => execute('unlink', () => deleteIssueLink(getId(link)), async () => setPanelData((data) => ({ ...data, links: data.links.filter((item) => getId(item) !== getId(link)) })))} className="text-rose-600">Remove</button></div>) : <p className="mt-2 text-xs text-slate-500">No links.</p>}<form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!targetIssueId.trim()) return; execute('link', () => createIssueLink(issueId, targetIssueId.trim(), 'BLOCKS'), async () => { setTargetIssueId(''); setActiveTab('relations'); }); }}><input aria-label="Target issue ID" className={`${inputClass} min-w-0 flex-1`} value={targetIssueId} onChange={(e) => setTargetIssueId(e.target.value)} placeholder="Target issue UUID" /><button className="action-secondary"><FiLink />Add BLOCKS link</button></form></section><DataBlock title="Dependencies" data={panelData.dependencies} /><DataBlock title="Impact analysis" data={panelData.impact} /></div></Panel>}

        {activeTab === 'attachments' && <Panel loading={panelLoading} empty={!panelLoading && !attachments.length} emptyText="No attachments uploaded yet."><div className="space-y-2">{attachments.map((attachment, index) => <div key={getId(attachment) || index} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2.5 dark:border-[#393939]"><FiPaperclip className="text-slate-500" /><span className="min-w-0 flex-1 truncate text-xs">{attachment.fileName || attachment.filename || attachment.name || 'Attachment'}</span><button type="button" title="Download" onClick={() => handleDownload(attachment)} className="action-icon"><FiDownload /></button><button type="button" title="Delete attachment" disabled={!!busyAction} onClick={() => execute('attachment-delete', () => deleteIssueAttachment(getId(attachment)), async () => setPanelData((data) => listFrom(data).filter((item) => getId(item) !== getId(attachment))))} className="action-icon text-rose-600"><FiTrash2 /></button></div>)}</div><Field label="Upload file"><input type="file" disabled={!!busyAction} className={inputClass} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; execute('upload', () => uploadIssueAttachment(issueId, file), async () => { const result = await getIssueAttachments(issueId); setPanelData(listFrom(result)); e.target.value = ''; }); }} /></Field></Panel>}

        {activeTab === 'requests' && <Panel loading={panelLoading} empty={false}><div className="space-y-4"><section className="rounded-lg border border-slate-200 p-3 dark:border-[#424242]"><h3 className="text-xs font-semibold">Your assignment request</h3>{myRequest ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{myRequest.status || 'Request submitted'}</span><button type="button" disabled={!!busyAction} onClick={() => execute('request-cancel', () => cancelIssueAssignmentRequest(issueId), async () => { setMyRequest(null); setPanelData([]); })} className="text-rose-600">Cancel request</button></div> : <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); execute('request', () => requestIssueAssignment(issueId, requestMessage), async () => { setRequestMessage(''); setActiveTab('requests'); }); }}><input className={inputClass} value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Optional note" /><button className="action-primary"><FiMessageSquare />Request assignment</button></form>}</section><section><h3 className="text-xs font-semibold">Project requests</h3>{!panelData.length ? <p className="mt-2 text-xs text-slate-500">No project assignment requests returned.</p> : <div className="mt-2 space-y-2">{listFrom(panelData).map((request, index) => <div key={getId(request) || index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 dark:border-[#393939]"><span className="text-xs">{request.user?.name || request.requesterName || request.email || request.message || 'Assignment request'} <small className="text-slate-500">{request.status || ''}</small></span><span className="flex gap-2"><button type="button" disabled={!!busyAction} onClick={() => execute('approve-request', () => manageProjectIssueRequest(request.issueId || request.issue?.id || issueId, getId(request), true), () => getProjectIssueRequests(projectId).then((data) => setPanelData(listFrom(data))))} className="text-xs text-emerald-600">Approve</button><button type="button" disabled={!!busyAction} onClick={() => execute('reject-request', () => manageProjectIssueRequest(request.issueId || request.issue?.id || issueId, getId(request), false), () => getProjectIssueRequests(projectId).then((data) => setPanelData(listFrom(data))))} className="text-xs text-rose-600">Reject</button></span></div>)}</div>}</section></div></Panel>}
      </div>
      <footer className="flex justify-end border-t border-slate-100 p-3 dark:border-[#393939]"><button type="button" onClick={closeModal} className="action-secondary">Close</button></footer>
    </div>
  </div>;
};

const Meta = ({ label, value }) => <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-[#393939] dark:bg-[#303030]"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#aaa]">{label}</p><p className="mt-1 truncate text-xs font-medium text-slate-800 dark:text-[#eee]" title={String(value)}>{value}</p></div>;
const Panel = ({ loading, empty, emptyText, children }) => loading ? <p className="flex items-center gap-2 py-8 text-xs text-slate-500"><FiRefreshCw className="animate-spin" />Loading…</p> : empty ? <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-500 dark:bg-[#303030]">{emptyText}</p> : <div className="space-y-3">{children}</div>;
const DataBlock = ({ title, data }) => <section className="rounded-lg border border-slate-200 p-3 dark:border-[#424242]"><h3 className="text-xs font-semibold">{title}</h3><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-slate-600 dark:text-[#bbb]">{data ? JSON.stringify(data, null, 2) : 'No data returned.'}</pre></section>;
const PageButtons = ({ page, onChange, hasMore }) => <div className="flex justify-between pt-2"><button type="button" disabled={page <= 0} onClick={() => onChange(page - 1)} className="action-secondary">Previous</button><span className="self-center text-[10px] text-slate-500">Page {page + 1}</span><button type="button" disabled={!hasMore} onClick={() => onChange(page + 1)} className="action-secondary">Next</button></div>;

export default IssueDetailsModal;
