import React from 'react';
import { ShieldAlert, Users, Flame, RotateCcw, PlusCircle } from 'lucide-react';

interface RoomBlockedModalProps {
  isOpen: boolean;
  reason: 'ROOM_FULL' | 'GAME_ALREADY_STARTED' | 'INVALID_ROOM';
  message: string;
  language: 'zh-CN' | 'en-US';
  onCreateNewRoom: () => void;
  onReturnHome: () => void;
}

export const RoomBlockedModal: React.FC<RoomBlockedModalProps> = ({
  isOpen,
  reason,
  message,
  language,
  onCreateNewRoom,
  onReturnHome,
}) => {
  const isZh = language === 'zh-CN';

  if (!isOpen) return null;

  const isFull = reason === 'ROOM_FULL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-rose-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(244,63,94,0.25)] flex flex-col items-center text-center overflow-hidden">
        {/* 顶部警告图标 */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600/30 via-red-900/40 to-slate-950 border border-rose-500/60 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
          {isFull ? <Users className="w-7 h-7 animate-pulse" /> : <ShieldAlert className="w-7 h-7 animate-pulse" />}
        </div>

        {/* 拦截原因标题 */}
        <h3 className="text-xl font-bold text-rose-200 font-sans tracking-wide mb-1.5">
          {isFull
            ? isZh
              ? '✦ 房间席位已满员 ✦'
              : '✦ Room Capacity Reached ✦'
            : isZh
            ? '✦ 结界闭合 · 对局已在进行中 ✦'
            : '✦ Match In Progress · Entry Denied ✦'}
        </h3>

        {/* 详细拦截信息 */}
        <p className="text-xs sm:text-sm text-slate-300/85 font-sans leading-relaxed mb-6 max-w-sm">
          {message ||
            (isFull
              ? isZh
                ? '该房间已有 6 位玩家（真人席位已占满），无法继续容纳新玩家。'
                : 'This room has reached the maximum 6-player limit.'
              : isZh
              ? '该房间的命运之局已经开始，为了保障公平对弈与沉浸体验，禁止中途加入。'
              : 'The match is already underway. Late joining is restricted to ensure fairness.')}
        </p>

        {/* 快捷操作区 */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onCreateNewRoom}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-sans font-bold text-xs shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isZh ? '创建属于我的新房间' : 'Create My Own Room'}</span>
          </button>

          <button
            onClick={onReturnHome}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-sans font-semibold text-xs border border-slate-700 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isZh ? '返回单人单机模式' : 'Return to Solo Mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
