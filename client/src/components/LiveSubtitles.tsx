import React from 'react';
import { Activity, Mic, Sparkles } from 'lucide-react';
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

  return (
    <div className="w-full max-w-4xl mx-auto my-2 px-2">
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-[#0d1322] to-slate-950 border border-amber-500/25 p-4 shadow-xl backdrop-blur-md overflow-hidden">
        {/* 四角典雅金边装饰线 */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400"></div>

        {/* 标题与技术徽章栏 */}
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            {speakerId ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-xs font-bold text-amber-300 font-serif tracking-wider">
                  {speakerName || `#${speakerId}`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
                  <Mic className="w-2.5 h-2.5" />
                  {isZh ? '发言中' : 'LIVE'}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-serif flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400/60" />
                {isZh ? '法庭纪事 · 静候发言' : 'Chronicle · Silence at the Table'}
              </span>
            )}
          </div>

          {/* AssemblyAI 官方权威技术标识 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-300 text-[10px] font-mono tracking-tight shadow-sm">
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>AssemblyAI Universal-3.5 Pro Streaming</span>
          </div>
        </div>

        {/* 同传打字内容呈现区 */}
        <div className="min-h-[44px] flex items-center">
          {transcript ? (
            <p className="text-sm md:text-base text-slate-100 leading-relaxed font-sans font-medium">
              <span>{transcript}</span>
              {!isFinal && (
                <span className="inline-block w-1.5 h-4 ml-1.5 bg-amber-400 animate-pulse align-middle rounded-sm"></span>
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {isZh
                ? '席位沉寂，等待下一位执言者开麦或轮转……'
                : 'The circle awaits the next speaker to break the silence...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
