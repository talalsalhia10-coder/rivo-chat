(() => {
  "use strict";

  const MIME_CANDIDATES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus"
  ];

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const step = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  function base64ToUint8Array(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  class RivoRelayAudio {
    constructor(options = {}) {
      this.getProfile = options.getProfile || (() => null);
      this.getTransport = options.getTransport || (() => null);
      this.onRemoteCount = options.onRemoteCount || (() => {});
      this.onError = options.onError || (() => {});

      this.recorder = null;
      this.captureSessionId = "";
      this.captureSequence = 0;
      this.captureMime = "";
      this.captureActive = false;

      this.audio = document.createElement("audio");
      this.audio.autoplay = true;
      this.audio.playsInline = true;
      this.audio.preload = "auto";
      this.audio.setAttribute("aria-hidden", "true");
      this.audio.style.position = "fixed";
      this.audio.style.width = "1px";
      this.audio.style.height = "1px";
      this.audio.style.opacity = "0";
      this.audio.style.pointerEvents = "none";
      document.body.appendChild(this.audio);

      this.unlocked = false;
      this.muted = false;
      this.remoteSessionId = "";
      this.remoteFrom = "";
      this.remoteMime = "";
      this.mediaSource = null;
      this.sourceBuffer = null;
      this.objectUrl = "";
      this.queue = [];
      this.ending = false;
      this.remoteActive = false;
    }

    localId() {
      return this.getProfile()?.clientId || "";
    }

    transport() {
      return this.getTransport?.() || null;
    }

    send(payload) {
      const transport = this.transport();
      if (!transport?.isReady?.()) return false;
      transport.send(payload);
      return true;
    }

    isCaptureSupported() {
      return typeof MediaRecorder !== "undefined" && Boolean(this.pickMime());
    }

    pickMime() {
      if (typeof MediaRecorder === "undefined") return "";
      return MIME_CANDIDATES.find((mime) => {
        try { return MediaRecorder.isTypeSupported(mime); } catch { return false; }
      }) || "";
    }

    async unlock() {
      this.unlocked = true;
      this.audio.muted = this.muted;

      // A tiny silent WAV is played during the user's gesture. This grants
      // future playback permission on Chrome/Android before remote audio arrives.
      if (!this.audio.src && !this.audio.srcObject) {
        this.audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        try {
          await this.audio.play();
          this.audio.pause();
          this.audio.removeAttribute("src");
          this.audio.load();
        } catch {}
      }

      if (this.mediaSource && this.objectUrl) {
        try { await this.audio.play(); } catch {}
      }
      return true;
    }

    isUnlocked() {
      return this.unlocked;
    }

    setMuted(value) {
      this.muted = Boolean(value);
      this.audio.muted = this.muted;
      return this.muted;
    }

    isMuted() {
      return this.muted;
    }

    async startCapture(stream) {
      if (!stream?.getAudioTracks?.().length) {
        throw new Error("No microphone audio track");
      }
      if (!this.isCaptureSupported()) {
        throw new Error("MediaRecorder Opus is not supported");
      }

      await this.stopCapture();

      this.captureMime = this.pickMime();
      this.captureSessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      this.captureSequence = 0;
      this.captureActive = true;

      const options = {
        mimeType: this.captureMime,
        audioBitsPerSecond: 32000
      };

      try {
        this.recorder = new MediaRecorder(stream, options);
      } catch {
        this.recorder = new MediaRecorder(stream, { mimeType: this.captureMime });
      }

      this.recorder.addEventListener("dataavailable", async (event) => {
        if (!this.captureActive || !event.data || event.data.size < 1) return;
        try {
          const buffer = await event.data.arrayBuffer();
          const encoded = arrayBufferToBase64(buffer);
          if (!encoded || encoded.length > 120000) return;
          this.send({
            type: "audio-opus",
            sessionId: this.captureSessionId,
            seq: this.captureSequence++,
            mime: this.captureMime,
            data: encoded
          });
        } catch (error) {
          console.warn("Could not relay microphone chunk", error);
        }
      });

      this.recorder.addEventListener("error", (event) => {
        console.error("Audio relay recorder error", event.error || event);
        this.onError("حدث خطأ أثناء إرسال الصوت. أوقف المايك وشغله مرة أخرى.");
      });

      this.recorder.start(240);
    }

    async stopCapture() {
      const previousSession = this.captureSessionId;
      this.captureActive = false;
      this.captureSessionId = "";

      if (this.recorder && this.recorder.state !== "inactive") {
        try {
          this.recorder.requestData();
          this.recorder.stop();
        } catch {}
      }
      this.recorder = null;

      if (previousSession) {
        this.send({ type: "audio-opus-end", sessionId: previousSession });
      }
    }

    handleEvent(event) {
      if (!event || typeof event !== "object") return false;
      if (event.type === "audio-opus") {
        this.receiveChunk(event);
        return true;
      }
      if (event.type === "audio-opus-end") {
        this.endRemote(event);
        return true;
      }
      return false;
    }

    receiveChunk(event) {
      if (!event.data || !event.sessionId || event.from === this.localId()) return;
      const mime = String(event.mime || "audio/webm;codecs=opus");
      if (!window.MediaSource || !MediaSource.isTypeSupported(mime)) {
        this.onError("المتصفح لا يدعم تشغيل صوت الغرفة بهذه الصيغة.");
        return;
      }

      if (this.remoteSessionId !== event.sessionId || this.remoteFrom !== event.from) {
        this.resetRemote();
        this.remoteSessionId = String(event.sessionId);
        this.remoteFrom = String(event.from || "");
        this.remoteMime = mime;
        this.createMediaPipeline(mime);
      }

      try {
        this.queue.push(base64ToUint8Array(String(event.data)));
        this.pump();
        if (!this.remoteActive) {
          this.remoteActive = true;
          this.onRemoteCount(1);
        }
      } catch (error) {
        console.warn("Invalid relayed audio chunk", error);
      }
    }

    createMediaPipeline(mime) {
      this.mediaSource = new MediaSource();
      this.objectUrl = URL.createObjectURL(this.mediaSource);
      this.audio.src = this.objectUrl;
      this.audio.muted = this.muted;

      this.mediaSource.addEventListener("sourceopen", () => {
        if (!this.mediaSource || this.mediaSource.readyState !== "open") return;
        try {
          this.sourceBuffer = this.mediaSource.addSourceBuffer(mime);
          this.sourceBuffer.mode = "sequence";
          this.sourceBuffer.addEventListener("updateend", () => {
            this.trimBuffer();
            this.pump();
          });
          this.sourceBuffer.addEventListener("error", () => {
            this.onError("انقطع صوت الغرفة. أوقف المايك وشغله مرة أخرى.");
          });
          this.pump();
          if (this.unlocked) this.audio.play().catch(() => {});
        } catch (error) {
          console.error("Could not create audio source buffer", error);
          this.onError("تعذر تهيئة تشغيل صوت الغرفة في هذا المتصفح.");
        }
      }, { once: true });
    }

    pump() {
      if (!this.sourceBuffer || this.sourceBuffer.updating || !this.queue.length) return;
      if (!this.mediaSource || this.mediaSource.readyState !== "open") return;

      const chunk = this.queue.shift();
      try {
        this.sourceBuffer.appendBuffer(chunk);
        if (this.unlocked) this.audio.play().catch(() => {});
      } catch (error) {
        console.warn("Audio append failed", error);
        this.queue.unshift(chunk);
      }
    }

    trimBuffer() {
      const buffered = this.audio.buffered;
      if (!buffered?.length) return;
      const end = buffered.end(buffered.length - 1);

      // Stay close to the live edge instead of accumulating delay.
      if (end - this.audio.currentTime > 1.8) {
        try { this.audio.currentTime = Math.max(0, end - 0.35); } catch {}
      }

      if (end > 20 && this.sourceBuffer && !this.sourceBuffer.updating) {
        try { this.sourceBuffer.remove(0, Math.max(0, end - 8)); } catch {}
      }
    }

    endRemote(event) {
      if (event.sessionId && event.sessionId !== this.remoteSessionId) return;
      this.ending = true;
      this.remoteActive = false;
      this.onRemoteCount(0);

      setTimeout(() => {
        if (this.queue.length || this.sourceBuffer?.updating) return;
        try {
          if (this.mediaSource?.readyState === "open") this.mediaSource.endOfStream();
        } catch {}
      }, 500);
    }

    resetRemote() {
      this.queue = [];
      this.ending = false;
      this.remoteActive = false;
      this.onRemoteCount(0);

      try { this.audio.pause(); } catch {}
      try {
        if (this.mediaSource?.readyState === "open") this.mediaSource.endOfStream();
      } catch {}
      if (this.objectUrl) {
        try { URL.revokeObjectURL(this.objectUrl); } catch {}
      }

      this.audio.removeAttribute("src");
      this.audio.load();
      this.mediaSource = null;
      this.sourceBuffer = null;
      this.objectUrl = "";
      this.remoteSessionId = "";
      this.remoteFrom = "";
      this.remoteMime = "";
    }

    async destroy() {
      await this.stopCapture();
      this.resetRemote();
      this.audio.remove();
    }
  }

  window.RivoRelayAudio = RivoRelayAudio;
})();
