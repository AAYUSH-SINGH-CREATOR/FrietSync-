import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoCall } from '../../../utils/video-call.js';

const JANUS_SERVER_URL = import.meta.env.VITE_JANUS_SERVER_URL || 'wss://janus.frietsync.live/';

export const useVideoCall = ({ onError } = {}) => {
  const [state, setState] = useState('disconnected');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mediaPlaybackEnabled, setMediaPlaybackEnabled] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);

  // Keep the latest onError without recreating the VideoCall instance, and
  // only surface errors as toasts once a call has actually connected — errors
  // during join are surfaced by the join() promise rejection instead, so we
  // don't double-toast.
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  const joinedRef = useRef(false);

  const videoCallRef = useRef(null);
  const getVideoCall = useCallback(() => {
    if (!videoCallRef.current) throw new Error('The video call is still initializing. Please try again.');
    return videoCallRef.current;
  }, []);

  useEffect(() => {
    const videoCall = new VideoCall({
      server: JANUS_SERVER_URL,
      onState: setState,
      onParticipants: setParticipants,
      onLocalStream: setLocalStream,
      onError: (error) => {
        if (joinedRef.current && onErrorRef.current) onErrorRef.current(error);
      },
    });
    videoCallRef.current = videoCall;
    const cleanup = () => {
      joinedRef.current = false;
      videoCall.leave();
    };
    window.addEventListener('pagehide', cleanup);
    return () => {
      window.removeEventListener('pagehide', cleanup);
      cleanup();
      if (videoCallRef.current === videoCall) videoCallRef.current = null;
    };
  }, []);

  const join = useCallback(async (details) => {
    const videoCall = getVideoCall();
    try {
      await videoCall.join(details);
      joinedRef.current = true;
      setMuted(false);
      setCameraOff(false);
      setMediaPlaybackEnabled(false);
    } catch (error) {
      videoCall.leave();
      throw error;
    }
  }, [getVideoCall]);
  const leave = useCallback(() => { joinedRef.current = false; videoCallRef.current?.leave(); setMuted(false); setCameraOff(false); setMediaPlaybackEnabled(false); }, []);
  const toggleMute = useCallback(() => {
    const videoCall = getVideoCall();
    setMuted(videoCall.setMuted(!videoCall.muted));
  }, [getVideoCall]);
  const toggleCamera = useCallback(() => {
    const videoCall = getVideoCall();
    setCameraOff(videoCall.setCameraOff(!videoCall.cameraOff));
  }, [getVideoCall]);
  const resumePlayback = useCallback(() => {
    setMediaPlaybackEnabled(true);
    getVideoCall().resumePlayback();
  }, [getVideoCall]);

  return { state, muted, cameraOff, mediaPlaybackEnabled, participants, localStream, join, leave, toggleMute, toggleCamera, resumePlayback, isConfigured: Boolean(JANUS_SERVER_URL) };
};
