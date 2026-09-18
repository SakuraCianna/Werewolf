import React from 'react';
import type { Language, GamePhase, Role } from 'voice-werewolf-shared';
import { Moon, Sun, Shield, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isGameStarted: boolean;
  phase: GamePhase;
  round: number;
  isConnected?: boolean;
  onRestart?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
  preferredRole?: Role | 'RANDOM';
  onPreferredRoleChange?: (role: Role | 'RANDOM') => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  isGameStarted,
  phase,
  round,
  isConnected = true,
  onRestart,
  muted = false,
  onToggleMute,
  preferredRole = 'RANDOM',
  onPreferredRoleChange,
}) => {
  const isZh = language === 'zh-CN';
  const isNight = phase.startsWith('NIGHT');

  const getPhaseName = () => {
    if (phase === 'IDLE') return isZh ? '等待集结' : 'Lobby';
    if (phase === 'NIGHT_START') return isZh ? `第 ${round} 晚 · 暗夜降临` : `Night ${round} · Nightfall`;
    if (phase === 'NIGHT_WOLF') return isZh ? `第 ${round} 晚 · 狼人狩猎` : `Night ${round} · Wolf Hunt`;
    if (phase === 'NIGHT_SEER') return isZh ? `第 ${round} 晚 · 预言凝视` : `Night ${round} · Seer Vision`;
    if (phase === 'NIGHT_WITCH') return isZh ? `第 ${round} 晚 · 巫药秘仪` : `Night ${round} · Witchcraft`;
    if (phase === 'DAY_START') return isZh ? `第 ${round} 天 · 晨曦破晓` : `Day ${round} · Dawn Break`;
    if (phase === 'DAY_DISCUSS') return isZh ? `第 ${round} 天 · 执言辩驳` : `Day ${round} · Discussion`;
    if (phase === 'DAY_VOTE') return isZh ? `第 ${round} 天 · 裁决公投` : `Day ${round} · Exile Vote`;
    if (phase === 'DAY_VOTE_RESULT') return isZh ? `第 ${round} 天 · 裁决公布` : `Day ${round} · Verdict`;
    if (phase === 'GAME_OVER') return isZh ? '命运结算' : 'Game Over';
    return phase;
  };

  return (
    <header className="w-full h-14 bg-slate-950/95 border-b border-amber-500/25 px-3 sm:px-6 flex items-center justify-between shadow-lg backdrop-blur-md z-30 shrink-0 select-none">
      {/* 品牌标识 */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-rose-600 to-amber-700 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full rounded-[9px] bg-slate-950/80 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-400 drop-shadow" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-wider text-slate-100 font-sans">
              VOICE WEREWOLF
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-sans font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30">
              <Sparkles className="w-2.5 h-2.5 text-rose-400" /> AssemblyAI v3
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 leading-tight">
            <span>{isZh ? '全语音 AI 狼人杀桌游' : 'Voice Agent Tabletop'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="flex items-center gap-1 font-sans">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              {isConnected ? (isZh ? '实时在线' : 'Live') : (isZh ? '断线重连' : 'Offline')}
            </span>
          </div>
        </div>
      </div>

      {/* 状态徽章、身份预选、重新开始按钮、声音开关与语言锁 */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* 身份预选器 (未开局时可自由指定，开局后锁定) */}
        {!isGameStarted && onPreferredRoleChange && (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-amber-500/30 rounded-lg px-2 py-1 shadow-inner">
            <span className="text-[10px] text-amber-400/90 font-sans hidden lg:inline">
              {isZh ? '身份挑选:' : 'Role:'}
            </span>
            <select
              value={preferredRole}
              onChange={(e) => onPreferredRoleChange(e.target.value as Role | 'RANDOM')}
              className="bg-transparent text-xs text-amber-300 font-sans outline-none cursor-pointer"
            >
              <option value="RANDOM" className="bg-slate-900 text-slate-200">
                {isZh ? '🎲 随机发牌 (防连庄)' : '🎲 Random (No Repeat)'}
              </option>
              <option value="WEREWOLF" className="bg-slate-900 text-rose-300">
                {isZh ? '🐺 潜伏狼人' : '🐺 Werewolf'}
              </option>
              <option value="SEER" className="bg-slate-900 text-purple-300">
                {isZh ? '🔮 洞察预言家' : '🔮 Seer'}
              </option>
              <option value="WITCH" className="bg-slate-900 text-emerald-300">
                {isZh ? '🧪 神秘女巫' : '🧪 Witch'}
              </option>
              <option value="VILLAGER" className="bg-slate-900 text-amber-300">
                {isZh ? '🌾 正义平民' : '🌾 Villager'}
              </option>
            </select>
          </div>
        )}

        {/* 当前对局状态标签 */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-sm ${
            isNight
              ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 shadow-indigo-950/40'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-amber-950/40'
          }`}
        >
          {isNight ? (
            <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="tracking-wide font-sans">{getPhaseName()}</span>
        </div>

        {/* 重新开始按钮 (Restart Game) */}
        <button
          onClick={onRestart}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400/50 text-xs font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
          title={isZh ? '重置并开启新局' : 'Restart New Game'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-sans">{isZh ? '重新开始' : 'Restart'}</span>
        </button>

        {/* 全局声音开关 */}
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
            title={muted ? (isZh ? '开启声音' : 'Unmute') : (isZh ? '静音' : 'Mute')}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
          </button>
        )}

        {/* 语言切换器 (开局后锁定不可修改) */}
        <div className="flex items-center bg-slate-900/90 border border-amber-500/30 rounded-lg p-0.5 shadow-inner">
          <button
            disabled={isGameStarted}
            onClick={() => onLanguageChange('zh-CN')}
            className={`px-2 py-0.5 text-xs rounded-md transition-all cursor-pointer font-sans ${
              language === 'zh-CN'
                ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            } ${isGameStarted ? 'cursor-not-allowed opacity-60' : ''}`}
            title={isGameStarted ? (isZh ? '局内不可更改语言' : 'Language locked during game') : ''}
          >
            中文
          </button>
          <button
            disabled={isGameStarted}
            onClick={() => onLanguageChange('en-US')}
            className={`px-2 py-0.5 text-xs rounded-md transition-all cursor-pointer font-sans ${
              language === 'en-US'
                ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            } ${isGameStarted ? 'cursor-not-allowed opacity-60' : ''}`}
            title={isGameStarted ? (isZh ? '局内不可更改语言' : 'Language locked during game') : ''}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
