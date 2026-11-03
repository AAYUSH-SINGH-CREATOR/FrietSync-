import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiVolume2, FiX, FiUsers } from 'react-icons/fi';
import { getInitials } from '../services/chatApi';

const VideoTile = ({ name, stream, muted = false, cameraOff = false, local = false }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.srcObject = stream || null;
    if (stream) video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);

  return (
    <div className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-lg">
      {!cameraOff && stream ? <video ref={videoRef} autoPlay playsInline muted={muted || local} className={`h-full w-full object-cover ${local ? '-scale-x-100' : ''}`} /> : <div className="flex h-full min-h-36 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900"><span className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-600 text-2xl font-bold text-white">{getInitials(name || 'Guest')}</span></div>}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-sm font-medium text-white">
        <span className="truncate">{local ? 'You' : name || 'Participant'}</span>
        {local && (muted ? <FiMicOff size={16} /> : <FiMic size={16} />)}
      </div>
    </div>
  );
};

export const VideoCallPanel = ({ isOpen, projectName, state, participants, localStream, muted, cameraOff, onToggleMute, onToggleCamera, onLeave, onEnd, canEndCall, onResumePlayback }) => {
  if (!isOpen) return null;
  const tiles = [{ id: 'local', name: 'You', stream: localStream, local: true, muted, cameraOff }, ...participants];
  const count = tiles.length;
  const grid = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-1 sm:grid-cols-2' : count <= 4 ? 'grid-cols-2' : count <= 6 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  return createPortal(
    <div data-video-call className="fixed inset-0 z-[110] flex flex-col bg-[#111318] text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0"><h2 className="truncate text-base font-semibold sm:text-lg">{projectName || 'FrietSync video call'}</h2><p className="text-xs text-slate-400">{state === 'connected' ? 'In call' : 'Connecting…'} · {count} {count === 1 ? 'participant' : 'participants'}</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={onResumePlayback} title="Enable media playback" aria-label="Enable media playback" className="rounded-full p-2.5 text-slate-300 hover:bg-white/10"><FiVolume2 size={19} /></button><button type="button" onClick={onLeave} title="Close video call" aria-label="Close video call" className="rounded-full p-2.5 text-slate-300 hover:bg-white/10"><FiX size={19} /></button></div>
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-5">
        <div className={`grid h-full max-h-full w-full max-w-[1600px] auto-rows-fr gap-3 sm:gap-4 ${grid}`}>
          {tiles.map((person) => <VideoTile key={person.id} {...person} />)}
        </div>
      </main>
      <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 px-3 py-4 sm:gap-4 sm:py-5">
        <button type="button" onClick={onToggleMute} title={muted ? 'Unmute microphone' : 'Mute microphone'} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={muted} className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? 'bg-rose-600' : 'bg-white/10 hover:bg-white/20'}`}>{muted ? <FiMicOff size={20} /> : <FiMic size={20} />}</button>
        <button type="button" onClick={onToggleCamera} title={cameraOff ? 'Start camera' : 'Stop camera'} aria-label={cameraOff ? 'Start camera' : 'Stop camera'} aria-pressed={cameraOff} className={`flex h-12 w-12 items-center justify-center rounded-full ${cameraOff ? 'bg-rose-600' : 'bg-white/10 hover:bg-white/20'}`}>{cameraOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}</button>
        <button type="button" onClick={onLeave} title="Leave call" aria-label="Leave call" className="flex h-12 min-w-16 items-center justify-center rounded-full bg-rose-600 px-5 transition hover:bg-rose-700"><FiPhoneOff size={20} /></button>
        {canEndCall && <button type="button" onClick={onEnd} title="End call for everyone" aria-label="End call for everyone" className="hidden h-12 items-center gap-2 rounded-full border border-rose-400/40 px-4 text-sm text-rose-200 hover:bg-rose-950/50 sm:flex"><FiUsers size={17} />End for everyone</button>}
      </footer>
    </div>, document.body
  );
};
