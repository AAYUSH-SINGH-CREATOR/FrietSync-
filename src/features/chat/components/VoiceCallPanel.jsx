import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../context/ThemeContext';
import {
  FiActivity,
  FiArrowDownRight,
  FiMaximize2,
  FiMic,
  FiMicOff,
  FiPhone,
  FiPhoneOff,
  FiVolume2,
  FiX,
} from 'react-icons/fi';

const getInitials = (name = '') => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'FS';

const getCallStatus = ({ state, isCallActive, isConfigured }) => {
  if (!isConfigured) return 'Set up voice calling to continue';
  if (state === 'connecting') return 'Connecting to the call…';
  if (state === 'connected') return 'You’re connected';
  if (state === 'autoplay-blocked') return 'Incoming audio is paused';
  return isCallActive ? 'A call is already in progress' : 'Start a voice call with your team';
};

const Waveform = ({ active = false }) => (
  <div className={`flex h-10 items-center justify-center gap-1 ${active ? 'text-sky-500 dark:text-sky-400' : 'text-slate-300 dark:text-slate-600'}`} aria-hidden="true">
    {[12, 20, 28, 17, 32, 22, 14, 27, 18, 30, 13, 23, 16, 26, 11, 20, 14, 24].map((height, index) => (
      <span
        key={`${height}-${index}`}
        className={`w-1 rounded-full ${active ? 'animate-pulse bg-current' : 'bg-current'}`}
        style={{ height: `${active ? height : Math.max(5, height * 0.45)}px`, animationDelay: `${index * 45}ms` }}
      />
    ))}
  </div>
);

