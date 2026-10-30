import Janus from 'janus-gateway';
import adapter from 'webrtc-adapter';

let janusInit = null;

function initJanus() {
  if (!janusInit) {
    janusInit = new Promise((resolve) => {
      Janus.init({
        debug: 'warn',
        dependencies: Janus.useDefaultDependencies({ adapter }),
        callback: resolve,
      });
    });
  }
  return janusInit;
}

export class VoiceCall {
  constructor({
    server,
    audioContainer = document.body,
    onState = () => {},
    onError = () => {},
    onMessage = () => {},
  }) {
    this.server = server;
    this.audioContainer = audioContainer;
    this.onState = onState;
    this.onError = onError;
    this.onMessage = onMessage; 

    this._s = null; 
    this._muted = false;
    this._volume = 1;
  }

  get muted() {
    return this._muted;
  }

  get inCall() {
    return this._s !== null;
  }

  
  async join({ roomId, pin, display = 'Guest', muted = false }) {
    if (!this.server) {
      throw new Error('Janus server URL is missing.');
    }

    
    this.leave();

    const s = {
      janus: null,
      handle: null,
      offered: false,
      settled: false,
      resolve: null,
      reject: null,
      audios: new Map(),
    };
    this._s = s;

    await initJanus();
    if (this._s !== s) throw new Error('Join cancelled.');

    this.onState('connecting');

    await new Promise((resolve, reject) => {
      s.resolve = resolve;
      s.reject = reject;

      const janus = new Janus({
        server: this.server,

        success: () =>
          janus.attach({
            plugin: 'janus.plugin.audiobridge',

            success: (handle) => {
              if (this._s !== s) return;
              s.handle = handle;

              const request = {
                request: 'join',
                room: Number(roomId),
                display,
              };
              if (pin) request.pin = pin;

              handle.send({ message: request });
            },

            error: (e) =>
              this._fail(s, new Error(`AudioBridge attach failed: ${e}`)),

            onmessage: (msg, jsep) => this._onMessage(s, msg, jsep, muted),

            onlocaltrack: () => {},

            onremotetrack: (track, mid, added) =>
              this._onRemoteTrack(s, track, mid, added),

            oncleanup: () => {
              if (this._s === s) this.onState('disconnected');
            },
          }),

        error: (e) =>
          this._fail(s, new Error(`Janus connection failed: ${e}`)),

        destroyed: () => {
          if (this._s === s) {
            this._s = null;
            this.onState('disconnected');
          }
        },
      });

      s.janus = janus;
    });
  }

  setMuted(muted) {
    const s = this._s;
    if (!s || !s.handle) return this._muted;

    this._muted = Boolean(muted);
    s.handle.send({
      message: { request: 'configure', muted: this._muted },
    });
    return this._muted;
  }

  
  setVolume(volume) {
    this._volume = Math.min(1, Math.max(0, Number(volume)));
    if (this._s) {
      this._s.audios.forEach((audio) => {
        audio.volume = this._volume;
      });
    }
  }

  
  async resumePlayback() {
    const audios = this._s ? [...this._s.audios.values()] : [];
    const results = await Promise.allSettled(audios.map((a) => a.play()));
    const ok = results.every((r) => r.status === 'fulfilled');
    if (ok) this.onState('connected');
    return ok;
  }

  leave() {
    const s = this._s;
    if (!s) return;
    this._s = null;

    try {
      if (s.handle) s.handle.send({ message: { request: 'leave' } });
    } catch (_) {
      
    }

    try {
      if (s.janus) s.janus.destroy();
    } catch (_) {
      
    }

    s.audios.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });
    s.audios.clear();

    if (!s.settled && s.reject) {
      s.settled = true;
      s.reject(new Error('Call left before it connected.'));
    }

    this.onState('disconnected');
  }

  

  _fail(s, error) {
    if (this._s !== s) return;
    this.onError(error);
    if (!s.settled && s.reject) {
      s.settled = true;
      s.reject(error);
    }
  }

  _onMessage(s, msg, jsep, startMuted) {
    if (this._s !== s) return;
    const handle = s.handle;

    this.onMessage(msg);

    const event = msg && msg.audiobridge;

    if (event === 'joined') {
      
      
      if (!s.offered) {
        s.offered = true;

        handle.createOffer({
          media: { audio: true, video: false },

          success: (offer) => {
            if (this._s !== s) return;

            handle.send({
              message: { request: 'configure', muted: startMuted },
              jsep: offer,
            });

            this._muted = startMuted;
            this.onState('connected');

            if (!s.settled) {
              s.settled = true;
              s.resolve();
            }
          },

          error: (e) =>
            this._fail(s, new Error(`Microphone offer failed: ${e}`)),
        });
      }
    } else if (event === 'event' && msg.error) {
      this._fail(s, new Error(`AudioBridge error: ${msg.error}`));
    }

    if (jsep) handle.handleRemoteJsep({ jsep });
  }

  _onRemoteTrack(s, track, mid, added) {
    if (this._s !== s) return;
    if (!track || track.kind !== 'audio') return;

    const id = String(mid ?? track.id);
    let audio = s.audios.get(id);

    if (added) {
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        this.audioContainer.append(audio);
        s.audios.set(id, audio);
      }

      audio.srcObject = new MediaStream([track]);
      audio.volume = this._volume;

      audio.play().catch(() => this.onState('autoplay-blocked'));
    } else if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      s.audios.delete(id);
    }
  }
}
