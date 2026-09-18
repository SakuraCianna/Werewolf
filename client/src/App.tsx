import React, { useState, useEffect, useRef } from 'react';
import type { Language, GamePhase, Role } from 'voice-werewolf-shared';
import { Header } from './components/Header.js';
import { RoundTable } from './components/RoundTable.js';
import { LiveSubtitles } from './components/LiveSubtitles.js';
import { ActionPanel } from './components/ActionPanel.js';
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

  const { playAudioBase64 } = useAudioPlayer();

  const {
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
  } = useGameSocket({
    onAudioChunkReceived: (_speakerId, base64) => {
      playAudioBase64(base64);
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
    }
  };

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

  // 当轮到真人 (1号) 发言时，播放提示音并自动开启麦克风录音推流 AssemblyAI
  useEffect(() => {
    if (activeSpeakerId === 1) {
      narrator.stop();
      sfx.playMicChime();
      startRecording();
    } else {
      stopRecording();
    }
  }, [activeSpeakerId, startRecording, stopRecording]);

  // 核心语音输出：法官神谕公告更新时，由法官原生合成声线播报
  useEffect(() => {
    if (announcement && gameState && gameState.phase !== 'IDLE') {
      narrator.speakAnnouncement(announcement, language);
    }
  }, [announcement, language, gameState?.phase]);

  // 核心语音输出：AI 玩家发言字幕更新时，由对应角色专属性格声线朗读
  useEffect(() => {
    if (activeSpeakerId && activeSpeakerId !== 1 && liveTranscript?.text) {
      narrator.speakPlayer(activeSpeakerId, liveTranscript.text, language);
    }
  }, [activeSpeakerId, liveTranscript?.text, language]);

  const handleStart = () => {
    narrator.stop();
    narrator.prime();
    sfx.playNightfall();
    const roleToPass = preferredRole === 'RANDOM' ? undefined : preferredRole;
    startGame(language, roleToPass);
    setSelectedTargetId(null);
  };

  const currentSpeaker = gameState?.players.find((p) => p.id === activeSpeakerId);

  return (
    <div className="h-screen max-h-screen flex flex-col justify-between bg-runic-grid overflow-hidden select-none">
      {/* 顶部导航：含身份挑选、重新开始、静音与语言切换 */}
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
      />

      {/* 主界面：暗黑圆桌与实时交互 (严格锁定在视口高度内) */}
      <main className="flex-1 min-h-0 flex flex-col justify-between items-center w-full max-w-5xl mx-auto px-2 sm:px-4 py-1 overflow-hidden">
        {/* 圆桌与玩家状态 */}
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
        />

        {/* AssemblyAI 实时同传打字字幕 */}
        <LiveSubtitles
          speakerId={activeSpeakerId}
          speakerName={currentSpeaker?.name || ''}
          transcript={liveTranscript?.text || ''}
          isFinal={liveTranscript?.isFinal ?? false}
          language={language}
        />

        {/* 下方控制与技能交互 */}
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
        />
      </main>

      {/* 开发者调试浮窗抽屉 */}
      <DevPanel
        gameState={gameState}
        language={language}
        onSkipTurn={skipTurn}
        onSimulateSpeech={simulateSpeech}
      />
    </div>
  );
}

export default App;
