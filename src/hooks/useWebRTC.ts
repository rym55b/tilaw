import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

interface UseWebRTCOptions {
  sessionId: string;
  localUserId: string;
  remoteUserId: string;
  enabled: boolean;
}

export function useWebRTC({ sessionId, localUserId, remoteUserId, enabled }: UseWebRTCOptions) {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteIsSpeaking, setRemoteIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const makingOfferRef = useRef(false);
  const isSettingRemoteRef = useRef(false);

  const isPolite = localUserId > remoteUserId; // polite peer yields on collision

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setConnected(false);
  }, []);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId || !localUserId || !remoteUserId) return;

    let cancelled = false;

    const start = async () => {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      localStreamRef.current = stream;

      // Audio analysis for speaking indicator
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Remote track handling
      pc.ontrack = (e) => {
        const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement;
        if (remoteAudio && e.streams[0]) {
          remoteAudio.srcObject = e.streams[0];
          try {
            const remoteCtx = new AudioContext();
            const remoteSrc = remoteCtx.createMediaStreamSource(e.streams[0]);
            const remoteAn = remoteCtx.createAnalyser();
            remoteAn.fftSize = 256;
            remoteSrc.connect(remoteAn);
            remoteAnalyserRef.current = remoteAn;
          } catch (err) {
            console.warn('Remote analyser error:', err);
          }
        }
        setConnected(true);
      };

      // Signaling channel via Supabase Realtime broadcast
      const channel = supabase.channel(`webrtc-${sessionId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      // "Perfect negotiation" pattern - handle signals
      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!pcRef.current || payload.from === localUserId) return;
        const pc = pcRef.current;

        try {
          if (payload.type === 'offer' || payload.type === 'answer') {
            const description = new RTCSessionDescription(payload.sdp);
            const offerCollision = payload.type === 'offer' &&
              (makingOfferRef.current || pc.signalingState !== 'stable');

            if (offerCollision && !isPolite) {
              // Impolite peer ignores the offer collision
              console.log('Ignoring colliding offer (impolite)');
              return;
            }

            isSettingRemoteRef.current = true;
            await pc.setRemoteDescription(description);
            isSettingRemoteRef.current = false;

            if (payload.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { from: localUserId, type: 'answer', sdp: pc.localDescription },
              });
            }
          } else if (payload.type === 'ice-candidate' && payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              if (!isSettingRemoteRef.current) {
                console.warn('ICE candidate error:', e);
              }
            }
          }
        } catch (err) {
          console.error('Signal handling error:', err);
        }
      });

      // ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: { from: localUserId, type: 'ice-candidate', candidate: e.candidate },
          });
        }
      };

      // Use negotiationneeded for perfect negotiation
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current = true;
          await pc.setLocalDescription();
          channelRef.current?.send({
            type: 'broadcast',
            event: 'signal',
            payload: { from: localUserId, type: 'offer', sdp: pc.localDescription },
          });
        } catch (err) {
          console.error('Negotiation error:', err);
        } finally {
          makingOfferRef.current = false;
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('WebRTC connection state:', state);
        setConnected(state === 'connected');
        // Retry if failed
        if (state === 'failed') {
          pc.restartIce();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          pc.restartIce();
        }
      };

      // Subscribe to channel
      await channel.subscribe();
      console.log('Subscribed to signaling channel:', `webrtc-${sessionId}`);

      // Announce presence so the other peer knows we're ready
      // Both peers send a "ready" message; when one receives it, it triggers renegotiation
      channel.on('broadcast', { event: 'ready' }, async ({ payload }) => {
        if (payload.from === localUserId) return;
        console.log('Remote peer is ready, triggering negotiation');
        // The onnegotiationneeded should already fire from addTrack,
        // but if it didn't (race), we can trigger manually for the initiator
        if (localUserId < remoteUserId && pc.signalingState === 'stable' && !makingOfferRef.current) {
          try {
            makingOfferRef.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { from: localUserId, type: 'offer', sdp: pc.localDescription },
            });
          } catch (err) {
            console.error('Manual offer error:', err);
          } finally {
            makingOfferRef.current = false;
          }
        }
      });

      // Send ready signal with retries to ensure the other peer sees it
      const sendReady = () => {
        channel.send({ type: 'broadcast', event: 'ready', payload: { from: localUserId } });
      };
      // Send multiple times with delay to handle race conditions
      sendReady();
      setTimeout(sendReady, 1000);
      setTimeout(sendReady, 3000);
      setTimeout(sendReady, 6000);

      // Speaking detection loop
      const detectSpeaking = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(avg > 15);
        }
        if (remoteAnalyserRef.current) {
          const data = new Uint8Array(remoteAnalyserRef.current.frequencyBinCount);
          remoteAnalyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setRemoteIsSpeaking(avg > 15);
        }
        animFrameRef.current = requestAnimationFrame(detectSpeaking);
      };
      detectSpeaking();
    };

    start().catch(err => console.error('WebRTC error:', err));

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, sessionId, localUserId, remoteUserId, isPolite, cleanup]);

  return { connected, isSpeaking, remoteIsSpeaking, muted, toggleMute, cleanup };
}
