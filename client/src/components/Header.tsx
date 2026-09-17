import React from 'react';
import type { Language, GamePhase } from 'voice-werewolf-shared';
import { Moon, Sun, Shield, Sparkles, Volume2 } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isGameStarted: boolean;
  phase: GamePhase;
  round: number;
  isConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  isGameStarted,
  phase,
  round,
  isConnected = true,
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
    <header className="w-full flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-amber-500/20 bg-[#070b12]/85 backdrop-blur-md sticky top-0 z-40 shadow-2xl">
      {/* 品牌标识与技术标牌 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-rose-800 to-slate-950 p-0.5 shadow-lg shadow-rose-950/40 border border-amber-400/40 flex items-center justify-center">
          <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400 drop-shadow" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-wider text-slate-100 font-serif">
              VOICE WEREWOLF
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30">
              <Sparkles className="w-2.5 h-2.5 text-rose-400" /> AssemblyAI v3
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>{isZh ? '全语音 AI 狼人杀桌游' : 'Voice Agent Tabletop'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="flex items-center gap-1 text-[10px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              {isConnected ? (isZh ? '实时在线' : 'Live') : (isZh ? '断线重连' : 'Offline')}
            </span>
          </div>
        </div>
      </div>

      {/* 昼夜对局相位徽章与语言锁 */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 当前对局状态标签 */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-serif font-medium transition-all shadow-md ${
            isNight
              ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 shadow-indigo-950/40'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-amber-950/40'
          }`}
        >
          {isNight ? (
            <Moon className="w-4 h-4 text-indigo-400 animate-pulse" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
          <span className="tracking-wide">{getPhaseName()}</span>
        </div>

        {/* 语言切换器 (开局后锁定不可修改) */}
        <div className="flex items-center bg-slate-900/90 border border-amber-500/30 rounded-xl p-1 shadow-inner">
          <button
            disabled={isGameStarted}
            onClick={() => onLanguageChange('zh-CN')}
            className={`px-2.5 py-1 text-xs rounded-lg font-serif transition-all cursor-pointer ${
              language === 'zh-CN'
                ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            } ${isGameStarted ? 'cursor-not-allowed opacity-60' : ''}`}
            title={isGameStarted ? (isZh ? '局内不可更改语言' : 'Language locked during game') : ''}
          >
            中文
          </button>
          <button
            disabled={isGameStarted}
            onClick={() => onLanguageChange('en-US')}
            className={`px-2.5 py-1 text-xs rounded-lg font-serif transition-all cursor-pointer ${
              language === 'en-US'
                ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white font-bold shadow-md'
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
