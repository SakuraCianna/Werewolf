import React from 'react';
import type { Player, Language } from 'voice-werewolf-shared';
import { PlayerCard } from './PlayerCard.js';

interface RoundTableProps {
  players: Player[];
  activeSpeakerId: number | null;
  language: Language;
  selectedTargetId: number | null;
  onSelectTarget: (id: number) => void;
  isGameOver: boolean;
  announcement: string;
}

export const RoundTable: React.FC<RoundTableProps> = ({
  players,
  activeSpeakerId,
  language,
  selectedTargetId,
  onSelectTarget,
  isGameOver,
  announcement,
}) => {
  // 如果尚未初始化玩家数组，提供 6 个席位占位
  const seatList =
    players.length === 6
      ? players
      : Array.from({ length: 6 }, (_, i) => ({
          id: i + 1,
          name: language === 'zh-CN' ? `${i + 1}号位` : `Seat #${i + 1}`,
          role: 'VILLAGER' as const,
          camp: 'GOOD' as const,
          isAI: i !== 0,
          isAlive: true,
          avatar: '',
        }));

  // 6 人六角圆桌相对布局
  const seatPositions = [
    'col-start-2 row-start-3', // 1号 (底端正中 - 真人)
    'col-start-1 row-start-2', // 2号 (左侧中间)
    'col-start-1 row-start-1', // 3号 (左上方)
    'col-start-2 row-start-1', // 4号 (顶端正中)
    'col-start-3 row-start-1', // 5号 (右上方)
    'col-start-3 row-start-2', // 6号 (右侧中间)
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto my-4 p-6 rounded-3xl bg-radial from-[#1e293b]/40 via-[#0f172a]/80 to-[#0a0d14] border border-slate-800 shadow-2xl">
      {/* 圆桌 3x3 网格布局 */}
      <div className="grid grid-cols-3 grid-rows-3 gap-6 items-center justify-items-center">
        {seatList.map((player) => (
          <div
            key={player.id}
            className={`${seatPositions[(player.id - 1) % 6]} w-full max-w-[150px]`}
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

        {/* 圆桌中央法官公告台与魔法阵 */}
        <div className="col-start-2 row-start-2 w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 shadow-inner text-center">
          <div className="w-12 h-12 rounded-full border border-rose-500/30 flex items-center justify-center mb-2 bg-rose-950/20">
            <span className="text-xl">🐺</span>
          </div>
          <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-[180px] line-clamp-3">
            {announcement || (language === 'zh-CN' ? '法官就绪，等待发牌……' : 'Moderator ready, awaiting game start...')}
          </p>
        </div>
      </div>
    </div>
  );
};
