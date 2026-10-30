import { useCallback, useEffect, useState } from 'react';
import { VoiceCall } from '../../../utils/voice-call.js';

const JANUS_SERVER_URL = import.meta.env.VITE_JANUS_SERVER_URL || 'wss://janus.frietsync.live/';

export const useVoiceCall = () => {
  const [state, setState] = useState('disconnected');
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [voiceCall] = useState(() => (JANUS_SERVER_URL ? new VoiceCall({
      server: JANUS_SERVER_URL,
      audioContainer: document.body,
      onState: setState,
      onError: (error) => console.error('Voice call error:', error),
  }) : null));

  useEffect(() => () => {
    voiceCall?.leave();
  }, [voiceCall]);

  const join = useCallback(async ({ roomId, pin, display }) => {
    if (!voiceCall) throw new Error('Set VITE_JANUS_SERVER_URL to enable voice calls.');
    try {
      await voiceCall.join({ roomId, pin, display, muted: false });
      setMuted(voiceCall.muted);
    } catch (error) {
      
      voiceCall.leave();
      throw error;
    }
  }, [voiceCall]);

  const leave = useCallback(() => {
    voiceCall?.leave();
    setMuted(false);
  }, [voiceCall]);

  const toggleMute = useCallback(() => {
    if (!voiceCall) return;
    setMuted(voiceCall.setMuted(!voiceCall.muted));
  }, [voiceCall]);

  const setVolumeLevel = useCallback((nextVolume) => {
    const normalized = Math.min(1, Math.max(0, Number(nextVolume) || 0));
    voiceCall?.setVolume(normalized);
    setVolume(normalized);
  }, [voiceCall]);

  const resumePlayback = useCallback(() => voiceCall?.resumePlayback() ?? Promise.resolve(false), [voiceCall]);

  return {
    state,
    muted,
    volume,
    isConfigured: Boolean(voiceCall),
    configurationError: '',
    isAutoplayBlocked: state === 'autoplay-blocked',
    join,
    leave,
    toggleMute,
    setVolume: setVolumeLevel,
    resumePlayback,
  };
};