export const VoiceCallPanel = ({
  isOpen,
  isMinimized,
  projectName,
  teamSize = 0,
  isConfigured = true,
  configurationError = '',
  isCallActive,
  isJoined,
  isJoining = false,
  voiceCallState,
  voiceCallMuted,
  voiceCallVolume,
  onJoin,
  onLeave,
  onEnd,
  onToggleMute,
  onVolumeChange,
  onResumePlayback,
  isAutoplayBlocked,
  canEndCall,
  onMinimize,
  onRestore,
  onClose,
}) => {
  const { isDarkMode } = useTheme();
  const isConnecting = isJoining || voiceCallState === 'connecting';
  const isConnected = voiceCallState === 'connected' || isAutoplayBlocked;
  const initials = getInitials(projectName || 'FrietSync');

  useEffect(() => {
    if (!isOpen || isMinimized) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  if (isMinimized) {
    return createPortal(
      <aside className={`fixed bottom-4 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky-200 bg-white/95 p-3 shadow-2xl shadow-slate-950/25 backdrop-blur-xl dark:border-sky-900/70 dark:bg-[#171a20]/95 ${isDarkMode ? 'dark' : ''}`}>
        <div className="flex items-center gap-3">
          <div style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff' }} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md shadow-indigo-950/20">
            {initials}
            {isConnected && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#171a20]" />}
          </div>
          <button type="button" onClick={onRestore} className="min-w-0 flex-1 text-left" aria-label="Restore call window">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{projectName || 'Voice call'}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              {isConnected ? <><Waveform active /><span>{voiceCallMuted ? 'Muted' : 'In call'}</span></> : <span>{getCallStatus({ state: voiceCallState, isCallActive, isConfigured })}</span>}
            </span>
          </button>
          {isJoined && (
            <button
              type="button"
              onClick={onToggleMute}
              title={voiceCallMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={voiceCallMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${voiceCallMuted ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'}`}
            >
              {voiceCallMuted ? <FiMicOff size={17} /> : <FiMic size={17} />}
            </button>
          )}
          {isJoined ? (
            <button type="button" onClick={onLeave} title="Leave call" aria-label="Leave call" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700">
              <FiPhoneOff size={16} />
            </button>
          ) : (
            <button type="button" onClick={onRestore} title="Open call controls" aria-label="Open call controls" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
              <FiMaximize2 size={16} />
            </button>
          )}
        </div>
      </aside>,
      document.body
    );
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md ${isDarkMode ? 'dark bg-slate-950/70' : 'bg-slate-900/35'}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="voice-call-title" style={{ backgroundColor: isDarkMode ? '#171a20' : '#ffffff', borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.35)' : 'rgba(186, 230, 253, 0.8)' }} className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-[1.75rem] border shadow-2xl shadow-slate-950/35 dark:border-sky-900/70 dark:bg-[#171a20]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-sky-100/90 via-indigo-50/50 to-transparent dark:from-sky-950/50 dark:via-indigo-950/20" />
        <div className="relative flex items-center justify-between px-5 pt-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'animate-pulse bg-emerald-500' : isConnecting ? 'animate-pulse bg-amber-500' : 'bg-slate-400'}`} />
            {isConnected ? 'Live call' : isConnecting ? 'Connecting' : isCallActive ? 'Call in progress' : 'Group audio'}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onMinimize} title="Minimize call" aria-label="Minimize call" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
              <FiArrowDownRight size={18} />
            </button>
            <button type="button" onClick={onClose} title="Close call window" aria-label="Close call window" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
              <FiX size={19} />
            </button>
          </div>
        </div>

        <div className="relative flex flex-col items-center px-6 pb-8 pt-4 text-center sm:px-9 sm:pb-10">
          <div style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff' }} className={`relative mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold shadow-lg shadow-indigo-950/20 ring-4 ${isConnected ? 'ring-emerald-400/70 dark:ring-emerald-500/50' : 'ring-white/70 dark:ring-white/10'}`}>
            {initials}
            {isConnected && <span className="absolute inset-[-9px] rounded-full border border-emerald-400/30" />}
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{getCallStatus({ state: voiceCallState, isCallActive, isConfigured })}</p>
          <h2 id="voice-call-title" className="mt-1 max-w-full truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{projectName || 'FrietSync team'}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isConnected && <span className="font-medium text-emerald-600 dark:text-emerald-400">In call</span>}
          </p>

          <div className="my-5 w-full max-w-[16rem]">
            <Waveform active={isConnected || isConnecting} />
          </div>

          {!isConfigured && (
            <p className="mb-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              {configurationError || <>Add your Janus WebSocket address to <code className="font-bold">VITE_JANUS_SERVER_URL</code>, then restart the frontend.</>}
            </p>
          )}

          {isAutoplayBlocked && (
            <button type="button" onClick={onResumePlayback} className="mb-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
              <FiVolume2 size={15} /> Enable audio
            </button>
          )}

          {isJoined ? (
            <>
              <div className="mb-5 grid w-full grid-cols-2 gap-3">
                <button type="button" onClick={onToggleMute} aria-pressed={voiceCallMuted} className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 ${voiceCallMuted ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:outline-rose-500 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 focus-visible:outline-sky-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]'}`}>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${voiceCallMuted ? 'bg-rose-100 dark:bg-rose-950/70' : 'bg-slate-100 dark:bg-white/10'}`}>{voiceCallMuted ? <FiMicOff size={19} /> : <FiMic size={19} />}</span>
                  <span className="text-xs font-semibold">{voiceCallMuted ? 'Unmute mic' : 'Mute mic'}</span>
                </button>
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"><FiVolume2 size={19} /></span>
                  <label htmlFor="voice-call-volume" className="w-full text-xs font-semibold text-slate-700 dark:text-slate-200">Speaker · {Math.round(voiceCallVolume * 100)}%</label>
                  <input id="voice-call-volume" type="range" min="0" max="1" step="0.05" value={voiceCallVolume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="w-full accent-sky-600" />
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button type="button" onClick={onLeave} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-950/15 transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
                  <FiPhoneOff size={17} /> Leave call
                </button>
                {canEndCall && isCallActive && (
                  <button type="button" onClick={onEnd} title="End call for everyone" aria-label="End call for everyone" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-200 text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40">
                    <FiPhoneOff size={17} />
                  </button>
                )}
              </div>
              {canEndCall && isCallActive && <p className="mt-2 text-[10px] text-slate-400">End for everyone</p>}
            </>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <button type="button" onClick={onJoin} disabled={!isConfigured || isConnecting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-55">
                {isConnecting ? <FiActivity className="animate-spin" size={17} /> : <FiPhone size={17} />}
                {isConnecting ? 'Connecting…' : !isConfigured ? 'Voice call unavailable' : isCallActive ? 'Join group call' : 'Start group call'}
              </button>
              {canEndCall && isCallActive && (
                <button type="button" onClick={onEnd} className="h-10 rounded-full text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">End call for everyone</button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
};
