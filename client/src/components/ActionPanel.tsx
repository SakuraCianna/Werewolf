import React from 'react';
import type { GameState, Language, Camp } from 'voice-werewolf-shared';
import { Mic, MicOff, Check, X, Shield, Skull, Eye, Wand2, Play } from 'lucide-react';

interface ActionPanelProps {
  gameState: GameState | null;
  language: Language;
  isRecording: boolean;
  selectedTargetId: number | null;
  onStartGame: () => void;
  onEndSpeech: () => void;
  onNightAction: (action: 'KILL' | 'CHECK' | 'SAVE' | 'POISON' | 'PASS', targetId?: number) => void;
  onVote: (targetId: number) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gameState,
  language,
  isRecording,
  selectedTargetId,
  onStartGame,
  onEndSpeech,
  onNightAction,
  onVote,
}) => {
  const isZh = language === 'zh-CN';

  if (!gameState || gameState.phase === 'IDLE') {
    return (
      <div className="flex justify-center my-6">
        <button
          onClick={onStartGame}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-base shadow-xl shadow-rose-950/60 transition-all transform hover:scale-105 active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isZh ? '开启 6 人全语音狼人杀' : 'Start 6-Player Voice Werewolf'}</span>
        </button>
      </div>
    );
  }

  const human = gameState.players.find((p) => p.id === 1);
  const isHumanAlive = human?.isAlive ?? false;
  const isHumanTurn = gameState.currentSpeakerId === 1;
  const phase = gameState.phase;

  // 终局状态
  if (phase === 'GAME_OVER') {
    return (
      <div className="flex flex-col items-center my-6 gap-3">
        <button
          onClick={onStartGame}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-700 shadow transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isZh ? '再来一局' : 'Play Again'}</span>
        </button>
      </div>
    );
  }

  // 真人阵亡
  if (!isHumanAlive) {
    return (
      <div className="flex items-center justify-center gap-2 my-6 p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-xs">
        <Skull className="w-4 h-4" />
        <span>{isZh ? '你已出局，正在观战对弈……' : 'You are eliminated. Spectating...'}</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col items-center gap-4">
      {/* 1. 白天轮到真人发言 */}
      {isHumanTurn && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium animate-pulse">
            <Mic className="w-4 h-4" />
            <span>
              {isZh
                ? '你的麦克风已连接 AssemblyAI，请开始发言……'
                : 'Microphone linked with AssemblyAI. Please speak...'}
            </span>
          </div>

          <button
            onClick={onEndSpeech}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-900/50 transition-all active:scale-95"
          >
            <MicOff className="w-4 h-4" />
            <span>{isZh ? '结束发言 (Pass)' : 'Finish Speech (Pass)'}</span>
          </button>
        </div>
      )}

      {/* 2. 夜晚狼人密谋刀人 */}
      {phase === 'NIGHT_WOLF' && human?.role === 'WEREWOLF' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-rose-400 font-medium">
            {isZh ? '请在圆桌上选择今晚击杀的目标：' : 'Select a target on table to eliminate:'}
          </p>
          <button
            disabled={!selectedTargetId}
            onClick={() => selectedTargetId && onNightAction('KILL', selectedTargetId)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              selectedTargetId
                ? 'bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span>
              {selectedTargetId
                ? isZh
                  ? `袭击 ${selectedTargetId} 号玩家`
                  : `Attack Player #${selectedTargetId}`
                : isZh
                  ? '请先点击选择圆桌玩家'
                  : 'Select a player on table first'}
            </span>
          </button>
        </div>
      )}

      {/* 3. 夜晚预言家验人 */}
      {phase === 'NIGHT_SEER' && human?.role === 'SEER' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-purple-400 font-medium">
            {isZh ? '请选择一名玩家查验其阵营：' : 'Select a player to investigate camp:'}
          </p>
          <button
            disabled={!selectedTargetId}
            onClick={() => selectedTargetId && onNightAction('CHECK', selectedTargetId)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              selectedTargetId
                ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>
              {selectedTargetId
                ? isZh
                  ? `查验 ${selectedTargetId} 号玩家`
                  : `Investigate Player #${selectedTargetId}`
                : isZh
                  ? '请先点击选择目标'
                  : 'Select target first'}
            </span>
          </button>
        </div>
      )}

      {/* 4. 夜晚女巫用药 */}
      {phase === 'NIGHT_WITCH' && human?.role === 'WITCH' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-emerald-400 font-medium">
            {isZh ? '【女巫之夜】请选择是否使用解药或毒药：' : '[Witch Night] Choose potion to use:'}
          </p>
          <div className="flex items-center gap-3">
            {gameState.witchInventory.hasAntidote && (
              <button
                onClick={() => onNightAction('SAVE')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow"
              >
                <Shield className="w-4 h-4" />
                <span>{isZh ? '使用解药救人' : 'Use Antidote (Save)'}</span>
              </button>
            )}
            {gameState.witchInventory.hasPoison && selectedTargetId && (
              <button
                onClick={() => onNightAction('POISON', selectedTargetId)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-semibold shadow"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isZh ? `毒死 ${selectedTargetId} 号` : `Poison #${selectedTargetId}`}</span>
              </button>
            )}
            <button
              onClick={() => onNightAction('PASS')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
            >
              {isZh ? '不使用药剂' : 'Pass / No Potion'}
            </button>
          </div>
        </div>
      )}

      {/* 5. 白天放逐公投 */}
      {phase === 'DAY_VOTE' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-amber-400 font-medium">
            {isZh ? '【放逐公投】请点击圆桌玩家进行投票：' : '[Exile Vote] Cast your vote on a player:'}
          </p>
          <button
            disabled={!selectedTargetId}
            onClick={() => selectedTargetId && onVote(selectedTargetId)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              selectedTargetId
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {selectedTargetId
                ? isZh
                  ? `投票放逐 ${selectedTargetId} 号玩家`
                  : `Vote to Exile Player #${selectedTargetId}`
                : isZh
                  ? '请点击圆桌选择被投玩家'
                  : 'Select a player to vote for'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
