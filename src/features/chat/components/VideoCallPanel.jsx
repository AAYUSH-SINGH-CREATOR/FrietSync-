import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiVolume2, FiX, FiUsers } from 'react-icons/fi';
import { useTheme } from '../../../context/ThemeContext';
import { getInitials } from '../services/chatApi';

const ControlButton = ({ label, onClick, active = false, danger = false, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${danger ? 'bg-rose-500 text-white hover:bg-rose-600' : active ? 'bg-sky-500 text-white' : 'bg-white/80 text-slate-700 shadow-sm hover:bg-white dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15'} ${className}`}
  >
    {children}
  </button>
);

const VideoTile = ({ name, stream, muted = false, cameraOff = false, local = false, isDarkMode }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.srcObject = stream || null;
    if (stream) video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);

  return (
    <article className={`relative aspect-video min-h-[150px] overflow-hidden rounded-2xl border shadow-sm sm:min-h-[190px] ${isDarkMode ? 'border-white/10 bg-slate-800' : 'border-white/80 bg-white'}`}>
      {!cameraOff && stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted || local} className={`h-full w-full object-cover ${local ? '-scale-x-100' : ''}`} />
      ) : (
        <div className={`flex h-full min-h-[150px] items-center justify-center bg-gradient-to-br ${isDarkMode ? 'from-slate-700 to-slate-900' : 'from-sky-100 to-sky-200'}`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500 text-xl font-semibold text-white shadow-sm sm:h-20 sm:w-20 sm:text-2xl">
            {getInitials(name || 'Guest')}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-3 pt-8 text-sm font-medium text-white">
        {(muted || local) && <FiMicOff aria-label="Microphone muted" size={15} className="shrink-0" />}
        <span className="truncate">{local ? 'You' : name || 'Participant'}</span>
      </div>
    </article>
  );
};

export const VideoCallPanel = ({ isOpen, projectName, state, participants = [], localStream, muted, cameraOff, onToggleMute, onToggleCamera, onLeave, onEnd, canEndCall, onResumePlayback }) => {
  const { isDarkMode } = useTheme();
  if (!isOpen) return null;

  const tiles = [{ id: 'local', name: 'You', stream: localStream, local: true, muted, cameraOff }, ...participants];
  const count = tiles.length;
  const grid = count === 1
    ? 'grid-cols-1 max-w-3xl mx-auto'
    : count <= 4
      ? 'grid-cols-1 sm:grid-cols-2'
      : count <= 6
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  const surface = isDarkMode ? 'bg-[#15191f] text-slate-100' : 'bg-slate-100 text-slate-900';

  return createPortal(
    <div data-video-call className={`fixed inset-0 z-[110] flex flex-col ${surface}`}>
      <header className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${isDarkMode ? 'border-white/10 bg-[#1b2027]' : 'border-slate-200 bg-white'}`}>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold sm:text-lg">{projectName || 'FrietSync video call'}</h2>
          <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${state === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            {state === 'connected' ? 'In call' : 'Connecting…'} · {count} {count === 1 ? 'participant' : 'participants'}
          </p>
        </div>
        <ControlButton label="Close video call" onClick={onLeave}><FiX size={19} /></ControlButton>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-5 lg:p-6">
        <section className={`flex min-h-0 w-full max-w-[1600px] flex-col gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4 lg:flex-row lg:items-center lg:p-5 ${isDarkMode ? 'bg-gradient-to-br from-[#202a34] to-[#1b222c]' : 'bg-gradient-to-br from-sky-100 via-sky-100 to-sky-200'}`} aria-label="Call participants">
          <div className={`grid min-h-0 flex-1 auto-rows-fr gap-3 sm:gap-4 ${grid}`}>
            {tiles.map((person) => <VideoTile key={person.id} {...person} isDarkMode={isDarkMode} />)}
          </div>

          <div className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl p-2 lg:w-[60px] lg:flex-col lg:gap-3 ${isDarkMode ? 'bg-black/15' : 'bg-white/45'}`} aria-label="Call controls">
            <ControlButton label={muted ? 'Unmute microphone' : 'Mute microphone'} onClick={onToggleMute} active={muted}><>{muted ? <FiMicOff size={19} /> : <FiMic size={19} />}</></ControlButton>
            <ControlButton label={cameraOff ? 'Start camera' : 'Stop camera'} onClick={onToggleCamera} active={cameraOff}><>{cameraOff ? <FiVideoOff size={19} /> : <FiVideo size={19} />}</></ControlButton>
            <ControlButton label="Enable media playback" onClick={onResumePlayback}><FiVolume2 size={19} /></ControlButton>
            {canEndCall && <ControlButton label="End call for everyone" onClick={onEnd} danger><FiUsers size={18} /></ControlButton>}
            <ControlButton label="Leave call" onClick={onLeave} danger className="lg:mt-2"><FiPhoneOff size={19} /></ControlButton>
          </div>
        </section>
      </main>
    </div>,
    document.body
  );
};
