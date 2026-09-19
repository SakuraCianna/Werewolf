import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  GameState,
  WSMessage,
  Language,
  Camp,
  Role,
  SentimentAnalysisResult,
  PostGameReport,
} from 'voice-werewolf-shared';
import { generateRandomRoomId } from 'voice-werewolf-shared';

export interface UseGameSocketOptions {
  onAudioChunkReceived?: (speakerId: number, base64: string) => void;
}

export interface ChronicleItem {
  id: string;
  type: 'SPEECH' | 'ANNOUNCEMENT';
  round: number;
  phase: string;
  speakerId?: number;
  speakerName?: string;
  text: string;
  sentiment?: SentimentAnalysisResult | null;
  timestamp: number;
}

export function useGameSocket(options: UseGameSocketOptions = {}) {
  // 从当前 URL 参数提取或自动随机生成狼人杀特色房间号 (例如: WOLF-8392)
  const getInitialRoomId = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && roomParam.trim()) {
        return roomParam.trim();
      }
    } catch {
      // ignore
    }
    const newRoom = generateRandomRoomId();
    try {
      // 自动同步到浏览器地址栏，便于直接复制分享
      const url = new URL(window.location.href);
      url.searchParams.set('room', newRoom);
      window.history.replaceState(null, '', url.toString());
    } catch {
      // ignore
    }
    return newRoom;
  };

  const [roomId, setRoomId] = useState<string>(getInitialRoomId);
  const [myPlayerId, setMyPlayerId] = useState<number>(1);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [humanCount, setHumanCount] = useState<number>(1);
  const [maxCapacity, setMaxCapacity] = useState<number>(6);
  const [lanIp, setLanIp] = useState<string>('');
  const [rejectionInfo, setRejectionInfo] = useState<{
    reason: 'ROOM_FULL' | 'GAME_ALREADY_STARTED' | 'INVALID_ROOM';
    message: string;
  } | null>(null);

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
  const [latestSentiment, setLatestSentiment] = useState<SentimentAnalysisResult | null>(null);
  const [postGameReport, setPostGameReport] = useState<PostGameReport | null>(null);
  const [chronicleLogs, setChronicleLogs] = useState<ChronicleItem[]>([]);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const wsRef = useRef<WebSocket | null>(null);

  // 探测获取服务端所在的局域网 IP
  useEffect(() => {
    fetch(`http://${window.location.hostname}:3001/api/lan-info`)
      .then((res) => res.json())
      .then((data: { lanIp?: string }) => {
        if (data.lanIp) {
          setLanIp(data.lanIp);
        }
      })
      .catch(() => {
        // 离线或本地单机降级
      });
  }, []);

  const send = useCallback(<T>(type: string, payload: T) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    const wsUrl =
      (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
      `${window.location.hostname}:3001?room=${encodeURIComponent(roomId)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // 连接建立后立刻请求加入当前房间
      ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          payload: { roomId },
        }),
      );
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const payload = msg.payload as Record<string, unknown>;

        switch (msg.type) {
          case 'ROOM_INFO_SYNC':
            setRoomId(payload.roomId as string);
            setMyPlayerId(payload.myPlayerId as number);
            setIsHost(Boolean(payload.isHost));
            setHumanCount((payload.humanCount as number) || 1);
            setMaxCapacity((payload.maxCapacity as number) || 6);
            setRejectionInfo(null);
            break;

          case 'JOIN_REJECTED':
            setRejectionInfo({
              reason: payload.reason as 'ROOM_FULL' | 'GAME_ALREADY_STARTED' | 'INVALID_ROOM',
              message: payload.message as string,
            });
            break;

          case 'GAME_STATE_SYNC':
            setGameState(payload.state as GameState);
            break;

          case 'PHASE_CHANGE': {
            const ann = payload.announcement as string;
            setAnnouncement(ann);
            if (ann && ann.trim()) {
              setChronicleLogs((prev) => [
                ...prev,
                {
                  id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  type: 'ANNOUNCEMENT',
                  round: (payload.round as number) || 1,
                  phase: (payload.phase as string) || '',
                  text: ann.trim(),
                  timestamp: Date.now(),
                },
              ]);
            }
            break;
          }

          case 'SPEECH_START':
            setActiveSpeakerId(payload.speakerId as number);
            setLiveTranscript(null);
            break;

          case 'SPEECH_END':
            setActiveSpeakerId(null);
            break;

          case 'TRANSCRIPT_STREAM': {
            const spkId = payload.speakerId as number;
            const txt = (payload.text as string) || '';
            const isFin = Boolean(payload.isFinal);
            setLiveTranscript({
              speakerId: spkId,
              text: txt,
              isFinal: isFin,
            });

            if (isFin && txt.trim()) {
              setChronicleLogs((prev) => {
                const last = prev[prev.length - 1];
                if (
                  last &&
                  last.type === 'SPEECH' &&
                  last.speakerId === spkId &&
                  Date.now() - last.timestamp < 15000
                ) {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...last,
                      text: txt.trim(),
                      timestamp: Date.now(),
                    },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: `spk_${Date.now()}_${spkId}`,
                    type: 'SPEECH',
                    round: 1,
                    phase: 'DAY_DISCUSS',
                    speakerId: spkId,
                    text: txt.trim(),
                    timestamp: Date.now(),
                  },
                ];
              });
            }
            break;
          }

          case 'SENTIMENT_DETECTED': {
            const res = payload as unknown as SentimentAnalysisResult;
            setLatestSentiment(res);
            setChronicleLogs((prev) => {
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].type === 'SPEECH' && prev[i].speakerId === res.speakerId) {
                  const copy = [...prev];
                  copy[i] = {
                    ...copy[i],
                    sentiment: res,
                  };
                  return copy;
                }
              }
              return prev;
            });
            break;
          }

          case 'POST_GAME_REPORT':
            setPostGameReport(payload as unknown as PostGameReport);
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
  }, [roomId]);

  const switchRoom = useCallback(
    (newRoomId: string) => {
      setRejectionInfo(null);
      setChronicleLogs([]);
      setRoomId(newRoomId);
      // 更新浏览器 URL
      const url = new URL(window.location.href);
      url.searchParams.set('room', newRoomId);
      window.history.pushState({}, '', url.toString());
    },
    [],
  );

  const startGame = useCallback(
    (language: Language, userRole?: Role) => {
      send('START_GAME', { language, userRole });
      setGameResult(null);
      setPostGameReport(null);
      setLatestSentiment(null);
      setChronicleLogs([]);
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
  }, [send]);

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
    roomId,
    myPlayerId,
    isHost,
    humanCount,
    maxCapacity,
    lanIp,
    rejectionInfo,
    latestSentiment,
    postGameReport,
    switchRoom,
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
    chronicleLogs,
  };
}
