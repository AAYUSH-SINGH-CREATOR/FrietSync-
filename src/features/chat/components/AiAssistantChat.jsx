import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiBookOpen, FiMessageSquare, FiChevronDown, FiClock, FiRefreshCw, FiSend, FiTrash2 } from 'react-icons/fi';
import { askRagAssistant } from '../services/ragChatApi';
import { ChatComposerFrame, ChatConversationPanel } from './ChatConversationLayout';

const QUESTION_LIMIT = 1000;
const REQUEST_TIMEOUT_MS = 90000;
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value);

const SourceList = ({ sources = [] }) => {
  if (!sources.length) return null;

  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <FiBookOpen size={13} /> Sources
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <span key={`${source.documentId || source.title || 'source'}-${index}`} title={source.documentId || ''} className="max-w-full truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {source.title || 'Project document'}
          </span>
        ))}
      </div>
    </div>
  );
};

const AiAssistantChat = ({
  projects = [],
  projectId,
  onProjectChange,
  messages = [],
  onMessagesChange,
  stompClientRef,
  onBackToList,
  isPageActive = true,
}) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const bottomRef = useRef(null);
  const pendingRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const selectedProject = projects.find((project) => String(project.id) === String(projectId));

  const cancelPending = useCallback((reason = 'cancelled') => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    pending.cancelReason = reason;
    clearTimeout(pending.timer);
    pending.unsubscribe?.();
    pending.controller?.abort();
    pending.reject?.(new Error(reason));
  }, []);

  useEffect(() => () => cancelPending('assistant closed'), [cancelPending]);

  useEffect(() => {
    if (!isPageActive) cancelPending('assistant closed');
  }, [isPageActive, cancelPending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const askOverSocket = useCallback((targetProjectId, text) => new Promise((resolve, reject) => {
    const stompClient = stompClientRef.current;
    if (!stompClient?.connected) {
      reject(new Error('The live connection is not ready.'));
      return;
    }

    const sequence = ++requestSequenceRef.current;
    const pending = { sequence, requestId: null, resolve, reject, unsubscribe: null, timer: null };
    pendingRef.current = pending;
    setConnectionStatus('connecting');
    pending.unsubscribe = stompClient.subscribe('/user/queue/ai-chat', (event) => {
      if (pendingRef.current !== pending || !event) return;
      const eventType = String(event.type || '').toLowerCase();
      if (eventType === 'started') {
        pending.requestId = String(event.requestId || '');
        setConnectionStatus('thinking');
        return;
      }
      if (eventType !== 'completed' && eventType !== 'error') return;
      if (pending.requestId && String(event.requestId || '') !== pending.requestId) return;
      if (!pending.requestId && event.requestId) pending.requestId = String(event.requestId);
      pendingRef.current = null;
      clearTimeout(pending.timer);
      pending.unsubscribe?.();
      if (eventType === 'error') reject(new Error(event.error || 'The AI Assistant could not answer right now.'));
      else resolve(event.response || event.data || event);
    });

    pending.timer = setTimeout(() => {
      if (pendingRef.current !== pending) return;
      pendingRef.current = null;
      pending.unsubscribe?.();
      reject(new Error('The AI Assistant took too long to respond. Please try again.'));
    }, REQUEST_TIMEOUT_MS);

    try {
      stompClient.publish(`/app/projects/${encodeURIComponent(targetProjectId)}/rag-chat`, { question: text });
    } catch (publishError) {
      pendingRef.current = null;
      clearTimeout(pending.timer);
      pending.unsubscribe?.();
      reject(publishError);
    }
  }), [stompClientRef]);

  const handleSend = async () => {
    const text = question.trim();
    if (!text || text.length > QUESTION_LIMIT || isLoading) return;
    if (!projectId) {
      setError('Choose a project to ask about.');
      return;
    }

    setQuestion('');
    setError('');
    setIsLoading(true);
    setConnectionStatus('sending');
    const userMessage = { id: `user-${Date.now()}-${requestSequenceRef.current++}`, role: 'user', text, createdAt: Date.now() };
    onMessagesChange((current) => [...current, userMessage]);
    const startedAt = performance.now();

    try {
      let response;
      const controller = new AbortController();
      const pending = { controller };
      pendingRef.current = pending;
      try {
        response = await askRagAssistant(projectId, text, { signal: controller.signal, timeout: REQUEST_TIMEOUT_MS });
      } catch (restError) {
        const status = restError.cause?.response?.status;
        if ([404, 405].includes(status) && stompClientRef.current?.connected) {
          setConnectionStatus('thinking');
          response = await askOverSocket(projectId, text);
        } else {
          throw restError;
        }
      } finally {
        if (pendingRef.current === pending) pendingRef.current = null;
      }
      if (pendingRef.current?.cancelReason) return;
      const elapsedMs = Math.max(0, Math.round(performance.now() - startedAt));
      onMessagesChange((current) => [...current, {
        id: `assistant-${Date.now()}-${requestSequenceRef.current++}`,
        role: 'assistant',
        text: response?.answer || response?.response?.answer || 'I could not find an answer in this project’s documents.',
        sources: response?.sources || response?.response?.sources || [],
        elapsedMs,
        createdAt: Date.now(),
      }]);
      setConnectionStatus('idle');
    } catch (requestError) {
      const cancelled = requestError?.name === 'CanceledError' || requestError?.name === 'AbortError' || ['project changed', 'assistant closed', 'conversation cleared'].includes(requestError?.message);
      if (!cancelled) {
        const message = requestError?.message || 'The AI Assistant could not answer right now.';
        setError(message);
        onMessagesChange((current) => [...current, { id: `error-${Date.now()}`, role: 'error', text: message, createdAt: Date.now() }]);
      }
      setConnectionStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    cancelPending('conversation cleared');
    setIsLoading(false);
    setError('');
    setConnectionStatus('idle');
    onMessagesChange([]);
  };

  return (
    <ChatConversationPanel>
      <header className="mx-2.5 mt-2.5 flex shrink-0 items-center justify-between rounded-2xl border border-sky-100 bg-white px-3.5 py-2.5 shadow-xs dark:border-white/5 dark:bg-[#171717] sm:mx-3 sm:mt-3 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={onBackToList} className="-ml-1 rounded-xl p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white lg:hidden" aria-label="Back to conversations"><FiArrowLeft size={18} /></button>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-xs sm:h-10 sm:w-10"><FiMessageSquare size={18} /></span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">AI Assistant</h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{selectedProject?.name || 'Project documents'}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="relative hidden sm:block">
            <span className="sr-only">Project context</span>
            <select value={projectId || ''} onChange={(event) => onProjectChange(event.target.value)} className="max-w-40 appearance-none rounded-xl border border-slate-200 bg-[#F1F3F5] py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#252525] dark:text-slate-200">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          </label>
          <button type="button" onClick={clearConversation} disabled={!messages.length && !isLoading} title="Clear conversation" className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-rose-500 disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"><FiTrash2 size={15} /></button>
        </div>
      </header>

      <div className="mx-3 mt-2 rounded-xl border border-sky-100 bg-white px-3 py-2 dark:border-white/5 dark:bg-[#171717] sm:hidden">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Project
          <select value={projectId || ''} onChange={(event) => onProjectChange(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-[#F1F3F5] px-2 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-[#252525] dark:text-slate-200">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
      </div>

      {!projectId ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <FiAlertCircle className="mb-3 text-amber-500" size={24} />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Choose a project first</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">The AI Assistant answers using documents from the selected project.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 min-w-0 space-y-3.5 overflow-y-auto overflow-x-hidden px-3.5 py-4 sm:p-5">
            {messages.length === 0 && (
              <div className="flex min-h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"><FiMessageSquare size={27} /></div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">What would you like to know?</h3>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">Ask about project plans, decisions, or details in the documents shared with this project.</p>
                {selectedProject && <p className="mt-3 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">Searching {selectedProject.name}</p>}
              </div>
            )}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isError = message.role === 'error';
              const sender = isUser ? 'You' : 'AI Assistant';
              return (
                <article key={message.id} className={`group flex min-w-0 max-w-full flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 ${isUser ? 'mr-9 justify-end' : 'ml-9 justify-start'}`}>
                    <span>{sender}</span><span className="text-[10px] text-slate-400 dark:text-slate-500">{formatTime(message.createdAt || 0)}</span>
                  </div>
                  <div className={`flex min-w-0 max-w-full items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] text-white shadow-xs ${isError ? 'bg-rose-500' : 'bg-gradient-to-br from-sky-500 to-indigo-600'}`}><FiMessageSquare size={14} /></span>}
                    <div className={`min-w-0 max-w-full break-words rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs sm:text-sm [overflow-wrap:anywhere] ${isError ? 'rounded-tl-xs border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200' : isUser ? 'rounded-tr-xs bg-[#8AD4FF] text-slate-900 dark:border dark:border-white/10 dark:bg-[#1C1C1C] dark:text-white' : 'rounded-tl-xs border border-slate-100 bg-white text-slate-900 dark:border-white/5 dark:bg-[#171717] dark:text-white'}`}>
                      {isError && <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold"><FiAlertCircle size={13} /> Request failed</p>}
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {message.role === 'assistant' && <SourceList sources={message.sources} />}
                      {message.elapsedMs !== undefined && <div className="mt-2 flex items-center gap-1.5 border-t border-slate-200 pt-2 text-[10px] text-slate-500 dark:border-white/10 dark:text-slate-400"><FiClock size={11} />{message.elapsedMs < 1000 ? `${message.elapsedMs} ms` : `${(message.elapsedMs / 1000).toFixed(1)} s`}</div>}
                    </div>
                    {isUser && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D95295] text-[10px] font-semibold text-white shadow-xs">Y</span>}
                  </div>
                </article>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="ml-9 flex items-center gap-2 rounded-2xl rounded-tl-xs border border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500 shadow-xs dark:border-white/5 dark:bg-[#171717] dark:text-slate-400">
                  <FiRefreshCw className="animate-spin text-sky-500" size={14} />
                  {connectionStatus === 'thinking' ? 'Searching project documents…' : 'Thinking…'}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0">
            {error && <p className="mx-3 mb-2 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400"><FiAlertCircle size={13} />{error}</p>}
            <ChatComposerFrame onSubmit={handleSubmit} variant="multiline" className="focus-within:border-sky-400">
              <div className="min-w-0 flex-1 rounded-full border border-transparent bg-[#F1F3F5] px-2.5 py-1.5 focus-within:border-sky-400 dark:border-white/5 dark:bg-[#252525] sm:px-4">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, QUESTION_LIMIT))}
                onKeyDown={handleKeyDown}
                maxLength={QUESTION_LIMIT}
                rows={1}
                placeholder="Ask about this project…"
                aria-label="Question for AI Assistant"
                className="max-h-36 min-h-8 w-full resize-y bg-transparent py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 sm:text-sm dark:placeholder:text-slate-500"
              />
              </div>
              <button type="submit" disabled={!question.trim() || isLoading || question.length > QUESTION_LIMIT} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sky-500 transition hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-400 dark:hover:text-sky-300" aria-label="Send question"><FiSend size={17} /></button>
            </ChatComposerFrame>
          </div>
        </>
      )}
    </ChatConversationPanel>
  );
};

export default AiAssistantChat;
