import Janus from 'janus-gateway';
import { initJanus } from './voice-call.js';

export class VideoCall {
  constructor({ server, onState = () => {}, onParticipants = () => {}, onLocalStream = () => {}, onError = () => {} }) {
    Object.assign(this, { server, onState, onParticipants, onLocalStream, onError });
    this.session = null;
    this.muted = false;
    this.cameraOff = false;
  }

  async join({ roomId, pin, display = 'Guest' }) {
    this.leave();
    if (!this.server) throw new Error('Janus server URL is missing.');
    await initJanus();
    const session = { janus: null, publisher: null, subscribers: new Map(), streams: new Map(), settled: false };
    this.session = session;
    this.roomId = Number(roomId);
    this.display = display;
    this.onState('connecting');
    await new Promise((resolve, reject) => {
      session.resolve = resolve;
      session.reject = reject;
      session.janus = new Janus({
        server: this.server,
        success: () => session.janus.attach({
          plugin: 'janus.plugin.videoroom',
          success: (handle) => {
            if (this.session !== session) return;
            session.publisher = handle;
            const request = { request: 'join', room: this.roomId, ptype: 'publisher', display };
            if (pin) request.pin = pin;
            handle.send({ message: request });
          },
          error: (error) => this.fail(session, new Error(`Video room connection failed: ${error}`)),
          onmessage: (message, jsep) => this.onPublisherMessage(session, message, jsep),
          onlocaltrack: (track, added) => {
            if (this.session !== session) { if (added) track.stop(); return; }
            const stream = session.localStream || new MediaStream();
            if (added && !stream.getTracks().some((item) => item.id === track.id)) stream.addTrack(track);
            if (!added) stream.removeTrack(track);
            session.localStream = stream;
            this.onLocalStream(stream);
          },
          oncleanup: () => this.onLocalStream(null),
        }),
        error: (error) => this.fail(session, new Error(`Janus connection failed: ${error}`)),
        destroyed: () => { if (this.session === session) this.onState('disconnected'); },
      });
    });
  }

  onPublisherMessage(session, message, jsep) {
    if (this.session !== session) return;
    const data = message?.plugindata?.data || message;
    if (data.videoroom === 'joined') {
      session.privateId = data.private_id;
      this.publish(session);
      (data.publishers || []).forEach((publisher) => this.subscribe(session, publisher));
      this.resolve(session);
    } else if (data.videoroom === 'event') {
      (data.publishers || []).forEach((publisher) => this.subscribe(session, publisher));
      (data.leaving || data.unpublished) && this.removeParticipant(session, data.leaving || data.unpublished);
      if (data.error) this.fail(session, new Error(data.error));
    }
    if (jsep) session.publisher.handleRemoteJsep({ jsep });
  }

  publish(session) {
    session.publisher.createOffer({
      media: { audio: true, video: true, data: false },
      success: (jsep) => session.publisher.send({ message: { request: 'configure', audio: true, video: true }, jsep }),
      error: (error) => this.fail(session, new Error(`Camera or microphone unavailable: ${error}`)),
    });
  }

  subscribe(session, publisher) {
    if (!publisher?.id || session.subscribers.has(String(publisher.id))) return;
    const id = String(publisher.id);
    const participant = { id, name: publisher.display || 'Participant', stream: new MediaStream() };
    session.streams.set(id, participant);
    const notify = () => this.onParticipants([...session.streams.values()]);
    session.janus.attach({
      plugin: 'janus.plugin.videoroom',
      success: (handle) => {
        if (this.session !== session) return;
        session.subscribers.set(id, handle);
        handle.send({ message: { request: 'join', room: this.roomId, ptype: 'subscriber', feed: publisher.id, private_id: session.privateId } });
      },
      error: (error) => this.fail(session, new Error(`Could not join participant video: ${error}`)),
      onmessage: (message, jsep) => {
        const handle = session.subscribers.get(id);
        if (jsep && handle) handle.createAnswer({ jsep, media: { audioSend: false, videoSend: false, audioRecv: true, videoRecv: true }, success: (answer) => handle.send({ message: { request: 'start', room: this.roomId }, jsep: answer }), error: (error) => this.fail(session, new Error(`Could not receive participant video: ${error}`)) });
        const data = message?.plugindata?.data || message;
        if (data.error) this.fail(session, new Error(data.error));
      },
      onremotetrack: (track, _mid, added) => {
        if (this.session !== session) return;
        if (added && !participant.stream.getTracks().some((item) => item.id === track.id)) participant.stream.addTrack(track);
        if (!added) participant.stream.removeTrack(track);
        notify();
      },
      oncleanup: () => this.removeParticipant(session, id),
    });
    notify();
  }

  removeParticipant(session, id) {
    const key = String(id);
    session.subscribers.get(key)?.detach();
    session.subscribers.delete(key);
    session.streams.delete(key);
    this.onParticipants([...session.streams.values()]);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.session?.publisher?.send({ message: { request: 'configure', audio: !this.muted, video: !this.cameraOff } });
    this.session?.localStream?.getAudioTracks().forEach((track) => { track.enabled = !this.muted; });
    return this.muted;
  }

  setCameraOff(value) {
    this.cameraOff = Boolean(value);
    this.session?.publisher?.send({ message: { request: 'configure', audio: !this.muted, video: !this.cameraOff } });
    this.session?.localStream?.getVideoTracks().forEach((track) => { track.enabled = !this.cameraOff; });
    return this.cameraOff;
  }

  resumePlayback() {
    document.querySelectorAll('[data-video-call] video').forEach((video) => video.play().catch(() => {}));
    this.onState('connected');
  }

  fail(session, error) {
    if (this.session !== session) return;
    this.onError(error);
    if (!session.settled) { session.settled = true; session.reject(error); }
  }

  resolve(session) {
    if (!session.settled) { session.settled = true; this.onState('connected'); session.resolve(); }
  }

  leave() {
    const session = this.session;
    if (!session) return;
    this.session = null;
    try { session.publisher?.send({ message: { request: 'leave' } }); } catch { /* session is already closing */ }
    session.subscribers.forEach((handle) => { try { handle.detach(); } catch { /* Janus may have detached it already */ } });
    session.localStream?.getTracks().forEach((track) => track.stop());
    session.streams.clear();
    this.onLocalStream(null);
    this.onParticipants([]);
    try { session.janus?.destroy(); } catch { /* Janus may already be destroyed */ }
    if (!session.settled) { session.settled = true; session.reject(new Error('Call left before it connected.')); }
    this.onState('disconnected');
  }
}
