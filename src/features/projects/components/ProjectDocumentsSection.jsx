import { useCallback, useEffect, useState } from 'react';
import { FiFileText, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiClock, FiUser, FiUploadCloud, FiDownload } from 'react-icons/fi';
import { createDocument, deleteDocument, downloadDocument, getDocument, getProjectDocuments, updateDocument, uploadProjectDocument } from '../services/documentsApi';

const dateLabel = (value) => {
  if (!value) return 'Recently updated';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently updated' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const ProjectDocumentsSection = ({ projectId, canManage = true }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeDocument, setActiveDocument] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [hasUploadedFile, setHasUploadedFile] = useState(false);
  const [checkingAttachment, setCheckingAttachment] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      setDocuments(await getProjectDocuments(projectId));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load project documents.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const openDocument = async (document) => {
    setActiveDocument(document);
    setDraft({ title: document.title || '', content: '' });
    setEditing(false);
    setError('');
    setHasUploadedFile(false);
    setCheckingAttachment(true);
    try {
      const full = await getDocument(document.id);
      setActiveDocument(full);
      setDraft({ title: full.title || '', content: full.content || '' });
      const fileName = full.fileName || full.originalFileName || full.fileUrl;
      setSelectedFile(fileName || full.hasFile ? { name: fileName || 'Attached document' } : null);
      try {
        await downloadDocument(full.id);
        setHasUploadedFile(true);
      } catch {
        setHasUploadedFile(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not open this document.');
    } finally {
      setCheckingAttachment(false);
    }
  };

  const startNew = () => {
    setActiveDocument({ id: null, title: '' });
    setDraft({ title: '', content: '' });
    setSelectedFile(null);
    setEditing(true);
    setError('');
  };

  const saveDocument = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) { setError('Add a title to continue.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { title: draft.title.trim(), content: draft.content };
      const isCreating = !activeDocument?.id;
      const saved = activeDocument?.id
        ? await updateDocument(activeDocument.id, payload)
        : selectedFile
          ? await uploadProjectDocument(projectId, selectedFile, payload)
          : await createDocument(projectId, payload);
      await loadDocuments();
      if (isCreating) {
        setActiveDocument(null);
        setSelectedFile(null);
        setHasUploadedFile(false);
      } else {
        setActiveDocument(saved);
        setDraft({ title: saved.title || payload.title, content: saved.content ?? payload.content });
        setEditing(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not save this document.');
    } finally {
      setSaving(false);
    }
  };

  const removeDocument = async (document) => {
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) return;
    setDeletingId(document.id);
    setError('');
    try {
      await deleteDocument(document.id);
      setDocuments((items) => items.filter((item) => item.id !== document.id));
      if (activeDocument?.id === document.id) setActiveDocument(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not delete this document.');
    } finally {
      setDeletingId(null);
    }
  };

  const chooseFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    if (!draft.title.trim()) setDraft((value) => ({ ...value, title: file.name.replace(/\.[^.]+$/, '') }));
  };

  const downloadFile = async (document) => {
    setDownloadingId(document.id);
    setError('');
    try {
      const { blob, contentDisposition } = await downloadDocument(document.id);
      const match = contentDisposition?.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
      let filename = document.fileName || document.title || 'document';
      if (match?.[1]) {
        try { filename = decodeURIComponent(match[1].replace(/\"/g, '').trim()); } catch { filename = match[1].replace(/\"/g, '').trim(); }
      }
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not download this file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => (doc.title || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1f1f1f] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"><FiFileText size={19} /></span>
          <div><h2 className="text-base font-bold text-slate-900 dark:text-white">Documents</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Shared notes and project documentation</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-[#2a2a30] dark:text-slate-300">{documents.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {documents.length > 0 && <label className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a document" className="w-40 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-400 dark:border-[#38383e] dark:bg-[#242428] dark:text-white sm:w-48" /></label>}
          {canManage && <button type="button" onClick={startNew} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700"><FiPlus size={15} /> New document</button>}
        </div>
      </div>
      {error && !activeDocument && <div className="mb-4 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span><button type="button" onClick={loadDocuments} className="font-semibold underline">Retry</button></div>}
      {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#29292f]" />)}</div> : filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-9 text-center dark:border-[#38383e]"><span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-[#29292f]"><FiFileText size={19} /></span><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{query ? 'No matching documents' : 'No documents yet'}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{query ? 'Try another title.' : 'Create a shared document for project notes, decisions, or plans.'}</p>{canManage && !query && <button type="button" onClick={startNew} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"><FiPlus size={14} /> Create your first document</button>}</div>
      ) : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredDocuments.map((doc) => <article key={doc.id} className="group rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:border-sky-200 hover:bg-white dark:border-[#34343a] dark:bg-[#242428] dark:hover:border-sky-500/40 dark:hover:bg-[#29292f]"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => openDocument(doc)} className="min-w-0 flex-1 text-left"><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-xs dark:bg-[#33333a] dark:text-sky-400"><FiFileText size={17} /></span><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{doc.title || 'Untitled document'}</h3></button>{canManage && <div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100"><button type="button" title="Edit document" onClick={() => openDocument(doc).then(() => setEditing(true))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-sky-700 dark:hover:bg-[#3b3b42] dark:hover:text-sky-300"><FiEdit2 size={14} /></button><button type="button" title="Delete document" disabled={deletingId === doc.id} onClick={() => removeDocument(doc)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"><FiTrash2 size={14} /></button></div>}</div><div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1"><FiClock size={12} /> {dateLabel(doc.updatedAt || doc.createdAt)}</span>{doc.lastEditedByName && <span className="inline-flex min-w-0 items-center gap-1"><FiUser size={12} /><span className="truncate">{doc.lastEditedByName}</span></span>}</div></article>)}</div>}

      {activeDocument && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveDocument(null); }}><div role="dialog" aria-modal="true" aria-label={activeDocument.id ? 'Project document' : 'Create document'} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[#38383e] dark:bg-[#202024]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-[#34343a] sm:px-7"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">Project document</p><h3 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">{activeDocument.id && !editing ? activeDocument.title : activeDocument.id ? 'Edit document' : 'New document'}</h3></div><button type="button" onClick={() => setActiveDocument(null)} aria-label="Close" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#303036]"><FiX size={19} /></button></div>{error && <p className="mx-5 mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 sm:mx-7">{error}</p>}{editing ? <form onSubmit={saveDocument} className="flex min-h-0 flex-1 flex-col gap-4 p-5 sm:p-7"><input autoFocus value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} maxLength={160} placeholder="Document title" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-sky-400 dark:border-[#38383e] dark:bg-[#242428] dark:text-white" />{!activeDocument.id && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 dark:border-[#45454d] dark:bg-[#242428]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Attach a document file <span className="font-normal text-slate-500">(optional)</span></p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">The file will be saved with this document when you create it.</p></div><input id={`project-document-upload-${projectId}`} type="file" className="sr-only" disabled={saving} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} /><label htmlFor={`project-document-upload-${projectId}`} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-[#45454d] dark:bg-[#2b2b31] dark:text-slate-200 dark:hover:border-sky-500/50 dark:hover:text-sky-300 ${saving ? 'pointer-events-none opacity-60' : ''}`}><FiUploadCloud size={16} /> {selectedFile ? 'Change file' : 'Choose file'}</label></div>{selectedFile && <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 dark:bg-[#2b2b31] dark:text-slate-300"><span className="truncate">{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} className="shrink-0 font-semibold text-rose-600 hover:text-rose-700">Remove</button></div>}</div>}<textarea value={draft.content} onChange={(e) => setDraft((v) => ({ ...v, content: e.target.value }))} placeholder="Write your project document…" className="min-h-[260px] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-sky-400 dark:border-[#38383e] dark:bg-[#242428] dark:text-slate-100" /><div className="flex justify-end gap-2"><button type="button" onClick={() => activeDocument.id ? setEditing(false) : setActiveDocument(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-[#38383e] dark:text-slate-300">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{saving ? 'Creating…' : activeDocument.id ? 'Save changes' : 'Create document'}</button></div></form> : <><div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7"><div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400"><span>Created by {activeDocument.createdByName || 'Unknown'} · {dateLabel(activeDocument.createdAt)}</span>{activeDocument.lastEditedByName && <span>Last edited by {activeDocument.lastEditedByName}</span>}</div>{checkingAttachment ? <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-[#29292f]" /> : !hasUploadedFile && <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{draft.content || <span className="italic text-slate-400">This document is empty.</span>}</div>}{hasUploadedFile && <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-[#38383e]"><span className="truncate text-sm text-slate-700 dark:text-slate-200">{selectedFile?.name || activeDocument.fileName || activeDocument.originalFileName || 'Attached document'}</span><button type="button" disabled={downloadingId === activeDocument.id} onClick={() => downloadFile(activeDocument)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"><FiDownload size={14} /> Download document</button></div>}</div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-[#34343a] sm:px-7">{canManage && <><button type="button" onClick={() => removeDocument(activeDocument)} className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><FiTrash2 size={14} /> Delete</button><button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><FiEdit2 size={14} /> Edit</button></>}</div></>}</div></div>}
    </section>
  );
};

export default ProjectDocumentsSection;
