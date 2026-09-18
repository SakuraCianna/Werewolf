import React, { useState } from 'react';
import { Share2, Copy, Check, X, Users, Wifi, Laptop, Sparkles } from 'lucide-react';
import { sfx } from '../utils/soundEffects.js';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  humanCount: number;
  maxCapacity: number;
  lanIp?: string;
  language: 'zh-CN' | 'en-US';
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  roomId,
  humanCount,
  maxCapacity,
  lanIp,
  language,
}) => {
  const [copiedType, setCopiedType] = useState<'lan' | 'local' | null>(null);
  const isZh = language === 'zh-CN';

  if (!isOpen) return null;

  const currentPort = window.location.port || '5173';
  const effectiveLanIp = lanIp && lanIp !== 'localhost' ? lanIp : window.location.hostname;
  const lanUrl = `http://${effectiveLanIp}:${currentPort}/?room=${encodeURIComponent(roomId)}`;
  const localUrl = `http://localhost:${currentPort}/?room=${encodeURIComponent(roomId)}`;

  const handleCopy = (text: string, type: 'lan' | 'local') => {
    sfx.playMicChime();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col items-center text-center overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/50 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 顶部标题与图标 */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-700/30 to-slate-900 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
          <Share2 className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-amber-200 font-sans tracking-wide mb-1 flex items-center gap-1.5">
          <span>{isZh ? '✦ 邀请好友 · 局域网开黑 ✦' : '✦ Invite Friends · LAN Match ✦'}</span>
        </h3>

        <p className="text-xs text-slate-400 font-sans max-w-sm mb-4 leading-relaxed">
          {isZh
            ? '复制房间链接发送给同 Wi-Fi 或局域网下的好友，好友点击即可直连加入圆桌，无需注册与维护好友列表！'
            : 'Share the link with friends on the same Wi-Fi/LAN to join instantly without account setup!'}
        </p>

        {/* 房间号与席位统计徽章 */}
        <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 mb-4 font-sans text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{isZh ? '当前房间：' : 'Room:'}</span>
            <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{roomId}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{isZh ? `真人席位: ${humanCount}/${maxCapacity}` : `Humans: ${humanCount}/${maxCapacity}`}</span>
          </div>
        </div>

        {/* 链接选项 1: 局域网分享链接 */}
        <div className="w-full mb-3 text-left">
          <div className="flex items-center justify-between text-xs text-amber-300/90 font-semibold mb-1.5 font-sans px-1">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              {isZh ? '局域网专属链接 (同 Wi-Fi 手机/电脑访问)' : 'LAN Link (For devices on same Wi-Fi)'}
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.2 rounded border border-emerald-500/30 font-sans">
              {isZh ? '推荐好友使用' : 'Recommended'}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/90 border border-slate-700/70">
            <input
              type="text"
              readOnly
              value={lanUrl}
              className="flex-1 bg-transparent text-xs text-slate-300 font-mono outline-none truncate select-all px-1"
            />
            <button
              onClick={() => handleCopy(lanUrl, 'lan')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer ${
                copiedType === 'lan'
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-amber-600/90 hover:bg-amber-500 text-slate-950 border-amber-400 shadow-sm active:scale-95'
              }`}
            >
              {copiedType === 'lan' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>{isZh ? '已复制' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isZh ? '复制链接' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 链接选项 2: 本机测试链接 */}
        <div className="w-full mb-4 text-left">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1.5 font-sans px-1">
            <Laptop className="w-3.5 h-3.5 text-blue-400" />
            <span>{isZh ? '本机多窗口调试链接 (Localhost)' : 'Localhost Link (Same Machine)'}</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/90 border border-slate-800">
            <input
              type="text"
              readOnly
              value={localUrl}
              className="flex-1 bg-transparent text-xs text-slate-400 font-mono outline-none truncate select-all px-1"
            />
            <button
              onClick={() => handleCopy(localUrl, 'local')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold border transition-all cursor-pointer ${
                copiedType === 'local'
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 active:scale-95'
              }`}
            >
              {copiedType === 'local' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>{isZh ? '已复制' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isZh ? '复制' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="w-full flex items-center justify-center gap-1.5 text-[11px] text-amber-400/80 font-sans">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{isZh ? '未被真人占用的空闲席位将自动由 AI 智能体补齐' : 'Empty seats will automatically be filled by AI agents'}</span>
        </div>
      </div>
    </div>
  );
};
