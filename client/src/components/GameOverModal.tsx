import React, { useEffect } from 'react';
import type { Camp, Player, Language, PostGameReport } from 'voice-werewolf-shared';
import {
  Trophy,
  RotateCcw,
  Skull,
  Shield,
  Eye,
  Wand2,
  Moon,
  Sparkles,
  Crown,
  X,
} from 'lucide-react';
import { sfx } from '../utils/soundEffects.js';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Camp | null;
  players: Player[];
  language: Language;
  onRestart: () => void;
  onClose?: () => void;
  postGameReport?: PostGameReport | null;
  myPlayerId?: number;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  players,
  language,
  onRestart,
  onClose,
  postGameReport,
  myPlayerId = 1,
}) => {
  const isZh = language === 'zh-CN';

  useEffect(() => {
    if (isOpen) {
      if (winner === 'GOOD') {
        sfx.playDaybreak();
      } else if (winner === 'WOLF') {
        sfx.playNightfall();
      }
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  const isGoodWin = winner === 'GOOD';
  const isWolfWin = winner === 'WOLF';

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'WEREWOLF':
        return {
          name: isZh ? '狼人' : 'Werewolf',
          camp: isZh ? '狼人阵营' : 'Wolf Camp',
          icon: Moon,
          color: 'text-red-400 bg-red-950/80 border-red-500/50',
          campColor: 'text-red-400',
        };
      case 'SEER':
        return {
          name: isZh ? '预言家' : 'Seer',
          camp: isZh ? '好人阵营' : 'Good Camp',
          icon: Eye,
          color: 'text-purple-300 bg-purple-950/80 border-purple-500/50',
          campColor: 'text-amber-400',
        };
      case 'WITCH':
        return {
          name: isZh ? '女巫' : 'Witch',
          camp: isZh ? '好人阵营' : 'Good Camp',
          icon: Wand2,
          color: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50',
          campColor: 'text-amber-400',
        };
      case 'VILLAGER':
      default:
        return {
          name: isZh ? '平民' : 'Villager',
          camp: isZh ? '好人阵营' : 'Good Camp',
          icon: Shield,
          color: 'text-amber-300 bg-amber-950/80 border-amber-500/50',
          campColor: 'text-amber-400',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* 结算卡主体 */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.18)] flex flex-col items-center text-center overflow-hidden">
        {/* 关闭查看圆桌按钮 */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/50 cursor-pointer transition-colors"
            title={isZh ? '关闭弹窗查看圆桌' : 'Close to inspect table'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 顶部胜利皇冠徽章 */}
        <div className="relative mb-3">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg ${
              isGoodWin
                ? 'bg-gradient-to-br from-amber-500/20 via-yellow-600/30 to-amber-950 border-amber-500/60 shadow-amber-500/30 text-amber-300'
                : isWolfWin
                ? 'bg-gradient-to-br from-red-600/20 via-rose-900/30 to-slate-950 border-red-500/60 shadow-red-500/30 text-red-400'
                : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}
          >
            {isGoodWin ? (
              <Crown className="w-9 h-9 animate-pulse" />
            ) : isWolfWin ? (
              <Moon className="w-9 h-9 animate-pulse" />
            ) : (
              <Trophy className="w-9 h-9" />
            )}
          </div>
          <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-amber-400 animate-spin-slow" />
        </div>

        {/* 胜利文案与阵营标定 */}
        <h2
          className={`text-2xl sm:text-3xl font-bold tracking-wider font-sans mb-1.5 ${
            isGoodWin
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400'
              : isWolfWin
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-rose-400 to-red-500'
              : 'text-slate-200'
          }`}
        >
          {isGoodWin
            ? isZh
              ? '✦ 好人阵营 · 驱散永夜 ✦'
              : '✦ Good Camp · Dawn Ascends ✦'
            : isWolfWin
            ? isZh
              ? '✦ 狼人阵营 · 绝杀长夜 ✦'
              : '✦ Werewolf Camp · Midnight Prevails ✦'
            : isZh
            ? '✦ 终局揭晓 · 宿命平局 ✦'
            : '✦ Destiny Draws ✦'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300/80 max-w-md font-sans mb-5 leading-relaxed">
          {isGoodWin
            ? isZh
              ? '正义与智慧撕裂了笼罩村庄的迷雾，潜藏于圆桌暗处的嗜血恶狼已悉数被放逐！'
              : 'Wisdom and unity have pierced through the dark. All wolves have been eradicated from the village.'
            : isWolfWin
            ? isZh
              ? '獠牙与伪装撕碎了村民的信任，好人阵营已无力回天，圆桌彻底沦陷于血色永夜！'
              : 'Deception triumphed over truth. The good camp faltered, and eternal darkness consumes the realm.'
            : isZh
            ? '圆桌势均力敌，光与暗在破晓时分达成了短暂的沉寂。'
            : 'Both sides stood balanced at dawn in silent truce.'}
        </p>

        {/* 全员真实身份复盘席位 (2行3列网格) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {players.map((p) => {
            const roleInfo = getRoleDisplay(p.role);
            const RoleIcon = roleInfo.icon;
            const isWinner =
              (isGoodWin && p.role !== 'WEREWOLF') ||
              (isWolfWin && p.role === 'WEREWOLF');

            return (
              <div
                key={p.id}
                className={`relative rounded-xl p-2.5 border transition-all flex flex-col items-center justify-between text-left ${
                  p.isAlive
                    ? 'bg-slate-900/80 border-slate-700/60 shadow-sm'
                    : 'bg-slate-950/90 border-slate-800/80 opacity-75'
                } ${isWinner ? 'ring-1 ring-amber-500/30' : ''}`}
              >
                {/* 席位号与存活状态 */}
                <div className="w-full flex items-center justify-between text-xs mb-1.5 font-sans">
                  <span className="font-bold text-slate-200">
                    {p.id}号 {p.id === myPlayerId ? (isZh ? '(你)' : '(You)') : !p.isAI ? (isZh ? '(好友)' : '(Friend)') : ''}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                      p.isAlive
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-950/60 text-red-400 border-red-500/30 flex items-center gap-0.5'
                    }`}
                  >
                    {!p.isAlive && <Skull className="w-3 h-3" />}
                    {p.isAlive ? (isZh ? '存活' : 'Alive') : (isZh ? '出局' : 'OUT')}
                  </span>
                </div>

                {/* 玩家名称 */}
                <div className="w-full text-xs font-semibold text-slate-300 truncate font-sans mb-2">
                  {p.name}
                </div>

                {/* 真实身份卡徽章 */}
                <div
                  className={`w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold font-sans ${roleInfo.color}`}
                >
                  <RoleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{roleInfo.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI 全景战局战术复盘简报 (LeMUR / DeepSeek 深度生成) */}
        {postGameReport && (
          <div className="w-full rounded-2xl p-3.5 sm:p-4 bg-slate-900/90 border border-amber-500/35 mb-5 text-left font-sans shadow-inner">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {isZh ? '✦ AI 圆桌全景战术复盘 ✦' : '✦ AI Match Tactical Review ✦'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-semibold">
                {isZh ? `🏆 本局 MVP: ${postGameReport.mvpPlayerId}号玩家` : `🏆 MVP: #${postGameReport.mvpPlayerId}`}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-amber-300 font-semibold">{isZh ? '【MVP 评定】：' : '[MVP]: '}</strong>
                <span className="text-slate-200">{postGameReport.mvpReason}</span>
              </p>
              <p>
                <strong className="text-rose-300 font-semibold">{isZh ? '【核心胜负手】：' : '[Key Pivot]: '}</strong>
                <span className="text-slate-300">{postGameReport.turningPoint}</span>
              </p>
              <p>
                <strong className="text-blue-300 font-semibold">{isZh ? '【双方博弈点评】：' : '[Tactical Breakdown]: '}</strong>
                <span className="text-slate-300">{postGameReport.tacticalReview}</span>
              </p>
              <p>
                <strong className="text-purple-300 font-semibold">{isZh ? '【潜伏欺骗指数】：' : '[Deception Analysis]: '}</strong>
                <span className="text-slate-300">{postGameReport.deceptionAnalysis}</span>
              </p>
            </div>
          </div>
        )}

        {/* 底部交互操作区 */}
        <div className="w-full flex items-center justify-center gap-3">
          <button
            onClick={() => {
              sfx.playMicChime();
              onRestart();
            }}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-sans font-bold text-sm shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isZh ? '再启新局 · 重回圆桌' : 'Start New Match'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
