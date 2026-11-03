import { useCallback, useEffect, useState } from 'react';
import { VideoCall } from '../../../utils/video-call.js';

const JANUS_SERVER_URL = import.meta.env.VITE_JANUS_SERVER_URL || 'wss://janus.frietsync.live/';

export const useVideoCall = () => {
  const [state, setState] = useState('disconnected');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [videoCall] = useState(() => new VideoCall({ server: JANUS_SERVER_URL, onState: setState, onParticipants: setParticipants, onLocalStream: setLocalStream }));

  useEffect(() => () => videoCall.leave(), [videoCall]);

  const join = useCallback(async (details) => {
    try {
      await videoCall.join(details);
      setMuted(false);
      setCameraOff(false);
    } catch (error) {
      videoCall.leave();
      throw error;
    }
  }, [videoCall]);
  const leave = useCallback(() => { videoCall.leave(); setMuted(false); setCameraOff(false); }, [videoCall]);
  const toggleMute = useCallback(() => setMuted(videoCall.setMuted(!videoCall.muted)), [videoCall]);
  const toggleCamera = useCallback(() => setCameraOff(videoCall.setCameraOff(!videoCall.cameraOff)), [videoCall]);
  const resumePlayback = useCallback(() => videoCall.resumePlayback(), [videoCall]);

  return { state, muted, cameraOff, participants, localStream, join, leave, toggleMute, toggleCamera, resumePlayback, isConfigured: Boolean(JANUS_SERVER_URL) };
};
