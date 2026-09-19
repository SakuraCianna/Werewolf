import React from 'react';
import type { Player, Language } from 'voice-werewolf-shared';
import { PlayerCard } from './PlayerCard.js';
import { Moon, Sun, Sparkles, Volume2 } from 'lucide-react';

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
    <div
      className={`relative w-full max-w-4xl mx-auto pt-3.5 pb-2.5 px-2.5 sm:pt-4 sm:pb-3.5 sm:px-3.5 md:p-5 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-b ${
        isNight
          ? 'from-[#0b0e1b]/95 via-[#060812] to-[#020308] border-purple-500/35 shadow-[0_12px_50px_rgba(88,28,135,0.25)]'
          : 'from-[#0e1526]/95 via-[#080d18] to-[#030509] border-amber-500/30 shadow-tabletop'
      } border overflow-hidden flex items-center justify-center transition-all duration-700`}
    >
      {/* 中世纪哥特暗金雕花角饰 (四角古典尊荣饰印) */}
      <div className="absolute top-2.5 left-2.5 w-8 h-8 pointer-events-none opacity-40 text-amber-400/80">
        <svg viewBox="0 0 40 40" fill="currentColor">
          <path d="M0,0 L20,0 C15,5 10,10 10,20 L0,20 Z" />
          <circle cx="6" cy="6" r="2" />
        </svg>
      </div>
      <div className="absolute top-2.5 right-2.5 w-8 h-8 pointer-events-none opacity-40 text-amber-400/80 -scale-x-100">
        <svg viewBox="0 0 40 40" fill="currentColor">
          <path d="M0,0 L20,0 C15,5 10,10 10,20 L0,20 Z" />
          <circle cx="6" cy="6" r="2" />
        </svg>
      </div>
      <div className="absolute bottom-2.5 left-2.5 w-8 h-8 pointer-events-none opacity-40 text-amber-400/80 -scale-y-100">
        <svg viewBox="0 0 40 40" fill="currentColor">
          <path d="M0,0 L20,0 C15,5 10,10 10,20 L0,20 Z" />
          <circle cx="6" cy="6" r="2" />
        </svg>
      </div>
      <div className="absolute bottom-2.5 right-2.5 w-8 h-8 pointer-events-none opacity-40 text-amber-400/80 -scale-x-100 -scale-y-100">
        <svg viewBox="0 0 40 40" fill="currentColor">
          <path d="M0,0 L20,0 C15,5 10,10 10,20 L0,20 Z" />
          <circle cx="6" cy="6" r="2" />
        </svg>
      </div>

      {/* 阵营两极能量场背景薄雾 (狼人暗夜与好人圣光对峙) */}
      <div className="absolute inset-0 pointer-events-none flex justify-between overflow-hidden opacity-30">
        <div className="w-1/2 h-full bg-gradient-to-r from-purple-900/20 via-indigo-950/10 to-transparent blur-2xl"></div>
        <div className="w-1/2 h-full bg-gradient-to-l from-amber-600/15 via-yellow-950/10 to-transparent blur-2xl"></div>
      </div>

      {/* 典雅中世纪星盘与十二宫符文魔法阵动态矢量底纹 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
        <svg
          viewBox="0 0 500 500"
          className={`w-[500px] h-[500px] animate-spin-slow ${isNight ? 'text-purple-400' : 'text-amber-400'}`}
          fill="none"
          stroke="currentColor"
        >
          <circle cx="250" cy="250" r="242" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle cx="250" cy="250" r="220" strokeWidth="1.2" />
          <circle cx="250" cy="250" r="175" strokeWidth="1" strokeDasharray="14 4" />
          <circle cx="250" cy="250" r="115" strokeWidth="1.5" />
          {/* 星盘八角芒星 */}
          <polygon
            points="250,30 295,190 455,205 335,310 380,470 250,375 120,470 165,310 45,205 205,190"
            strokeWidth="1"
            opacity="0.7"
          />
          {/* 刻度辐射线 */}
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="250"
              y1="8"
              x2="250"
              y2="24"
              transform={`rotate(${i * 15} 250 250)`}
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <div
          className={`absolute w-[330px] h-[330px] rounded-full border ${
            isNight ? 'border-purple-500/35' : 'border-amber-500/35'
          } animate-spin-reverse-slow`}
        ></div>
        <div
          className={`absolute w-[210px] h-[210px] rounded-full bg-radial ${
            isNight ? 'from-purple-500/20 via-indigo-500/10' : 'from-amber-500/20 via-yellow-500/10'
          } to-transparent blur-xl`}
        ></div>
      </div>

      {/* 6 席位圆桌 3x3 空间阵列 */}
      <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-y-1 sm:gap-y-2.5 md:gap-y-3.5 gap-x-2 sm:gap-x-5 md:gap-x-8 items-center justify-items-center w-full">
        {seatList.map((player) => (
          <div
            key={player.id}
            className={`${seatPositions[(player.id - 1) % 6]} w-full max-w-[150px] sm:max-w-[165px] md:max-w-[180px]`}
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

        {/* 圆桌中央核心：法官神谕圣坛 (Oracle Altar) */}
        <div className="col-start-2 row-start-2 w-full h-full max-w-[215px] sm:max-w-[245px] flex items-center justify-center relative">
          {/* 发言时向外扩散的声波涟漪光环 (Sound Ripple Pulse) */}
          {activeSpeakerId && (
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/40 animate-ping pointer-events-none -z-10"></div>
          )}
          {activeSpeakerId && (
            <div className="absolute -inset-2 rounded-3xl bg-amber-500/15 blur-md animate-pulse pointer-events-none -z-10"></div>
          )}

          <div
            className={`w-full h-full flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 border ${
              isNight
                ? 'border-purple-500/50 shadow-[0_0_30px_rgba(88,28,135,0.35)]'
                : 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
            } shadow-2xl backdrop-blur-md text-center relative group transition-all duration-500 overflow-hidden`}
          >
            {/* 圣坛顶端微金饰线 */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"></div>

            {/* 天象徽章 (太阳/月亮相位旋转中枢) */}
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-1.5 shadow-lg transition-all duration-500 ${
                isNight
                  ? 'bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 border border-purple-400/60 text-purple-300 shadow-purple-950/80'
                  : 'bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-950 border border-amber-400/70 text-amber-200 shadow-amber-950/80'
              }`}
            >
              {isNight ? (
                <Moon className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse text-indigo-200 drop-shadow" />
              ) : (
                <Sun className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow text-amber-200 drop-shadow" />
              )}
            </div>

            {/* 法官神谕公告 */}
            <div className="w-full px-1">
              <span
                className={`text-xs font-sans uppercase tracking-widest ${
                  isNight ? 'text-purple-300 font-bold' : 'text-amber-400 font-bold'
                } block mb-1 flex items-center justify-center gap-1`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{isZh ? '法官神谕' : 'ORACLE VERDICT'}</span>
                <Sparkles className="w-3 h-3" />
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-100 leading-snug line-clamp-2 font-sans drop-shadow-sm">
                {announcement || (isZh ? '晨昏交替，等待发牌……' : 'Awaiting fateful cards...')}
              </p>
              {activeSpeakerId && (
                <div className="mt-1.5 text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-sans inline-flex items-center gap-1 animate-pulse font-semibold shadow-sm">
                  <Volume2 className="w-3 h-3 text-rose-400" />
                  <span>{isZh ? `${activeSpeakerId}号 正在发言` : `#${activeSpeakerId} Speaking`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
