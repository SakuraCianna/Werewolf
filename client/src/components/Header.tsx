import React from 'react';
import type { Language, GamePhase } from 'voice-werewolf-shared';
import { Moon, Sun, Shield, Sparkles, Volume2 } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isGameStarted: boolean;
  phase: GamePhase;
  round: number;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  isGameStarted,
  phase,
  round,
}) => {
  const isZh = language === 'zh-CN';
  const isNight = phase.startsWith('NIGHT');

  const getPhaseName = () => {
    if (phase === 'IDLE') return isZh ? '准备开局' : 'Lobby';
    if (phase === 'NIGHT_START') return isZh ? `第 ${round} 晚 · 天黑闭眼` : `Night ${round} · Nightfall`;
    if (phase === 'NIGHT_WOLF') return isZh ? `第 ${round} 晚 · 狼人出没` : `Night ${round} · Werewolf Hunt`;
    if (phase === 'NIGHT_SEER') return isZh ? `第 ${round} 晚 · 预言验人` : `Night ${round} · Seer Vision`;
    if (phase === 'NIGHT_WITCH') return isZh ? `第 ${round} 晚 · 女巫制药` : `Night ${round} · Witch Potion`;
    if (phase === 'DAY_START') return isZh ? `第 ${round} 天 · 晨曦宣布` : `Day ${round} · Dawn Break`;
    if (phase === 'DAY_DISCUSS') return isZh ? `第 ${round} 天 · 白天发言` : `Day ${round} · Discussion`;
    if (phase === 'DAY_VOTE') return isZh ? `第 ${round} 天 · 放逐公投` : `Day ${round} · Exile Vote`;
    if (phase === 'DAY_VOTE_RESULT') return isZh ? `第 ${round} 天 · 投票公布` : `Day ${round} · Vote Result`;
    if (phase === 'GAME_OVER') return isZh ? '游戏结算' : 'Game Over';
    return phase;
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0d14]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-amber-700 flex items-center justify-center shadow-lg shadow-rose-950/50">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-slate-100 font-serif">
              VOICE WEREWOLF
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AssemblyAI Voice Agent
            </span>
          </div>
          <p className="text-xs text-slate-400">AI + Human Voice Tabletop Game</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 当前对局状态标签 */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            isNight
              ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          {isNight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          <span>{getPhaseName()}</span>
        </div>

        {/* 语言切换器 (开局后锁定不可修改) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            disabled={isGameStarted}
            onClick={() => onLanguageChange('zh-CN')}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${
              language === 'zh-CN'
                ? 'bg-rose-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            } ${isGameStarted ? 'cursor-not-allowed opacity-75' : ''}`}
            title={isGameStarted ? (isZh ? '局内不可更改语言' : 'Language locked during game') : ''}
          >
            中文
          </button>
          <button
            disabled={isGameStarted}
            onClick={() => onLanguageChange('en-US')}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${
              language === 'en-US'
                ? 'bg-rose-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            } ${isGameStarted ? 'cursor-not-allowed opacity-75' : ''}`}
            title={isGameStarted ? (isZh ? '局内不可更改语言' : 'Language locked during game') : ''}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
