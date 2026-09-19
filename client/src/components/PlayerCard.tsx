import React from 'react';
import type { Player, Language } from 'voice-werewolf-shared';
import {
  Skull,
  Shield,
  Moon,
  Flame,
  Feather,
  Compass,
  Swords,
  Sparkles,
  ShieldAlert,
  Scale,
} from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isCurrentSpeaker: boolean;
  language: Language;
  showRole: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  myPlayerId?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentSpeaker,
  language,
  showRole,
  onSelect,
  isSelected,
  myPlayerId = 1,
}) => {
  const isZh = language === 'zh-CN';
  const isMe = player.id === myPlayerId;

  // 专属纹章与色彩主题
  const getCrestTheme = () => {
    if (!player.isAI) {
      return {
        bg: 'from-amber-500/20 via-rose-900/30 to-slate-900',
        border: 'border-amber-500/40',
        ring: 'ring-amber-400',
        icon: Compass,
        accent: 'text-amber-300',
        title: isMe
          ? isZh
            ? '玩家宿主'
            : 'You'
          : isZh
          ? '联机好友'
          : 'Friend',
      };
    }
    switch (player.id) {
      case 2:
        return {
          bg: 'from-purple-900/30 via-slate-900 to-indigo-950',
          border: 'border-purple-500/30',
          ring: 'ring-purple-400',
          icon: Moon,
          accent: 'text-purple-300',
          title: isZh ? '敏锐直觉' : 'Intuitive',
        };
      case 3:
        return {
          bg: 'from-blue-900/30 via-slate-900 to-cyan-950',
          border: 'border-blue-500/30',
          ring: 'ring-blue-400',
          icon: Swords,
          accent: 'text-blue-300',
          title: isZh ? '逻辑学者' : 'Analytical',
        };
      case 4:
        return {
          bg: 'from-red-900/30 via-slate-900 to-amber-950',
          border: 'border-red-500/30',
          ring: 'ring-red-400',
          icon: Flame,
          accent: 'text-red-300',
          title: isZh ? '铁血审判' : 'Zealot',
        };
      case 5:
        return {
          bg: 'from-emerald-900/30 via-slate-900 to-slate-950',
          border: 'border-emerald-500/30',
          ring: 'ring-emerald-400',
          icon: Shield,
          accent: 'text-emerald-300',
          title: isZh ? '稳健守护' : 'Defender',
        };
      case 6:
      default:
        return {
          bg: 'from-amber-900/30 via-slate-900 to-yellow-950',
          border: 'border-amber-500/30',
          ring: 'ring-amber-400',
          icon: Feather,
          accent: 'text-amber-300',
          title: isZh ? '灵巧游侠' : 'Trickster',
        };
    }
  };

  const theme = getCrestTheme();
  const CrestIcon = theme.icon;

  // 情绪声学测谎视觉映射
  const getSentimentConfig = () => {
    switch (player.sentiment) {
      case 'NERVOUS':
        return {
          halo: 'from-rose-600 via-red-500 to-amber-600 animate-pulse',
          badgeText: isZh ? '心虚' : 'Nervous',
          badgeClass: 'bg-red-950/85 text-red-300 border-red-500/50 shadow-red-950/60 animate-pulse',
          Icon: ShieldAlert,
        };
      case 'AGGRESSIVE':
        return {
          halo: 'from-amber-500 via-orange-500 to-rose-600 animate-spin-slow',
          badgeText: isZh ? '强势' : 'Aggressive',
          badgeClass: 'bg-amber-950/85 text-amber-300 border-amber-500/50 shadow-amber-950/60',
          Icon: Flame,
        };
      case 'DEFENSIVE':
        return {
          halo: 'from-blue-600 via-cyan-500 to-indigo-600 animate-spin-slow',
          badgeText: isZh ? '自辩' : 'Defensive',
          badgeClass: 'bg-blue-950/85 text-blue-300 border-blue-500/50 shadow-blue-950/60',
          Icon: Scale,
        };
      case 'CALM':
        return {
          halo: 'from-emerald-500 via-teal-400 to-emerald-600 animate-spin-slow',
          badgeText: isZh ? '沉稳' : 'Calm',
          badgeClass: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/50 shadow-emerald-950/60',
          Icon: Sparkles,
        };
      default:
        return {
          halo: 'from-rose-500 via-amber-400 to-rose-600 animate-spin-slow',
          badgeText: '',
          badgeClass: '',
          Icon: Sparkles,
        };
    }
  };

  const sentimentCfg = getSentimentConfig();
  const SentimentIcon = sentimentCfg.Icon;

  const getRoleBadge = () => {
    switch (player.role) {
      case 'WEREWOLF':
        return {
          name: isZh ? '狼人' : 'Werewolf',
          style: 'bg-red-950/90 text-red-300 border-red-600/70 shadow-red-950/50',
        };
      case 'SEER':
        return {
          name: isZh ? '预言家' : 'Seer',
          style: 'bg-purple-950/90 text-purple-300 border-purple-600/70 shadow-purple-950/50',
        };
      case 'WITCH':
        return {
          name: isZh ? '女巫' : 'Witch',
          style: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70 shadow-emerald-950/50',
        };
      case 'VILLAGER':
        return {
          name: isZh ? '平民' : 'Villager',
          style: 'bg-amber-950/90 text-amber-300 border-amber-600/70 shadow-amber-950/50',
        };
      default:
        return {
          name: player.role,
          style: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  return (
    <div
      onClick={player.isAlive && onSelect ? onSelect : undefined}
      className={`group relative flex flex-col items-center w-full p-2 sm:p-2.5 md:p-3 rounded-2xl transition-all duration-300 select-none ${
        onSelect && player.isAlive
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl'
          : ''
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 bg-amber-950/40 shadow-gothic-gold scale-[1.02]'
          : isCurrentSpeaker
            ? player.sentiment === 'NERVOUS'
              ? 'ring-2 ring-red-500 shadow-[0_0_22px_rgba(239,68,68,0.45)] bg-slate-900/95'
              : 'ring-2 ring-rose-500 shadow-gothic-blood bg-slate-900/95'
            : 'bg-gradient-to-b ' + theme.bg + ' border ' + theme.border + ' shadow-gothic-card'
      } ${!player.isAlive ? 'opacity-35 grayscale contrast-125' : ''}`}
    >
      {/* 席位编号金币印鉴 */}
      <div className="absolute -top-2.5 -left-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110">
        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-sans text-xs font-bold text-amber-300">
          {player.id}
        </div>
      </div>

      {/* 说话中光圈与外发光扩散 */}
      {isCurrentSpeaker && player.isAlive && (
        <div
          className={`absolute -inset-0.5 rounded-2xl opacity-65 blur-sm animate-pulse-glow -z-10 bg-gradient-to-r ${
            player.sentiment === 'NERVOUS'
              ? 'from-red-600 to-amber-500'
              : 'from-rose-500 to-amber-500'
          }`}
        ></div>
      )}

      {/* 角色纹章徽印与头像 */}
      <div className="relative my-0.5">
        {/* 说话者外层神圣旋转光晕 (根据情绪映射色彩) */}
        {isCurrentSpeaker && player.isAlive && (
          <div
            className={`absolute -inset-1 rounded-2xl opacity-85 blur-[2px] bg-gradient-to-r ${
              player.sentiment ? sentimentCfg.halo : 'from-rose-500 via-amber-400 to-rose-600 animate-spin-slow'
            }`}
          />
        )}

        <div
          className={`relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-br ${
            isCurrentSpeaker
              ? player.sentiment === 'NERVOUS'
                ? 'from-red-500 via-rose-500 to-amber-500'
                : 'from-amber-400 via-rose-500 to-amber-600'
              : 'from-slate-700/80 via-slate-800 to-slate-900'
          } shadow-lg transition-transform duration-200 group-hover:scale-105`}
        >
          <div className="w-full h-full rounded-[14px] bg-slate-950/95 flex flex-col items-center justify-center overflow-hidden relative">
            <CrestIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.accent} transition-transform duration-200 group-hover:scale-110`} />
            {!player.isAI && (
              <span
                className={`absolute bottom-0.5 text-xs font-bold tracking-wider font-sans px-1.5 py-0.5 rounded border scale-90 origin-bottom ${
                  isMe
                    ? 'text-amber-300 bg-amber-950/90 border-amber-500/50'
                    : 'text-cyan-300 bg-cyan-950/90 border-cyan-500/50'
                }`}
              >
                {isMe ? 'YOU' : 'HUMAN'}
              </span>
            )}
          </div>
        </div>

        {/* 说话波形动态频谱条 */}
        {isCurrentSpeaker && player.isAlive && (
          <div
            className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full shadow-lg border border-white/20 z-20 ${
              player.sentiment === 'NERVOUS'
                ? 'bg-gradient-to-r from-red-600 to-rose-600'
                : 'bg-gradient-to-r from-rose-600 to-amber-600'
            }`}
          >
            <span className="w-0.5 h-2.5 bg-white rounded-full animate-wave-bar"></span>
            <span className="w-0.5 h-4 bg-white rounded-full animate-wave-bar [animation-delay:0.15s]"></span>
            <span className="w-0.5 h-2 bg-white rounded-full animate-wave-bar [animation-delay:0.3s]"></span>
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-wave-bar [animation-delay:0.45s]"></span>
          </div>
        )}

        {/* 阵亡破裂覆面 */}
        {!player.isAlive && (
          <div className="absolute inset-0 bg-black/85 rounded-2xl flex flex-col items-center justify-center backdrop-blur-[1px] border border-red-900/60 z-20">
            <Skull className="w-7 h-7 text-red-500 drop-shadow-md animate-pulse" />
            <span className="text-xs font-bold text-red-400 mt-0.5 font-sans tracking-widest">OUT</span>
          </div>
        )}
      </div>

      {/* 玩家名称与名册 */}
      <div className="text-center mt-1 w-full flex flex-col items-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm font-bold text-slate-100 tracking-wide truncate max-w-[120px] font-sans">
            {player.name}
          </span>
        </div>

        {/* 语音智能情绪测谎仪徽章 (带声学微表情图标) */}
        {player.sentiment && (
          <div className="mt-1 inline-flex items-center gap-0.5" title={isZh ? `声纹情绪指征：${sentimentCfg.badgeText}` : `Voice Sentiment: ${sentimentCfg.badgeText}`}>
            <span
              className={`text-xs font-semibold font-sans px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 transition-all ${sentimentCfg.badgeClass}`}
            >
              <SentimentIcon className="w-3 h-3" />
              <span>{sentimentCfg.badgeText}</span>
            </span>
          </div>
        )}

        {/* 身份铭牌 */}
        {showRole ? (
          <div
            className={`mt-1 text-xs px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 shadow-sm font-sans ${getRoleBadge().style}`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{getRoleBadge().name}</span>
          </div>
        ) : (
          <div className="mt-1 text-xs px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800 text-slate-400 font-medium inline-block font-sans">
            {theme.title}
          </div>
        )}

        {/* AI 个性特征摘要 */}
        {player.isAI && player.persona && (
          <div className="mt-1 text-xs text-slate-400 leading-tight truncate max-w-[130px] mx-auto opacity-80 group-hover:opacity-100 transition-opacity font-sans">
            {isZh ? player.persona.toneStyleZh : player.persona.toneStyleEn}
          </div>
        )}
      </div>
    </div>
  );
};
