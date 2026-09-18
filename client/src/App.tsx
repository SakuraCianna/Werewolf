import React, { useState, useEffect, useRef } from 'react';
import type { Language, GamePhase, Role } from 'voice-werewolf-shared';
import { Header } from './components/Header.js';
import { RoundTable } from './components/RoundTable.js';
import { LiveSubtitles } from './components/LiveSubtitles.js';
import { ActionPanel } from './components/ActionPanel.js';
import { GameOverModal } from './components/GameOverModal.js';
import { InviteModal } from './components/InviteModal.js';
import { RoomBlockedModal } from './components/RoomBlockedModal.js';
import { DevPanel } from './components/DevPanel.js';
import { useGameSocket } from './hooks/useGameSocket.js';
import { useAudioRecorder } from './hooks/useAudioRecorder.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import { sfx } from './utils/soundEffects.js';
import { narrator } from './utils/voiceNarrator.js';

export function App() {
  const [language, setLanguage] = useState<Language>('zh-CN');
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [muted, setMuted] = useState(sfx.getMuted());
  const [preferredRole, setPreferredRole] = useState<Role | 'RANDOM'>('RANDOM');
  const [showGameOverModal, setShowGameOverModal] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { playAudioBase64, stopAudio } = useAudioPlayer();
  const serverAudioActiveRef = useRef(false);
  const serverAudioSpeakerIdRef = useRef<number | null>(null);

  const {
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
  } = useGameSocket({
    onAudioChunkReceived: (speakerId, base64) => {
      if (muted) return;
      serverAudioSpeakerIdRef.current = speakerId;
      serverAudioActiveRef.current = true;
      narrator.stop();
      playAudioBase64(base64, () => {
        serverAudioActiveRef.current = false;
      });
    },
  });

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onAudioChunk: (base64) => {
      sendAudioChunk(base64);
    },
  });

  const handleToggleMute = () => {
    const next = !muted;
    sfx.setMuted(next);
    setMuted(next);
    if (next) {
      narrator.stop();
      stopAudio();
    }
  };

  // 每当发言人切换时重置流式音频接收标记
  useEffect(() => {
    serverAudioSpeakerIdRef.current = null;
  }, [activeSpeakerId]);

  // 终局时默认自动打开复盘弹窗
  useEffect(() => {
    if (gameState?.phase === 'GAME_OVER') {
      setShowGameOverModal(true);
    }
  }, [gameState?.phase]);

  // 监听昼夜与公投状态流转，触发沉浸式程序化音效
  const prevPhaseRef = useRef<GamePhase | 'IDLE'>('IDLE');
  useEffect(() => {
    const currentPhase = gameState?.phase || 'IDLE';
    if (currentPhase !== prevPhaseRef.current) {
      if (currentPhase.startsWith('NIGHT')) {
        sfx.playNightfall();
      } else if (currentPhase === 'DAY_START') {
        sfx.playDaybreak();
      } else if (currentPhase === 'DAY_VOTE') {
        sfx.playGavel();
      }
      prevPhaseRef.current = currentPhase;
    }
  }, [gameState?.phase]);

  // 当轮到当前真人客户端发言时，播放提示音并自动开启麦克风录音推流 AssemblyAI
  useEffect(() => {
    if (activeSpeakerId === myPlayerId) {
      narrator.stop();
      stopAudio();
      sfx.playMicChime();
      startRecording();
    } else {
      stopRecording();
    }
  }, [activeSpeakerId, myPlayerId, startRecording, stopRecording, stopAudio]);

  // 核心语音输出：法官神谕公告更新时，由法官原生合成声线播报
  useEffect(() => {
    if (announcement && gameState && gameState.phase !== 'IDLE') {
      narrator.speakAnnouncement(announcement, language);
    }
  }, [announcement, language, gameState?.phase]);

  // 核心语音输出：AI 玩家发言字幕更新时，由对应角色专属性格声线朗读 (若服务端未返回流式音频则优雅兜底)
  useEffect(() => {
    if (activeSpeakerId && activeSpeakerId !== myPlayerId && liveTranscript?.text) {
      const speaker = gameState?.players.find((p) => p.id === activeSpeakerId);
      // 若当前发言者为联机真人，则由对方真人麦克风发声，不触发本地 TTS
      if (speaker && !speaker.isAI) {
        return;
      }
      if (serverAudioActiveRef.current || serverAudioSpeakerIdRef.current === activeSpeakerId) {
        return;
      }
      narrator.speakPlayer(activeSpeakerId, liveTranscript.text, language);
    }
  }, [activeSpeakerId, myPlayerId, liveTranscript?.text, language, gameState?.players]);

  const handleStart = () => {
    narrator.stop();
    stopAudio();
    narrator.prime();
    sfx.playNightfall();
    const roleToPass = preferredRole === 'RANDOM' ? undefined : preferredRole;
    startGame(language, roleToPass);
    setSelectedTargetId(null);
    setShowGameOverModal(true);
  };

  const currentSpeaker = gameState?.players.find((p) => p.id === activeSpeakerId);

  return (
    <div className="h-screen max-h-screen flex flex-col justify-between bg-runic-grid overflow-hidden select-none">
      {/* 顶部导航：含房间徽章、邀请好友、重新开始、静音与语言切换 */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        isGameStarted={Boolean(gameState && gameState.phase !== 'IDLE')}
        phase={gameState?.phase || 'IDLE'}
        round={gameState?.round || 0}
        isConnected={isConnected}
        onRestart={handleStart}
        muted={muted}
        onToggleMute={handleToggleMute}
        preferredRole={preferredRole}
        onPreferredRoleChange={setPreferredRole}
        roomId={roomId}
        isHost={isHost}
        humanCount={humanCount}
        onOpenInviteModal={() => setShowInviteModal(true)}
      />

      {/* 主界面：暗黑圆桌对战区与侧边栏法庭纪事 (严格视口自适应，零纵向滚动条) */}
      <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-2 sm:px-4 py-1.5 flex flex-col lg:flex-row gap-3 overflow-hidden">
        {/* 左侧主战场：圆桌与操作决策台 */}
        <section className="flex-1 min-h-0 flex flex-col justify-between items-center overflow-hidden h-full">
          <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
            <RoundTable
              players={gameState?.players || []}
              activeSpeakerId={activeSpeakerId}
              language={language}
              selectedTargetId={selectedTargetId}
              onSelectTarget={(id) => {
                sfx.playMicChime();
                setSelectedTargetId(id);
              }}
              isGameOver={gameState?.phase === 'GAME_OVER'}
              announcement={announcement}
              phase={gameState?.phase || 'IDLE'}
              myPlayerId={myPlayerId}
            />
          </div>

          <div className="w-full shrink-0 pt-1">
            <ActionPanel
              gameState={gameState}
              language={language}
              isRecording={isRecording}
              selectedTargetId={selectedTargetId}
              onStartGame={handleStart}
              onEndSpeech={endSpeech}
              onNightAction={(action, targetId) => {
                sendNightAction(action, targetId);
                setSelectedTargetId(null);
              }}
              onVote={(targetId) => {
                sendVote(targetId);
                setSelectedTargetId(null);
              }}
              myPlayerId={myPlayerId}
              isHost={isHost}
            />
          </div>
        </section>

        {/* 右侧侧边栏：法庭纪事卷轴与实时同传打字机 (用户指定侧边栏布局) */}
        <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 h-44 lg:h-full flex flex-col min-h-0 overflow-hidden">
          <LiveSubtitles
            speakerId={activeSpeakerId}
            speakerName={currentSpeaker?.name || ''}
            transcript={liveTranscript?.text || ''}
            isFinal={liveTranscript?.isFinal ?? false}
            language={language}
            sentiment={latestSentiment}
            chronicleLogs={chronicleLogs}
            phase={gameState?.phase || 'IDLE'}
          />
        </aside>
      </main>

      {/* 开发者调试浮窗抽屉 */}
      <DevPanel
        gameState={gameState}
        language={language}
        onSkipTurn={skipTurn}
        onSimulateSpeech={simulateSpeech}
      />

      {/* 终局胜利与全员复盘弹窗 (含 AI 全景战术复盘简报) */}
      <GameOverModal
        isOpen={Boolean(gameState?.phase === 'GAME_OVER' && showGameOverModal)}
        winner={gameState?.winner ?? gameResult?.winner ?? null}
        players={gameState?.players || []}
        language={language}
        onRestart={handleStart}
        onClose={() => setShowGameOverModal(false)}
        postGameReport={postGameReport || gameState?.postGameReport}
        myPlayerId={myPlayerId}
      />

      {/* 局域网开黑邀请好友弹窗 */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
        humanCount={humanCount}
        maxCapacity={maxCapacity}
        lanIp={lanIp}
        language={language}
      />

      {/* 房间满员 / 对局中安全拦截屏障弹窗 */}
      <RoomBlockedModal
        isOpen={Boolean(rejectionInfo)}
        reason={rejectionInfo?.reason || 'INVALID_ROOM'}
        message={rejectionInfo?.message || ''}
        language={language}
        onCreateNewRoom={() => {
          const newRoom = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
          switchRoom(newRoom);
        }}
        onReturnHome={() => {
          const newRoom = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
          switchRoom(newRoom);
        }}
      />
    </div>
  );
}

export default App;
