import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseGroupWebRTCOptions {
  sessionId: string;
  localUserId: string;
  participantIds: string[];
  enabled: boolean;
}

interface PeerState {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  isSettingRemote: boolean;
}

export function useGroupWebRTC({ sessionId, localUserId, participantIds, enabled }: UseGroupWebRTCOptions) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());

  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    peersRef.current.forEach(peer => peer.pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analysersRef.current.clear();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setConnected(false);
    setSpeakingPeers(new Set());
  }, []);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  const createPeerConnection = useCallback((remoteUserId: string, channel: ReturnType<typeof supabase.channel>) => {
    if (peersRef.current.has(remoteUserId)) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const peerState: PeerState = { pc, makingOffer: false, isSettingRemote: false };
    peersRef.current.set(remoteUserId, peerState);

    const isPolite = localUserId > remoteUserId;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Handle remote track
    pc.ontrack = (e) => {
      if (e.streams[0]) {
        // Create audio element for this peer
        let audioEl = document.getElementById(`remote-audio-${remoteUserId}`) as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = `remote-audio-${remoteUserId}`;
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = e.streams[0];

        // Analyser for speaking detection
        try {
          const ctx = audioContextRef.current || new AudioContext();
          audioContextRef.current = ctx;
          const src = ctx.createMediaStreamSource(e.streams[0]);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          analysersRef.current.set(remoteUserId, analyser);
        } catch (err) {
          console.warn('Analyser error for', remoteUserId, err);
        }
      }
    };

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: localUserId, to: remoteUserId, type: 'ice-candidate', candidate: e.candidate },
        });
      }
    };

    // Negotiation needed
    pc.onnegotiationneeded = async () => {
      try {
        peerState.makingOffer = true;
        await pc.setLocalDescription();
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: localUserId, to: remoteUserId, type: 'offer', sdp: pc.localDescription },
        });
      } catch (err) {
        console.error('Negotiation error:', err);
      } finally {
        peerState.makingOffer = false;
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setConnected(true);
      if (state === 'failed') pc.restartIce();
    };

    return peerState;
  }, [localUserId]);

  useEffect(() => {
    if (!enabled || !sessionId || !localUserId) return;

    let cancelled = false;

    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      localStreamRef.current = stream;

      // Local speaking analyser
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const localSrc = audioCtx.createMediaStreamSource(stream);
      const localAnalyser = audioCtx.createAnalyser();
      localAnalyser.fftSize = 256;
      localSrc.connect(localAnalyser);
      analysersRef.current.set(localUserId, localAnalyser);

      // Signaling channel
      const channel = supabase.channel(`group-webrtc-${sessionId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      // Handle signals
      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.to !== localUserId || payload.from === localUserId) return;

        let peerState = peersRef.current.get(payload.from);
        if (!peerState) {
          peerState = createPeerConnection(payload.from, channel);
          if (!peerState) return;
        }

        const pc = peerState.pc;
        const isPolite = localUserId > payload.from;

        try {
          if (payload.type === 'offer' || payload.type === 'answer') {
            const description = new RTCSessionDescription(payload.sdp);
            const offerCollision = payload.type === 'offer' &&
              (peerState.makingOffer || pc.signalingState !== 'stable');

            if (offerCollision && !isPolite) return;

            peerState.isSettingRemote = true;
            await pc.setRemoteDescription(description);
            peerState.isSettingRemote = false;

            if (payload.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { from: localUserId, to: payload.from, type: 'answer', sdp: pc.localDescription },
              });
            }
          } else if (payload.type === 'ice-candidate' && payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              if (!peerState.isSettingRemote) console.warn('ICE error:', e);
            }
          }
        } catch (err) {
          console.error('Signal error:', err);
        }
      });

      // Ready signal
      channel.on('broadcast', { event: 'ready' }, ({ payload }) => {
        if (payload.from === localUserId) return;
        if (!peersRef.current.has(payload.from)) {
          createPeerConnection(payload.from, channel);
        }
      });

      await channel.subscribe();

      // Send ready with retries
      const sendReady = () => {
        channel.send({ type: 'broadcast', event: 'ready', payload: { from: localUserId } });
      };
      sendReady();
      setTimeout(sendReady, 1000);
      setTimeout(sendReady, 3000);

      // Create connections to existing participants
      participantIds.forEach(pid => {
        createPeerConnection(pid, channel);
      });

      // Speaking detection
      const detectSpeaking = () => {
        const speaking = new Set<string>();
        analysersRef.current.forEach((analyser, peerId) => {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          if (avg > 15) speaking.add(peerId);
        });
        setSpeakingPeers(speaking);
        animFrameRef.current = requestAnimationFrame(detectSpeaking);
      };
      detectSpeaking();
    };

    start().catch(err => console.error('Group WebRTC error:', err));

    return () => {
      cancelled = true;
      cleanup();
      // Remove dynamically created audio elements
      document.querySelectorAll('audio[id^="remote-audio-"]').forEach(el => el.remove());
    };
  }, [enabled, sessionId, localUserId, participantIds.join(','), createPeerConnection, cleanup]);

  return { connected, muted, toggleMute, speakingPeers, cleanup };
}
