import React from 'react';
import type { GameState, Language } from 'voice-werewolf-shared';
import {
  MicOff,
  Check,
  Skull,
  Eye,
  Wand2,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { sfx } from '../utils/soundEffects.js';

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

  // 1. 待开局初始状态
  if (!gameState || gameState.phase === 'IDLE') {
    return (
      <div className="flex flex-col items-center my-1.5 gap-1 shrink-0">
        <button
          onClick={() => {
            sfx.playNightfall();
            onStartGame();
          }}
          className="group relative flex items-center gap-2.5 px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-rose-700 to-amber-700 hover:from-amber-500 hover:via-rose-600 hover:to-amber-600 text-white font-sans font-bold text-sm sm:text-base shadow-gothic-gold transition-all transform hover:scale-105 active:scale-95 border border-amber-400/50 cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-3 h-3 fill-current ml-0.5" />
          </div>
          <span className="tracking-wider font-sans">
            {isZh ? '开启 6 人全语音狼人杀' : 'Embark on Voice Werewolf'}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
        </button>
        <p className="text-[10px] text-slate-400 font-sans">
          {isZh ? '1位真人执言 · 5位AI博弈 · 原生多角色语音同传' : '1 Human Player · 5 Autonomous Agents · Multi-Voice Stream'}
        </p>
      </div>
    );
  }

  const human = gameState.players.find((p) => p.id === 1);
  const isHumanAlive = human?.isAlive ?? false;
  const isHumanTurn = gameState.currentSpeakerId === 1;
  const phase = gameState.phase;

  // 2. 终局状态
  if (phase === 'GAME_OVER') {
    return (
      <div className="flex flex-col items-center my-1.5 gap-2 shrink-0">
        <button
          onClick={() => {
            sfx.playDaybreak();
            onStartGame();
          }}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-amber-300 font-sans font-bold text-xs border border-amber-500/30 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="font-sans">{isZh ? '再启新局 (Play Again)' : 'Begin New Game'}</span>
        </button>
      </div>
    );
  }

  // 3. 真人出局观战
  if (!isHumanAlive) {
    return (
      <div className="flex items-center justify-center gap-2 my-1 px-4 py-1.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-[11px] font-sans shadow backdrop-blur shrink-0">
        <Skull className="w-3.5 h-3.5 text-red-400 animate-pulse" />
        <span className="font-sans">{isZh ? '灵魂游离：你已出局，正在以静默视角观摩战局……' : 'You have been eliminated. Spectating from beyond...'}</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto my-1 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-slate-900/95 to-[#090e17]/95 border border-slate-800 shadow-xl backdrop-blur flex flex-col items-center gap-2 shrink-0">
      {/* 轮到真人发言 */}
      {isHumanTurn && (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-sans animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>
              {isZh
                ? '麦克风已连接 AssemblyAI v3，尽情陈述你的逻辑……'
                : 'Microphone streaming to AssemblyAI v3. State your deduction...'}
            </span>
          </div>

          <button
            onClick={() => {
              sfx.playGavel();
              onEndSpeech();
            }}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-sans font-bold text-xs sm:text-sm shadow-gothic-blood transition-all active:scale-95 border border-rose-400/40 cursor-pointer"
          >
            <MicOff className="w-3.5 h-3.5" />
            <span className="font-sans">{isZh ? '完成发言 · 交麦 (Pass)' : 'End Speech · Pass the Turn'}</span>
          </button>
        </div>
      )}

      {/* 夜晚狼人密谋刀人 */}
      {phase === 'NIGHT_WOLF' && human?.role === 'WEREWOLF' && (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-xs text-red-400 font-sans flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            {isZh ? '【暗夜狼嗥】请在圆桌上锁定今夜猎杀的目标：' : '[Werewolf Hunt] Select a victim from the round table:'}
          </p>
          <button
            disabled={!selectedTargetId || selectedTargetId === 1}
            onClick={() => {
              if (selectedTargetId && selectedTargetId !== 1) {
                sfx.playGavel();
                onNightAction('KILL', selectedTargetId);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-sans font-bold text-xs transition-all ${
              selectedTargetId && selectedTargetId !== 1
                ? 'bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white shadow-gothic-blood border border-red-500/40 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span className="font-sans">
              {selectedTargetId && selectedTargetId !== 1
                ? isZh
                  ? `猎杀 ${selectedTargetId} 号玩家`
                  : `Eliminate Player #${selectedTargetId}`
                : isZh
                  ? '请点击上方圆桌选择目标'
                  : 'Click a player card above'}
            </span>
          </button>
        </div>
      )}

      {/* 夜晚预言家验人 */}
      {phase === 'NIGHT_SEER' && human?.role === 'SEER' && (() => {
        const thisRoundCheck = gameState.seerCheckedHistory.find((h) => h.round === gameState.round);
        return (
          <div className="flex flex-col items-center gap-2">
            {thisRoundCheck ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/60 shadow-lg text-purple-200 animate-pulse">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold font-sans">
                  {isZh
                    ? `✦ 圣眼神谕：${thisRoundCheck.targetId}号玩家的真实身份是【${thisRoundCheck.isWolf ? '狼人 🐺' : '好人 🛡️'}】！`
                    : `✦ Divine Revelation: Player #${thisRoundCheck.targetId} is a [${thisRoundCheck.isWolf ? 'WEREWOLF 🐺' : 'GOOD PERSON 🛡️'}]!`}
                </span>
              </div>
            ) : (
              <>
                <p className="text-xs text-purple-300 font-sans flex items-center gap-1.5 font-semibold">
                  <Eye className="w-4 h-4 text-purple-400" />
                  {isZh ? '【圣眼凝视】请在圆桌上选择一名玩家窥视其阵营：' : '[Seer Divination] Select a player to reveal their true camp:'}
                </p>
                <button
                  disabled={!selectedTargetId || selectedTargetId === 1}
                  onClick={() => {
                    if (selectedTargetId && selectedTargetId !== 1) {
                      sfx.playMicChime();
                      onNightAction('CHECK', selectedTargetId);
                    }
                  }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl font-sans font-bold text-xs transition-all ${
                    selectedTargetId && selectedTargetId !== 1
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white shadow-xl border border-purple-400/40 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="font-sans">
                    {selectedTargetId && selectedTargetId !== 1
                      ? isZh
                        ? `查验 ${selectedTargetId} 号真实阵营`
                        : `Inspect Player #${selectedTargetId}`
                      : isZh
                        ? '请点击上方圆桌选择查验目标'
                        : 'Click a player card above to inspect'}
                  </span>
                </button>
              </>
            )}

            {/* 预言家历史验人记录徽条 */}
            {gameState.seerCheckedHistory.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans mt-0.5">
                <span>{isZh ? '过往查验:' : 'History:'}</span>
                {gameState.seerCheckedHistory.map((h, idx) => (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.2 rounded border font-semibold ${
                      h.isWolf
                        ? 'bg-red-950/80 text-red-300 border-red-500/40'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {isZh ? `${h.targetId}号` : `#${h.targetId}`}({h.isWolf ? (isZh ? '狼人' : 'Wolf') : (isZh ? '好人' : 'Good')})
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 夜晚女巫用药 */}
      {phase === 'NIGHT_WITCH' && human?.role === 'WITCH' && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-emerald-500/40 text-xs text-emerald-300 font-sans shadow-sm">
            <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">
              {gameState.nightVictimId
                ? (isZh ? `今夜倒牌玩家：${gameState.nightVictimId}号玩家 ⚠️` : `Attacked tonight: Player #${gameState.nightVictimId} ⚠️`)
                : (isZh ? '今夜是平安夜 (暂无人倒牌)' : 'Peaceful night (no victim)')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {gameState.witchInventory.hasAntidote && (
              <button
                disabled={!gameState.nightVictimId}
                onClick={() => {
                  sfx.playMicChime();
                  onNightAction('SAVE');
                }}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-white text-xs font-sans font-semibold border shadow-md transition-all ${
                  gameState.nightVictimId
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 border-emerald-400/40 cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-sans">
                  {gameState.nightVictimId
                    ? (isZh ? `救活 ${gameState.nightVictimId} 号` : `Save #${gameState.nightVictimId}`)
                    : (isZh ? '无人倒牌无须解药' : 'No victim to save')}
                </span>
              </button>
            )}
            {gameState.witchInventory.hasPoison && (
              <button
                disabled={!selectedTargetId || selectedTargetId === 1}
                onClick={() => {
                  if (selectedTargetId && selectedTargetId !== 1) {
                    sfx.playGavel();
                    onNightAction('POISON', selectedTargetId);
                  }
                }}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-white text-xs font-sans font-semibold border shadow-md transition-all ${
                  selectedTargetId && selectedTargetId !== 1
                    ? 'bg-gradient-to-r from-purple-800 to-red-900 hover:from-purple-700 hover:to-red-800 border-purple-400/40 cursor-pointer active:scale-95'
                    : 'bg-slate-800/80 text-slate-500 border-slate-700 cursor-not-allowed'
                }`}
              >
                <Skull className="w-3.5 h-3.5" />
                <span className="font-sans">
                  {selectedTargetId && selectedTargetId !== 1
                    ? (isZh ? `赐毒 ${selectedTargetId} 号` : `Poison #${selectedTargetId}`)
                    : (isZh ? '选择圆桌目标以赐毒' : 'Select target to poison')}
                </span>
              </button>
            )}
            <button
              onClick={() => onNightAction('PASS')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-sans border border-slate-700 cursor-pointer active:scale-95"
            >
              <span className="font-sans">{isZh ? '保留药剂 · 过' : 'Reserve · Pass'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 白天放逐公投 */}
      {phase === 'DAY_VOTE' && (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-xs text-amber-300 font-sans flex items-center gap-1.5 font-semibold">
            <Check className="w-4 h-4 text-amber-400" />
            {isZh ? '【议会公投】选定一名最具嫌疑的玩家，投出放逐票：' : '[Council Vote] Choose a suspect to cast your exile vote:'}
          </p>
          <button
            disabled={!selectedTargetId}
            onClick={() => {
              if (selectedTargetId) {
                sfx.playGavel();
                onVote(selectedTargetId);
              }
            }}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-sans font-bold text-xs transition-all ${
              selectedTargetId
                ? 'bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white shadow-gothic-gold border border-amber-400/50 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span className="font-sans">
              {selectedTargetId
                ? isZh
                  ? `放逐投票 → ${selectedTargetId} 号玩家`
                  : `Cast Exile Vote → Player #${selectedTargetId}`
                : isZh
                  ? '请点击上方圆桌选择被投玩家'
                  : 'Click a player card above'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
