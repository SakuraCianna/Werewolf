import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  GameState,
  WSMessage,
  Language,
  Camp,
} from 'voice-werewolf-shared';

export interface UseGameSocketOptions {
  onAudioChunkReceived?: (speakerId: number, base64: string) => void;
}

export function useGameSocket(options: UseGameSocketOptions = {}) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<{
    speakerId: number;
    text: string;
    isFinal: boolean;
  } | null>(null);
  const [gameResult, setGameResult] = useState<{
    winner: Camp;
    message: string;
  } | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl =
      window.location.protocol === 'https:'
        ? `wss://${window.location.hostname}:3001`
        : `ws://${window.location.hostname}:3001`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const payload = msg.payload as Record<string, unknown>;

        switch (msg.type) {
          case 'GAME_STATE_SYNC':
            setGameState(payload.state as GameState);
            break;

          case 'PHASE_CHANGE':
            setAnnouncement(payload.announcement as string);
            break;

          case 'SPEECH_START':
            setActiveSpeakerId(payload.speakerId as number);
            setLiveTranscript(null);
            break;

          case 'SPEECH_END':
            setActiveSpeakerId(null);
            break;

          case 'TRANSCRIPT_STREAM':
            setLiveTranscript({
              speakerId: payload.speakerId as number,
              text: payload.text as string,
              isFinal: payload.isFinal as boolean,
            });
            break;

          case 'AUDIO_CHUNK':
            if (optionsRef.current.onAudioChunkReceived) {
              optionsRef.current.onAudioChunkReceived(
                payload.speakerId as number,
                payload.audioBase64 as string,
              );
            }
            break;

          case 'GAME_FINISHED':
            setGameResult({
              winner: payload.winner as Camp,
              message: payload.message as string,
            });
            break;
        }
      } catch {
        // ignore non-json
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const send = useCallback(<T>(type: string, payload: T) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const startGame = useCallback(
    (language: Language) => {
      send('START_GAME', { language });
      setGameResult(null);
    },
    [send],
  );

  const sendAudioChunk = useCallback(
    (pcmBase64: string) => {
      send('USER_AUDIO_CHUNK', { pcmBase64 });
    },
    [send],
  );

  const endSpeech = useCallback(() => {
    send('USER_END_SPEECH', {});
  }, [send],);

  const sendNightAction = useCallback(
    (action: 'KILL' | 'CHECK' | 'SAVE' | 'POISON' | 'PASS', targetId?: number) => {
      send('USER_NIGHT_ACTION', { action, targetId });
    },
    [send],
  );

  const sendVote = useCallback(
    (targetId: number) => {
      send('USER_VOTE', { targetId });
    },
    [send],
  );

  const skipTurn = useCallback(() => {
    send('DEV_SKIP_TURN', {});
  }, [send]);

  const simulateSpeech = useCallback(
    (text: string) => {
      send('DEV_SIMULATE_SPEECH', { text });
    },
    [send],
  );

  return {
    gameState,
    isConnected,
    announcement,
    activeSpeakerId,
    liveTranscript,
    gameResult,
    startGame,
    sendAudioChunk,
    endSpeech,
    sendNightAction,
    sendVote,
    skipTurn,
    simulateSpeech,
  };
}
