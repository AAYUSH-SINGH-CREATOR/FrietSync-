import Janus from 'janus-gateway';
import { initJanus } from './voice-call.js';

const toVideoCallError = (error, fallback = 'Could not connect to the video call.') => {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new Error('Allow camera and microphone access to join the video call. Camera access requires HTTPS or localhost.');
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new Error('A camera or microphone was not found on this device.');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return new Error('Your camera or microphone is already being used by another application.');
  }
  if (/no such room|room .*not found|invalid room/i.test(String(error?.message || ''))) {
    return new Error('This video call room is no longer available. Refresh the call list and try again.');
  }
  if (/call has ended|call.*closed|room.*destroyed/i.test(String(error?.message || ''))) {
    return new Error('This video call has ended.');
  }
  if (/websocket|connection|network|ice|peerconnection/i.test(String(error?.message || ''))) {
    return new Error('The video connection was interrupted. Check your network and try again.');
  }
  return new Error(fallback);
};

export class VideoCall {
  constructor({ server, onState = () => {}, onParticipants = () => {}, onLocalStream = () => {}, onError = () => {} }) {
    Object.assign(this, { server, onState, onParticipants, onLocalStream, onError });
    this.session = null;
    this.muted = false;
    this.cameraOff = false;
  }

  async join({ roomId, pin, display = 'Guest', avatarUrl = '' }) {
    this.leave();
    if (!this.server) throw new Error('Video calling is not configured.');
    const numericRoomId = Number(roomId);
    if (!Number.isFinite(numericRoomId) || numericRoomId <= 0) throw new Error('The video call returned an invalid room.');
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Video calls require HTTPS or localhost so your browser can access the camera and microphone.');
    }
    const session = { janus: null, publisher: null, publisherId: null, privateId: null, roomId: numericRoomId, pin, display, avatarUrl, subscribers: new Map(), subscribing: new Set(), streams: new Map(), settled: false, cleaned: false };
    this.session = session;
    this.roomId = numericRoomId;
    this.pin = pin;
    this.onState('connecting');
    await new Promise((resolve, reject) => {
      session.resolve = resolve;
      session.reject = reject;
      initJanus().then(() => {
        if (this.session !== session) throw new Error('Video call join was cancelled.');
        session.janus = new Janus({
        server: this.server,
        success: () => session.janus?.attach({
          plugin: 'janus.plugin.videoroom',
          success: (handle) => {
            if (this.session !== session) return;
            session.publisher = handle;
            const request = { request: 'join', room: session.roomId, ptype: 'publisher', display: session.display };
            if (session.pin) request.pin = session.pin;
            handle.send({ message: request });
          },
          error: (error) => this.fail(session, error),
          onmessage: (message, jsep) => this.onPublisherMessage(session, message, jsep),
          ondataopen: () => {
            session.dataOpen = true;
            this.sendMediaState(session);
            session.mediaStateTimer = window.setInterval(() => this.sendMediaState(session), 2000);
          },
          webrtcState: (connected) => {
            if (connected) session.webRtcConnected = true;
            else if (session.webRtcConnected && this.session === session) {
              this.fail(session, new Error('The WebRTC video connection was interrupted.'));
            }
          },
          onlocaltrack: (track, added) => {
            if (!track) return;
            if (this.session !== session) { if (added) track.stop(); return; }
            if (added && track.kind === 'audio') track.enabled = !this.muted;
            if (added && track.kind === 'video') track.enabled = !this.cameraOff;
            const tracks = session.localStream?.getTracks() || [];
            const nextTracks = added
              ? [...tracks.filter((item) => item.id !== track.id), track]
              : tracks.filter((item) => item.id !== track.id);
            const stream = new MediaStream(nextTracks);
            session.localStream = stream;
            this.onLocalStream(stream);
          },
          oncleanup: () => {
            if (this.session === session) {
              session.localStream?.getTracks().forEach((track) => track.stop());
              session.localStream = null;
              this.onLocalStream(null);
            }
          },
        }),
        error: (error) => this.fail(session, error),
        destroyed: () => {
          if (this.session === session) {
            this.fail(session, new Error('The Janus video connection was closed.'), { destroyJanus: false });
          }
        },
        });
      }).catch((error) => this.fail(session, error));
    });
  }

  onPublisherMessage(session, message, jsep) {
    if (this.session !== session) return;
    const data = message?.plugindata?.data || message;
    if (data.error) {
      this.fail(session, new Error(String(data.error)));
    } else if (data.videoroom === 'joined') {
      session.publisherId = data.id;
      session.privateId = data.private_id;
      this.publish(session);
      (data.publishers || []).forEach((publisher) => this.subscribe(session, publisher));
    } else if (data.videoroom === 'destroyed' || data.destroyed) {
      this.fail(session, new Error('The video call has ended.'));
    } else if (data.videoroom === 'event') {
      (data.publishers || []).forEach((publisher) => this.subscribe(session, publisher));
      if (data.leaving && data.leaving !== 'ok') this.removeParticipant(session, data.leaving);
      if (data.unpublished && data.unpublished !== 'ok') this.removeParticipant(session, data.unpublished);
    }
    if (jsep && this.session === session) session.publisher?.handleRemoteJsep({ jsep });
  }

  publish(session) {
    session.publisher.createOffer({
      media: {
        audio: true,
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24 },
        },
        data: true,
      },
      success: (jsep) => {
        if (this.session !== session) return;
        // Start with the microphone live. Browsers can return tracks that are
        // disabled by a prior device/session state, so make the default clear.
        session.localStream?.getAudioTracks().forEach((track) => { track.enabled = true; });
        this.muted = false;
        session.publisher.send({ message: { request: 'configure', audio: true, video: true, data: true }, jsep });
        this.resolve(session);
      },
      error: (error) => this.fail(session, error),
    });
  }

  subscribe(session, publisher) {
    if (!publisher?.id) return;
    const id = String(publisher.id);
    if (session.subscribers.has(id) || session.subscribing.has(id)) return;
    session.subscribing.add(id);
    const publisherStreams = publisher.streams || [];
    const participant = {
      id,
      name: publisher.display || 'Participant',
      avatarUrl: publisher.metadata?.avatarUrl || '',
      stream: new MediaStream(),
      muted: Boolean(publisherStreams.find((stream) => stream.type === 'audio')?.disabled),
      cameraOff: Boolean(publisherStreams.find((stream) => stream.type === 'video')?.disabled),
    };
    session.streams.set(id, participant);
    const notify = () => this.onParticipants([...session.streams.values()]);
    session.janus.attach({
      plugin: 'janus.plugin.videoroom',
      success: (handle) => {
        session.subscribing.delete(id);
        if (this.session !== session || !session.streams.has(id)) {
          try { handle.detach(); } catch { /* Janus may already have detached this handle. */ }
          return;
        }
        session.subscribers.set(id, handle);
        const request = {
          request: 'join',
          room: session.roomId,
          ptype: 'subscriber',
          feed: publisher.id,
          private_id: session.privateId,
        };
        if (session.pin) request.pin = session.pin;
        handle.send({ message: request });
      },
      error: (error) => {
        session.subscribing.delete(id);
        this.fail(session, error);
      },
      webrtcState: (connected) => {
        if (connected) participant.webRtcConnected = true;
        else if (participant.webRtcConnected && this.session === session) {
          this.onError(toVideoCallError(new Error('The participant video connection was interrupted.')));
          this.removeParticipant(session, id);
        }
      },
      onmessage: (message, jsep) => {
        const handle = session.subscribers.get(id);
        if (jsep && handle) handle.createAnswer({
          jsep,
          media: { audioSend: false, videoSend: false, audioRecv: true, videoRecv: true, data: true },
          success: (answer) => {
            if (this.session === session) handle.send({ message: { request: 'start', room: session.roomId }, jsep: answer });
          },
          error: (error) => this.fail(session, error),
        });
        const data = message?.plugindata?.data || message;
        if (data.error) this.fail(session, new Error(String(data.error)));
      },
      onremotetrack: (track, _mid, added) => {
        if (this.session !== session || !track) return;
        const tracks = participant.stream.getTracks();
        const nextTracks = added
          ? [...tracks.filter((item) => item.id !== track.id), track]
          : tracks.filter((item) => item.id !== track.id);
        participant.stream = new MediaStream(nextTracks);
        notify();
      },
      ondata: (text) => {
        try {
          const update = JSON.parse(text);
          if (update?.type !== 'frietsync-media-state' || !session.streams.has(id)) return;
          participant.muted = Boolean(update.muted);
          participant.cameraOff = Boolean(update.cameraOff);
          if (typeof update.avatarUrl === 'string') participant.avatarUrl = update.avatarUrl;
          notify();
        } catch { /* Ignore non-FrietSync data channel messages. */ }
      },
      oncleanup: () => this.removeParticipant(session, id),
    });
    notify();
  }

  removeParticipant(session, id) {
    const key = String(id);
    session.subscribing.delete(key);
    const handle = session.subscribers.get(key);
    session.subscribers.delete(key);
    const participant = session.streams.get(key);
    if (!participant) return;
    session.streams.delete(key);
    participant.stream.getTracks().forEach((track) => track.stop());
    try { handle?.detach(); } catch { /* Janus may already have detached this handle. */ }
    this.onParticipants([...session.streams.values()]);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.session?.publisher?.send({ message: { request: 'configure', audio: !this.muted } });
    this.session?.localStream?.getAudioTracks().forEach((track) => { track.enabled = !this.muted; });
    this.sendMediaState(this.session);
    return this.muted;
  }

  setCameraOff(value) {
    this.cameraOff = Boolean(value);
    const session = this.session;
    const publisher = session?.publisher;
    const videoTracks = session?.localStream?.getVideoTracks() || [];
    videoTracks.forEach((track) => { track.enabled = !this.cameraOff; });

    if (publisher && session && !session.cleaned) {
      this.sendMediaState(session);
      if (this.cameraOff) {
        // Keep the negotiated video transceiver alive while pausing publication.
        // Re-enabling below renegotiates with a fresh offer; a bare
        // configure(video:true) can leave subscribers with a black track.
        publisher.send({ message: { request: 'configure', video: false } });
      } else {
        publisher.createOffer({
          media: {
            audio: !this.muted,
            video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } },
            data: true,
          },
          success: (jsep) => {
            if (this.session !== session || session.cleaned) return;
            publisher.send({ message: { request: 'configure', audio: !this.muted, video: true }, jsep });
          },
          error: (error) => {
            if (this.session === session) this.onError(toVideoCallError(error));
          },
        });
      }
    }
    return this.cameraOff;
  }

  sendMediaState(session) {
    if (!session?.dataOpen || this.session !== session || session.cleaned) return;
    try {
      session.publisher?.data({
        text: JSON.stringify({ type: 'frietsync-media-state', muted: this.muted, cameraOff: this.cameraOff, avatarUrl: session.avatarUrl }),
      });
    } catch { /* The channel can close while the call is ending. */ }
  }

  resumePlayback() {
    document.querySelectorAll('[data-video-call] video[data-remote-video="true"], [data-video-call] audio').forEach((media) => {
      media.muted = false;
      media.play().catch(() => {});
    });
  }

  fail(session, error, { destroyJanus = true } = {}) {
    if (this.session !== session) return;
    const safeError = toVideoCallError(error);
    this.onError(safeError);
    this.cleanupSession(session, { error: safeError, destroyJanus });
  }

  resolve(session) {
    if (!session.settled) { session.settled = true; this.onState('connected'); session.resolve(); }
  }

  leave() {
    const session = this.session;
    if (!session) return;
    this.cleanupSession(session, { sendLeave: true, destroyJanus: true, rejectError: new Error('Video call left before connecting.') });
  }

  cleanupSession(session, { sendLeave = false, destroyJanus = true, rejectError = null, error = null } = {}) {
    if (!session || session.cleaned) return;
    session.cleaned = true;
    if (session.mediaStateTimer) window.clearInterval(session.mediaStateTimer);
    if (this.session === session) this.session = null;
    if (sendLeave) {
      try { session.publisher?.send({ message: { request: 'leave' } }); } catch { /* Janus may already be closing. */ }
    }
    const handles = [...session.subscribers.values()];
    session.subscribers.clear();
    session.subscribing.clear();
    handles.forEach((handle) => { try { handle.detach(); } catch { /* Janus may already have detached this handle. */ } });
    session.localStream?.getTracks().forEach((track) => track.stop());
    session.streams.forEach((participant) => participant.stream.getTracks().forEach((track) => track.stop()));
    session.streams.clear();
    this.onLocalStream(null);
    this.onParticipants([]);
    if (destroyJanus) {
      try { session.janus?.destroy(); } catch { /* Janus may already be destroyed. */ }
    }
    if (!session.settled) {
      session.settled = true;
      session.reject(rejectError || error || new Error('Video call connection ended.'));
    }
    this.muted = false;
    this.cameraOff = false;
    this.roomId = null;
    this.pin = null;
    this.onState('disconnected');
  }
}
