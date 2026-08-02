(() => {
  "use strict";

  const DEFAULT_CONFIG = {
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    maxPeers: 8,
    iceCandidatePoolSize: 4,
    bundlePolicy: "max-bundle"
  };

  class RivoVoiceRoom {
    constructor(options = {}) {
      this.getProfile = options.getProfile || (() => null);
      this.getTransport = options.getTransport || (() => null);
      this.onRemoteCount = options.onRemoteCount || (() => {});
      this.onConnectionState = options.onConnectionState || (() => {});
      this.onError = options.onError || (() => {});

      this.config = { ...DEFAULT_CONFIG, ...(window.RIVO_VOICE_CONFIG || {}) };
      this.users = new Map();
      this.peers = new Map();
      this.localStream = null;
      this.localActive = false;
      this.remoteReady = new Set();
      this.transportConnected = false;

      this.playbackContext = null;
      this.masterGain = null;
      this.playbackMuted = false;
      this.playbackUnlocked = false;
      this.destroyed = false;
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

    async unlockPlayback() {
      if (this.destroyed) return false;

      try {
        if (!this.playbackContext || this.playbackContext.state === "closed") {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) {
            this.onError("المتصفح لا يدعم تشغيل صوت الغرفة.");
            return false;
          }

          this.playbackContext = new AudioContextClass({
            latencyHint: "interactive"
          });
          this.masterGain = this.playbackContext.createGain();
          this.masterGain.gain.value = this.playbackMuted ? 0 : 1;
          this.masterGain.connect(this.playbackContext.destination);
        }

        if (this.playbackContext.state !== "running") {
          await this.playbackContext.resume();
        }

        this.playbackUnlocked = this.playbackContext.state === "running";
        this.attachAllRemoteStreams();
        return this.playbackUnlocked;
      } catch (error) {
        console.error("Audio playback unlock failed", error);
        this.onError("اضغط زر صوت الغرفة مرة واحدة لتشغيل أصوات المستخدمين.");
        return false;
      }
    }

    setPlaybackMuted(muted) {
      this.playbackMuted = Boolean(muted);
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(
          this.playbackMuted ? 0 : 1,
          this.playbackContext?.currentTime || 0,
          0.02
        );
      }
      return this.playbackMuted;
    }

    isPlaybackMuted() {
      return this.playbackMuted;
    }

    isPlaybackUnlocked() {
      return Boolean(
        this.playbackUnlocked &&
        this.playbackContext &&
        this.playbackContext.state === "running"
      );
    }

    setTransportStatus(status) {
      this.transportConnected = status === "connected";

      if (this.transportConnected && this.localActive) {
        this.sendReady(true);
        this.ensureConnectionsForUsers();
      }
    }

    updateUsers(users = []) {
      const localId = this.localId();
      const next = new Map();

      for (const user of users) {
        if (!user?.clientId || user.clientId === localId) continue;
        next.set(user.clientId, user);
      }

      for (const peerId of this.peers.keys()) {
        if (!next.has(peerId)) this.closePeer(peerId);
      }

      this.users = next;

      if (this.localActive) {
        this.ensureConnectionsForUsers();
        for (const peerId of this.users.keys()) {
          this.sendReady(true, peerId);
        }
      }
    }

    ensureConnectionsForUsers() {
      if (!this.localActive) return;

      let connected = 0;
      for (const peerId of this.users.keys()) {
        if (connected >= Number(this.config.maxPeers || 8)) break;
        const state = this.ensurePeer(peerId);
        this.attachLocalTrack(state).catch((error) => {
          console.error("Could not attach microphone", error);
        });
        connected++;
      }
    }

    async startLocalAudio(stream) {
      if (!stream?.getAudioTracks?.().length) {
        throw new Error("No audio track was provided");
      }

      this.localStream = stream;
      this.localActive = true;
      await this.unlockPlayback();
      this.sendReady(true);
      this.ensureConnectionsForUsers();
    }

    async stopLocalAudio() {
      const wasActive = this.localActive;
      this.localActive = false;
      this.localStream = null;

      for (const state of this.peers.values()) {
        if (state.sender) {
          try {
            await state.sender.replaceTrack(null);
          } catch (error) {
            console.warn("Could not detach microphone track", error);
          }
        }
      }

      if (wasActive) this.sendReady(false);
    }

    sendReady(active, to = "") {
      this.send({
        type: "rtc-ready",
        active: Boolean(active),
        to: to || undefined
      });
    }

    handleEvent(event) {
      if (!event || typeof event !== "object") return false;

      if (event.type === "rtc-ready") {
        this.handleReady(event);
        return true;
      }

      if (event.type === "rtc-signal") {
        this.handleSignal(event).catch((error) => {
          console.error("RTC signaling error", error);
          this.onError("حدث خطأ أثناء ربط صوت أحد المستخدمين.");
        });
        return true;
      }

      return false;
    }

    handleReady(event) {
      const peerId = String(event.from || "");
      if (!peerId || peerId === this.localId()) return;

      if (event.active) {
        this.remoteReady.add(peerId);
        this.ensurePeer(peerId);

        // Tell a newly discovered speaker whether this client is also speaking.
        if (this.localActive) this.sendReady(true, peerId);
      } else {
        this.remoteReady.delete(peerId);

        const state = this.peers.get(peerId);
        if (state?.remoteStream) {
          for (const track of state.remoteStream.getTracks()) {
            if (track.readyState === "live") track.stop();
          }
        }
        this.detachRemoteAudio(state);

        // Keep the connection if our own microphone is still active.
        if (!this.localActive) this.closePeer(peerId);
      }
    }

    ensurePeer(peerId) {
      if (!peerId || peerId === this.localId()) return null;
      const existing = this.peers.get(peerId);
      if (existing && existing.pc.signalingState !== "closed") return existing;

      const rtcConfig = {
        iceServers: this.config.iceServers || DEFAULT_CONFIG.iceServers,
        iceCandidatePoolSize: Number(this.config.iceCandidatePoolSize || 0),
        bundlePolicy: this.config.bundlePolicy || "max-bundle"
      };

      const pc = new RTCPeerConnection(rtcConfig);
      const state = {
        peerId,
        pc,
        polite: this.localId().localeCompare(peerId) > 0,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        suppressNegotiation: false,
        pendingCandidates: [],
        sender: null,
        remoteStream: null,
        sourceNode: null,
        gainNode: null,
        reconnectTimer: null
      };

      this.peers.set(peerId, state);

      pc.addEventListener("icecandidate", ({ candidate }) => {
        if (!candidate) return;
        this.sendSignal(peerId, {
          candidate: candidate.toJSON ? candidate.toJSON() : candidate
        });
      });

      pc.addEventListener("track", (event) => {
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        this.attachRemoteAudio(state, stream);

        event.track.addEventListener("ended", () => {
          this.detachRemoteAudio(state);
        }, { once: true });

        event.track.addEventListener("mute", () => {
          this.updateRemoteCount();
        });

        event.track.addEventListener("unmute", () => {
          this.attachRemoteAudio(state, stream);
        });
      });

      pc.addEventListener("negotiationneeded", async () => {
        if (state.suppressNegotiation || pc.signalingState === "closed") return;

        try {
          state.makingOffer = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== "stable") return;
          await pc.setLocalDescription(offer);
          this.sendSignal(peerId, {
            description: {
              type: pc.localDescription.type,
              sdp: pc.localDescription.sdp
            }
          });
        } catch (error) {
          console.error("Negotiation failed", peerId, error);
        } finally {
          state.makingOffer = false;
        }
      });

      pc.addEventListener("connectionstatechange", () => {
        const connectionState = pc.connectionState;
        this.onConnectionState(peerId, connectionState);

        if (connectionState === "connected") {
          clearTimeout(state.reconnectTimer);
          state.reconnectTimer = null;
          this.updateRemoteCount();
          return;
        }

        if (connectionState === "failed") {
          try {
            pc.restartIce();
          } catch {}

          clearTimeout(state.reconnectTimer);
          state.reconnectTimer = setTimeout(() => {
            if (this.localActive || this.remoteReady.has(peerId)) {
              this.closePeer(peerId);
              const replacement = this.ensurePeer(peerId);
              if (this.localActive) {
                this.attachLocalTrack(replacement).catch(console.error);
              }
            }
          }, 1800);
          return;
        }

        if (connectionState === "closed") {
          this.detachRemoteAudio(state);
        }
      });

      pc.addEventListener("iceconnectionstatechange", () => {
        if (pc.iceConnectionState === "disconnected") {
          clearTimeout(state.reconnectTimer);
          state.reconnectTimer = setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              try { pc.restartIce(); } catch {}
            }
          }, 3500);
        }
      });

      if (this.localActive) {
        this.attachLocalTrack(state).catch(console.error);
      }

      return state;
    }

    async attachLocalTrack(state) {
      if (!state || !this.localActive || !this.localStream) return;
      const track = this.localStream.getAudioTracks()[0];
      if (!track) return;

      if (state.sender) {
        if (state.sender.track !== track) {
          await state.sender.replaceTrack(track);
        }
        return;
      }

      state.sender = state.pc.addTrack(track, this.localStream);
    }

    sendSignal(to, signal) {
      this.send({
        type: "rtc-signal",
        to,
        signal
      });
    }

    async handleSignal(event) {
      const localId = this.localId();
      const from = String(event.from || "");
      if (!from || from === localId) return;
      if (event.to && event.to !== localId) return;

      const state = this.ensurePeer(from);
      if (!state) return;

      const pc = state.pc;
      const signal = event.signal || {};
      const description = signal.description;
      const candidate = signal.candidate;

      if (description) {
        const readyForOffer =
          !state.makingOffer &&
          (pc.signalingState === "stable" || state.isSettingRemoteAnswerPending);

        const offerCollision =
          description.type === "offer" &&
          !readyForOffer;

        state.ignoreOffer = !state.polite && offerCollision;
        if (state.ignoreOffer) return;

        state.isSettingRemoteAnswerPending = description.type === "answer";

        try {
          if (offerCollision && state.polite) {
            await pc.setLocalDescription({ type: "rollback" });
          }

          await pc.setRemoteDescription(description);
          state.isSettingRemoteAnswerPending = false;

          await this.flushPendingCandidates(state);

          if (description.type === "offer") {
            state.suppressNegotiation = true;
            try {
              if (this.localActive) await this.attachLocalTrack(state);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              this.sendSignal(from, {
                description: {
                  type: pc.localDescription.type,
                  sdp: pc.localDescription.sdp
                }
              });
            } finally {
              state.suppressNegotiation = false;
            }
          }
        } catch (error) {
          state.isSettingRemoteAnswerPending = false;
          throw error;
        }
      }

      if (candidate) {
        if (!pc.remoteDescription) {
          state.pendingCandidates.push(candidate);
          return;
        }

        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          if (!state.ignoreOffer) throw error;
        }
      }
    }

    async flushPendingCandidates(state) {
      if (!state?.pc.remoteDescription || !state.pendingCandidates.length) return;

      const pending = state.pendingCandidates.splice(0);
      for (const candidate of pending) {
        try {
          await state.pc.addIceCandidate(candidate);
        } catch (error) {
          if (!state.ignoreOffer) console.warn("ICE candidate rejected", error);
        }
      }
    }

    async attachRemoteAudio(state, stream) {
      if (!state || !stream) return;

      state.remoteStream = stream;
      await this.unlockPlayback();

      if (!this.playbackContext || !this.masterGain) {
        this.onError("تعذر تشغيل صوت المستخدم الآخر. اضغط زر صوت الغرفة.");
        return;
      }

      if (state.sourceNode) {
        this.updateRemoteCount();
        return;
      }

      try {
        state.sourceNode = this.playbackContext.createMediaStreamSource(stream);
        state.gainNode = this.playbackContext.createGain();
        state.gainNode.gain.value = 1;
        state.sourceNode.connect(state.gainNode);
        state.gainNode.connect(this.masterGain);
        this.updateRemoteCount();
      } catch (error) {
        console.error("Remote audio attachment failed", error);
        this.onError("وصل الصوت لكن المتصفح منع تشغيله. اضغط صوت الغرفة.");
      }
    }

    attachAllRemoteStreams() {
      for (const state of this.peers.values()) {
        if (state.remoteStream && !state.sourceNode) {
          this.attachRemoteAudio(state, state.remoteStream).catch(console.error);
        }
      }
    }

    detachRemoteAudio(state) {
      if (!state) return;

      try { state.sourceNode?.disconnect(); } catch {}
      try { state.gainNode?.disconnect(); } catch {}

      state.sourceNode = null;
      state.gainNode = null;
      state.remoteStream = null;
      this.updateRemoteCount();
    }

    updateRemoteCount() {
      let count = 0;
      for (const state of this.peers.values()) {
        const tracks = state.remoteStream?.getAudioTracks?.() || [];
        if (tracks.some((track) => track.readyState === "live" && !track.muted)) {
          count++;
        }
      }
      this.onRemoteCount(count);
    }

    closePeer(peerId) {
      const state = this.peers.get(peerId);
      if (!state) return;

      clearTimeout(state.reconnectTimer);
      this.detachRemoteAudio(state);

      try { state.pc.close(); } catch {}
      this.peers.delete(peerId);
      this.remoteReady.delete(peerId);
      this.updateRemoteCount();
    }

    closeAllPeers() {
      for (const peerId of [...this.peers.keys()]) {
        this.closePeer(peerId);
      }
    }

    async destroy() {
      if (this.destroyed) return;
      this.destroyed = true;

      try {
        await this.stopLocalAudio();
      } catch {}

      this.closeAllPeers();
      this.users.clear();
      this.remoteReady.clear();

      try {
        await this.playbackContext?.close();
      } catch {}

      this.playbackContext = null;
      this.masterGain = null;
      this.playbackUnlocked = false;
      this.onRemoteCount(0);
    }
  }

  window.RivoVoiceRoom = RivoVoiceRoom;
})();
