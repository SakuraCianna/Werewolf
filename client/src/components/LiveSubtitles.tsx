import React from 'react';
import { Mic, Activity } from 'lucide-react';
import type { Language } from 'voice-werewolf-shared';

interface LiveSubtitlesProps {
  speakerId: number | null;
  speakerName: string;
  transcript: string;
  isFinal: boolean;
  language: Language;
}

export const LiveSubtitles: React.FC<LiveSubtitlesProps> = ({
  speakerId,
  speakerName,
  transcript,
  isFinal,
  language,
}) => {
  const isZh = language === 'zh-CN';

  if (!speakerId && !transcript) {
    return (
      <div className="w-full max-w-3xl mx-auto h-20 rounded-2xl border border-slate-800/60 bg-slate-950/40 flex items-center justify-center text-slate-500 text-xs">
        {isZh ? '当前无人发言，静候对弈' : 'Silence falls across the table...'}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 rounded-2xl border border-rose-900/30 bg-slate-950/80 backdrop-blur shadow-xl">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
          <span className="text-xs font-bold text-rose-400">
            {speakerName || (speakerId ? `${speakerId}号` : '')}
          </span>
          <span className="text-[10px] text-slate-400">
            {isZh ? '正在发言……' : 'Speaking...'}
          </span>
        </div>

        {/* AssemblyAI 官方技术亮点徽章 */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-500/30 text-blue-300 text-[10px] font-mono">
          <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
          <span>AssemblyAI Streaming STT [Universal-3.5 Pro]</span>
        </div>
      </div>

      {/* 实时打字机同传字幕输出 */}
      <div className="min-h-[40px] text-sm text-slate-200 leading-relaxed font-sans">
        <span>{transcript}</span>
        {!isFinal && (
          <span className="inline-block w-2 h-4 ml-1 bg-rose-400 animate-pulse align-middle"></span>
        )}
      </div>
    </div>
  );
};
