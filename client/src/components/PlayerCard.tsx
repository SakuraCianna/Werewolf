import React from 'react';
import type { Player, Language } from 'voice-werewolf-shared';
import { Skull, Mic, ShieldAlert, Sparkles } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isCurrentSpeaker: boolean;
  language: Language;
  showRole: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentSpeaker,
  language,
  showRole,
  onSelect,
  isSelected,
}) => {
  const isZh = language === 'zh-CN';

  const getRoleLabel = () => {
    switch (player.role) {
      case 'WEREWOLF':
        return isZh ? '狼人' : 'Werewolf';
      case 'SEER':
        return isZh ? '预言家' : 'Seer';
      case 'WITCH':
        return isZh ? '女巫' : 'Witch';
      case 'VILLAGER':
        return isZh ? '平民' : 'Villager';
      default:
        return player.role;
    }
  };

  const getRoleBadgeStyle = () => {
    if (player.role === 'WEREWOLF') return 'bg-rose-950/80 text-rose-300 border-rose-600/50';
    if (player.role === 'SEER') return 'bg-purple-950/80 text-purple-300 border-purple-600/50';
    if (player.role === 'WITCH') return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50';
    return 'bg-amber-950/80 text-amber-300 border-amber-600/50';
  };

  return (
    <div
      onClick={player.isAlive && onSelect ? onSelect : undefined}
      className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300 ${
        onSelect && player.isAlive ? 'cursor-pointer hover:scale-105' : ''
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 bg-amber-950/20'
          : 'bg-slate-900/80 border border-slate-800/80 hover:border-slate-700'
      } ${!player.isAlive ? 'opacity-40 grayscale' : ''} ${
        isCurrentSpeaker
          ? 'ring-2 ring-rose-500 shadow-xl shadow-rose-950/50 bg-slate-900'
          : ''
      }`}
    >
      {/* 席位角标 */}
      <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center shadow">
        {player.id}
      </span>

      {/* 头像区域与波形动画环 */}
      <div className="relative my-1">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all ${
            isCurrentSpeaker
              ? 'border-rose-500 animate-pulse'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          {player.isAI ? (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-serif text-xl font-bold text-slate-300">
              {player.persona?.nameZh?.[0] || 'AI'}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-900 to-indigo-950 flex items-center justify-center text-rose-300 font-bold text-lg">
              YOU
            </div>
          )}
        </div>

        {/* 说话中音浪动效 */}
        {isCurrentSpeaker && player.isAlive && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-rose-600/90 px-1.5 py-0.5 rounded-full shadow">
            <span className="w-1 h-3 bg-white rounded-full animate-wave-bar"></span>
            <span className="w-1 h-4 bg-white rounded-full animate-wave-bar [animation-delay:0.2s]"></span>
            <span className="w-1 h-2 bg-white rounded-full animate-wave-bar [animation-delay:0.4s]"></span>
          </div>
        )}

        {/* 阵亡骷髅标记 */}
        {!player.isAlive && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
            <Skull className="w-8 h-8 text-red-500" />
          </div>
        )}
      </div>

      {/* 玩家名称与身份 */}
      <div className="text-center mt-1 w-full">
        <div className="text-xs font-semibold text-slate-200 truncate">
          {player.name}
        </div>

        {/* 身份卡片 (仅己方或终局可见) */}
        {showRole ? (
          <div
            className={`mt-1 text-[10px] px-2 py-0.5 rounded border font-medium inline-block ${getRoleBadgeStyle()}`}
          >
            {getRoleLabel()}
          </div>
        ) : (
          <div className="mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium inline-block">
            {player.isAI ? (isZh ? 'AI 玩家' : 'AI Agent') : (isZh ? '真人玩家' : 'Human')}
          </div>
        )}

        {/* AI 性格标签 */}
        {player.isAI && player.persona && (
          <p className="text-[9px] text-slate-400 mt-1 truncate max-w-[100px] mx-auto">
            {isZh ? player.persona.toneStyleZh : player.persona.toneStyleEn}
          </p>
        )}
      </div>
    </div>
  );
};
