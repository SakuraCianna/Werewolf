import React from 'react';
import type { Player, Language } from 'voice-werewolf-shared';
import { PlayerCard } from './PlayerCard.js';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { sfx } from '../utils/soundEffects.js';

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
}) => {
  const isZh = language === 'zh-CN';
  const isNight = phase.startsWith('NIGHT');
  const [muted, setMuted] = React.useState(sfx.getMuted());

  const toggleSound = () => {
    const next = !muted;
    sfx.setMuted(next);
    setMuted(next);
  };

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
    <div className="relative w-full max-w-4xl mx-auto my-3 p-5 sm:p-7 md:p-8 rounded-[2.5rem] bg-gradient-to-b from-[#0e1422]/95 via-[#080d16] to-[#04060a] border border-amber-500/30 shadow-tabletop overflow-hidden">
      {/* 典雅中世纪星盘与符文魔法阵动态矢量底纹 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
        <svg
          viewBox="0 0 500 500"
          className="w-[520px] h-[520px] animate-spin-slow text-amber-400"
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
        <div className="absolute w-[360px] h-[360px] rounded-full border border-rose-500/30 animate-spin-reverse-slow"></div>
        <div className="absolute w-[240px] h-[240px] rounded-full bg-radial from-amber-500/15 via-rose-500/5 to-transparent blur-xl"></div>
      </div>

      {/* 音效控制按钮 */}
      <button
        onClick={toggleSound}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-amber-300 hover:border-amber-500/50 transition-all z-20 cursor-pointer shadow-lg active:scale-95"
        title={muted ? (isZh ? '开启音效' : 'Unmute SFX') : (isZh ? '静音音效' : 'Mute SFX')}
      >
        {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
      </button>

      {/* 6 席位圆桌 3x3 空间阵列 */}
      <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-y-4 gap-x-3 sm:gap-x-6 md:gap-x-8 items-center justify-items-center min-h-[460px]">
        {seatList.map((player) => (
          <div
            key={player.id}
            className={`${seatPositions[(player.id - 1) % 6]} w-full max-w-[155px]`}
          >
            <PlayerCard
              player={player}
              isCurrentSpeaker={activeSpeakerId === player.id}
              language={language}
              showRole={!player.isAI || isGameOver}
              isSelected={selectedTargetId === player.id}
              onSelect={() => onSelectTarget(player.id)}
            />
          </div>
        ))}

        {/* 圆桌中央核心：天象仪与法官神谕台 */}
        <div className="col-start-2 row-start-2 w-full h-full flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-amber-500/35 shadow-2xl backdrop-blur-md text-center relative group">
          {/* 天象徽章 */}
          <div
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2 shadow-lg transition-all duration-500 ${
              isNight
                ? 'bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 border border-purple-500/50 text-purple-300 shadow-purple-950/70'
                : 'bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-950 border border-amber-400/60 text-amber-200 shadow-amber-950/70'
            }`}
          >
            {isNight ? (
              <Moon className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-indigo-300 drop-shadow" />
            ) : (
              <Sun className="w-6 h-6 sm:w-7 sm:h-7 animate-spin-slow text-amber-300 drop-shadow" />
            )}
          </div>

          {/* 法官神谕公告 */}
          <div className="w-full px-1">
            <span className="text-[10px] font-serif uppercase tracking-widest text-amber-400/90 font-bold block mb-1">
              {isZh ? '✦ 法官神谕 ✦' : '✦ ORACLE PROCLAMATION ✦'}
            </span>
            <p className="text-xs font-medium text-slate-200 leading-relaxed line-clamp-3 font-serif drop-shadow-sm">
              {announcement || (isZh ? '晨昏交替，等待发牌……' : 'Awaiting fateful cards...')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
