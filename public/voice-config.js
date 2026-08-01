window.RIVO_VOICE_CONFIG = {
  iceServers: [
    {
      urls: [
        "stun:stun.cloudflare.com:3478"
      ]
    }
  ],
  maxPeers: 8,
  iceCandidatePoolSize: 4,
  bundlePolicy: "max-bundle"
};
