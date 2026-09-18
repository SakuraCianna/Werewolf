import React from 'react';
import type { Player, Language } from 'voice-werewolf-shared';
import { PlayerCard } from './PlayerCard.js';
import { Moon, Sun } from 'lucide-react';

interface RoundTableProps {
  players: Player[];
  activeSpeakerId: number | null;
  language: Language;
  selectedTargetId: number | null;
  onSelectTarget: (id: number) => void;
  isGameOver: boolean;
  announcement: string;
  phase?: string;
  speakingTimerSeconds?: number;
  myPlayerId?: number;
}

export const RoundTable: React.FC<RoundTableProps> = ({
  players,
  activeSpeakerId,
  language,
  selectedTargetId,
  onSelectTarget,
  isGameOver,
  announcement,
  phase = 'IDLE',
  myPlayerId = 1,
}) => {
  const isZh = language === 'zh-CN';
  const isNight = phase.startsWith('NIGHT');

  const seatList =
    players.length === 6
      ? players
      : Array.from({ length: 6 }, (_, i) => ({
          id: i + 1,
          name: isZh ? `${i + 1}号位` : `Seat #${i + 1}`,
          role: 'VILLAGER' as const,
          camp: 'GOOD' as const,
          isAI: i !== 0,
          isAlive: true,
          avatar: '',
        }));

  const seatPositions = [
    'col-start-2 row-start-3', // 1号 (底端正中 - 真人宿主)
    'col-start-1 row-start-2', // 2号 (左侧中间)
    'col-start-1 row-start-1', // 3号 (左上方)
    'col-start-2 row-start-1', // 4号 (顶端正中)
    'col-start-3 row-start-1', // 5号 (右上方)
    'col-start-3 row-start-2', // 6号 (右侧中间)
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto p-2 sm:p-3 md:p-4 rounded-[2rem] bg-gradient-to-b from-[#0e1422]/95 via-[#080d16] to-[#04060a] border border-amber-500/25 shadow-tabletop overflow-hidden flex items-center justify-center">
      {/* 典雅中世纪星盘与符文魔法阵动态矢量底纹 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15">
        <svg
          viewBox="0 0 500 500"
          className="w-[480px] h-[480px] animate-spin-slow text-amber-400"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="250" cy="250" r="240" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle cx="250" cy="250" r="215" strokeWidth="1" />
          <circle cx="250" cy="250" r="170" strokeWidth="1" strokeDasharray="12 4" />
          <circle cx="250" cy="250" r="110" strokeWidth="1.5" />
          {/* 星盘八角芒星 */}
          <polygon points="250,35 295,190 450,205 335,305 375,460 250,370 125,460 165,305 50,205 205,190" strokeWidth="0.8" opacity="0.6" />
          {/* 刻度辐射线 */}
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="250"
              y1="10"
              x2="250"
              y2="25"
              transform={`rotate(${i * 15} 250 250)`}
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <div className="absolute w-[320px] h-[320px] rounded-full border border-rose-500/30 animate-spin-reverse-slow"></div>
        <div className="absolute w-[200px] h-[200px] rounded-full bg-radial from-amber-500/15 via-rose-500/5 to-transparent blur-lg"></div>
      </div>

      {/* 6 席位圆桌 3x3 空间阵列 */}
      <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-y-1.5 sm:gap-y-2 md:gap-y-3 gap-x-2 sm:gap-x-5 md:gap-x-8 items-center justify-items-center w-full">
        {seatList.map((player) => (
          <div
            key={player.id}
            className={`${seatPositions[(player.id - 1) % 6]} w-full max-w-[125px] sm:max-w-[140px] md:max-w-[155px]`}
          >
            <PlayerCard
              player={player}
              isCurrentSpeaker={activeSpeakerId === player.id}
              language={language}
              showRole={(!player.isAI && player.id === myPlayerId && phase !== 'IDLE') || isGameOver}
              isSelected={selectedTargetId === player.id}
              onSelect={() => onSelectTarget(player.id)}
              myPlayerId={myPlayerId}
            />
          </div>
        ))}

        {/* 圆桌中央核心：天象仪与法官神谕台 */}
        <div className="col-start-2 row-start-2 w-full h-full max-w-[190px] sm:max-w-[210px] flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-amber-500/35 shadow-xl backdrop-blur-md text-center relative group">
          {/* 天象徽章 */}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1 shadow-md transition-all duration-500 ${
              isNight
                ? 'bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 border border-purple-500/50 text-purple-300 shadow-purple-950/70'
                : 'bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-950 border border-amber-400/60 text-amber-200 shadow-amber-950/70'
            }`}
          >
            {isNight ? (
              <Moon className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse text-indigo-300 drop-shadow" />
            ) : (
              <Sun className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow text-amber-300 drop-shadow" />
            )}
          </div>

          {/* 法官神谕公告 */}
          <div className="w-full px-1">
            <span className="text-[9px] font-sans uppercase tracking-widest text-amber-400/90 font-bold block mb-0.5">
              {isZh ? '✦ 法官神谕 ✦' : '✦ ORACLE VERDICT ✦'}
            </span>
            <p className="text-[11px] sm:text-xs font-medium text-slate-200 leading-snug line-clamp-2 font-sans drop-shadow-sm">
              {announcement || (isZh ? '晨昏交替，等待发牌……' : 'Awaiting fateful cards...')}
            </p>
            {activeSpeakerId && (
              <div className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-sans inline-block animate-pulse">
                {isZh ? `✦ ${activeSpeakerId}号 正在发言 ✦` : `✦ #${activeSpeakerId} Speaking ✦`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
