import React, { useEffect, useRef } from 'react';
import {
  Activity,
  Mic,
  Sparkles,
  ScrollText,
  ShieldAlert,
  Flame,
  Scale,
  Volume2,
  Compass,
  Radio,
  Zap,
} from 'lucide-react';
import type { Language, SentimentAnalysisResult } from 'voice-werewolf-shared';
import type { ChronicleItem } from '../hooks/useGameSocket.js';

interface LiveSubtitlesProps {
  speakerId: number | null;
  speakerName: string;
  transcript: string;
  isFinal: boolean;
  language: Language;
  sentiment?: SentimentAnalysisResult | null;
  chronicleLogs?: ChronicleItem[];
  phase?: string;
}

export const LiveSubtitles: React.FC<LiveSubtitlesProps> = ({
  speakerId,
  speakerName,
  transcript,
  isFinal,
  language,
  sentiment,
  chronicleLogs = [],
  phase = 'IDLE',
}) => {
  const isZh = language === 'zh-CN';
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // 当编年史日志更新或有新字幕到达时，自动平滑跟进到底部
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chronicleLogs.length, transcript]);

  // 情绪声学诊断主题配置
  const getSentimentTheme = (s?: SentimentAnalysisResult | null) => {
    if (!s) return null;
    switch (s.sentiment) {
      case 'NERVOUS':
        return {
          title: isZh ? '深度心虚指征' : 'Nervous & Anxious',
          sub: isZh ? '言辞急迫 · 存在谎言伪装嫌疑' : 'Potential deception detected',
          bg: 'bg-gradient-to-r from-red-950/90 via-red-900/60 to-slate-900/90 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
          barColor: 'bg-gradient-to-r from-rose-500 to-red-600',
          textColor: 'text-red-300',
          scoreLabel: isZh ? '欺瞒指数' : 'Deception',
          Icon: ShieldAlert,
        };
      case 'AGGRESSIVE':
        return {
          title: isZh ? '强势施压进攻' : 'Aggressive Dominance',
          sub: isZh ? '情绪激昂 · 强行带队归票' : 'Strong pressure & push',
          bg: 'bg-gradient-to-r from-amber-950/90 via-orange-950/60 to-slate-900/90 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
          barColor: 'bg-gradient-to-r from-yellow-500 to-amber-600',
          textColor: 'text-amber-300',
          scoreLabel: isZh ? '进攻指数' : 'Aggression',
          Icon: Flame,
        };
      case 'DEFENSIVE':
        return {
          title: isZh ? '谨慎防守自辩' : 'Defensive Caution',
          sub: isZh ? '谨言自保 · 阐述清白逻辑' : 'Protective logic deduction',
          bg: 'bg-gradient-to-r from-blue-950/90 via-cyan-950/60 to-slate-900/90 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
          barColor: 'bg-gradient-to-r from-cyan-500 to-blue-600',
          textColor: 'text-blue-300',
          scoreLabel: isZh ? '防御指数' : 'Defense',
          Icon: Scale,
        };
      case 'CALM':
      default:
        return {
          title: isZh ? '气定神闲从容' : 'Calm & Collected',
          sub: isZh ? '呼吸平稳 · 条理严密沉着' : 'Steady breath & clear logic',
          bg: 'bg-gradient-to-r from-emerald-950/90 via-teal-950/60 to-slate-900/90 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          barColor: 'bg-gradient-to-r from-emerald-400 to-teal-500',
          textColor: 'text-emerald-300',
          scoreLabel: isZh ? '沉着指数' : 'Composure',
          Icon: Sparkles,
        };
    }
  };

  const sentimentTheme = getSentimentTheme(sentiment);
  const SentimentThemeIcon = sentimentTheme?.Icon;

  return (
    <div className="h-full w-full flex flex-col rounded-2xl bg-gradient-to-b from-[#0c121e]/95 via-[#080c14]/90 to-[#04060a]/95 border border-amber-500/25 shadow-xl backdrop-blur-md overflow-hidden relative">
      {/* 四角典雅哥特金边 */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20"></div>
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20"></div>
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20"></div>
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20"></div>

      {/* 侧边栏顶栏：法庭纪事标题与技术标识 */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800/90 bg-slate-950/60 z-10">
        <div className="flex items-center gap-1.5">
          <ScrollText className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-200 font-sans tracking-wide">
            {isZh ? '法庭纪事 · 审判卷轴' : 'Court Chronicles'}
          </span>
          {speakerId && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5"></span>
          )}
        </div>

        {/* AssemblyAI Universal-3.5 Pro 官方技术徽章 */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-sans tracking-tight shadow-sm">
          <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
          <span>AssemblyAI 3.5 Pro</span>
        </div>
      </div>

      {/* 实时发言与声学情绪测谎特写卡片 (Active Speaker Live Typing & Lie Detector) */}
      <div className="shrink-0 p-2.5 bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-b border-amber-500/20">
        <div className="flex items-center justify-between mb-1.5">
          {speakerId ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-amber-300 font-sans tracking-wide">
                {speakerName ? `${speakerName} (#${speakerId})` : `#${speakerId}号 执言`}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-sans">
                <Mic className="w-3 h-3" />
                {isZh ? '发言中' : 'LIVE'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-sans">
              <Compass className="w-3.5 h-3.5 text-amber-400/60 animate-spin-slow" />
              <span>{isZh ? '圆桌沉寂 · 声学测谎雷达守候' : 'Council at Rest · Acoustic Radar Idle'}</span>
            </div>
          )}

          {/* 顶栏快速测谎极简徽条 */}
          {sentiment && sentimentTheme && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-sans font-bold shadow-sm ${sentimentTheme.bg}`}
            >
              {SentimentThemeIcon && <SentimentThemeIcon className="w-3 h-3 text-amber-300" />}
              <span>{isZh ? sentiment.labelZh : sentiment.labelEn}</span>
            </div>
          )}
        </div>

        {/* 声学测谎雷达监控仪表 (Acoustic Lie-Detector Monitor) */}
        {speakerId && (
          <div className="mb-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
            {sentiment && sentimentTheme ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-1.5 font-bold">
                    {SentimentThemeIcon && <SentimentThemeIcon className={`w-3.5 h-3.5 ${sentimentTheme.textColor}`} />}
                    <span className={sentimentTheme.textColor}>{sentimentTheme.title}</span>
                    <span className="text-slate-400 font-normal text-xs hidden sm:inline">({sentimentTheme.sub})</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300 font-mono font-semibold">
                    <span className="text-xs text-slate-400 font-sans">{sentimentTheme.scoreLabel}:</span>
                    <span className={sentimentTheme.textColor}>{sentiment.score || 85}%</span>
                  </div>
                </div>

                {/* 测谎能量动态指示条 */}
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${sentimentTheme.barColor}`}
                    style={{ width: `${sentiment.score || 85}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-0.5 text-xs text-slate-400 font-sans">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400/80 animate-pulse" />
                  <span>{isZh ? 'AssemblyAI 声纹测谎侦测中…' : 'AssemblyAI Acoustic Profiling...'}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-2 bg-amber-400/60 rounded-full animate-wave-bar"></span>
                  <span className="w-1 h-3.5 bg-amber-400 rounded-full animate-wave-bar [animation-delay:0.2s]"></span>
                  <span className="w-1 h-2 bg-amber-400/60 rounded-full animate-wave-bar [animation-delay:0.4s]"></span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* 动态字幕打字机区域 */}
        <div className="min-h-[44px] max-h-[72px] overflow-y-auto px-2.5 py-1.5 rounded-lg bg-black/40 border border-slate-800/80">
          {transcript ? (
            <p className="text-xs text-slate-100 font-sans leading-relaxed font-medium">
              <span className="text-amber-400/80 font-serif mr-1">“</span>
              <span>{transcript}</span>
              <span className="text-amber-400/80 font-serif ml-1">”</span>
              {!isFinal && (
                <span className="inline-block w-1.5 h-3 ml-1 bg-amber-400 animate-pulse align-middle rounded-sm shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic font-sans flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              {isZh
                ? '席位沉寂，等待下一位执言者开麦陈述……'
                : 'Silence at the round table. Waiting for speaker...'}
            </p>
          )}
        </div>
      </div>

      {/* 审判编年史回溯流水 (Chronicle Feed - 可纵向滚动) */}
      <div className="flex-1 min-h-0 flex flex-col p-2 overflow-hidden">
        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800/60 px-1">
          <span className="text-xs font-sans uppercase tracking-widest text-amber-400/80 font-bold">
            {isZh ? '✦ 战局与发言编年史 ✦' : '✦ CHRONICLE FEED ✦'}
          </span>
          <span className="text-xs text-slate-400 font-sans">
            {chronicleLogs.length > 0
              ? isZh
                ? `${chronicleLogs.length} 条记录`
                : `${chronicleLogs.length} entries`
              : ''}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {chronicleLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <ScrollText className="w-8 h-8 mb-2 opacity-30 text-amber-500" />
              <p className="text-xs font-sans leading-relaxed">
                {isZh
                  ? '晨昏交织，命运之轮已启。\n全员发言与法官神谕将在此铭刻成卷……'
                  : 'The wheel of fate turns.\nAll testimony and verdicts will be penned here...'}
              </p>
            </div>
          ) : (
            chronicleLogs.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl text-xs font-sans transition-all ${
                  item.type === 'ANNOUNCEMENT'
                    ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900/40 border border-amber-500/30 text-amber-200 shadow-sm'
                    : item.sentiment?.sentiment === 'NERVOUS'
                    ? 'bg-gradient-to-r from-red-950/35 via-slate-900/70 to-slate-900/70 border border-red-500/45 text-slate-200 shadow-sm'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-200'
                }`}
              >
                {item.type === 'ANNOUNCEMENT' ? (
                  <div className="flex items-start gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-snug font-medium text-xs text-amber-200/90">
                      {item.text}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-amber-500/40 text-xs text-amber-300 font-bold flex items-center justify-center">
                          {item.speakerId}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {item.speakerName || (isZh ? `${item.speakerId}号玩家` : `Player #${item.speakerId}`)}
                        </span>
                      </div>
                      {item.sentiment && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                            item.sentiment.sentiment === 'NERVOUS'
                              ? 'bg-red-950/80 text-red-300 border-red-500/50 shadow-sm'
                              : item.sentiment.sentiment === 'AGGRESSIVE'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                              : item.sentiment.sentiment === 'DEFENSIVE'
                              ? 'bg-blue-950/80 text-blue-300 border-blue-500/50'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          }`}
                        >
                          {item.sentiment.sentiment === 'NERVOUS' && <ShieldAlert className="w-2.5 h-2.5 text-red-400" />}
                          {item.sentiment.sentiment === 'AGGRESSIVE' && <Flame className="w-2.5 h-2.5 text-amber-400" />}
                          {item.sentiment.sentiment === 'DEFENSIVE' && <Scale className="w-2.5 h-2.5 text-blue-400" />}
                          {item.sentiment.sentiment === 'CALM' && <Sparkles className="w-2.5 h-2.5 text-emerald-400" />}
                          <span>{isZh ? item.sentiment.labelZh : item.sentiment.labelEn}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300 font-normal pl-6">
                      <span className="text-amber-400/70 font-serif mr-0.5">“</span>
                      {item.text}
                      <span className="text-amber-400/70 font-serif ml-0.5">”</span>
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* 侧边栏底栏：状态指示 */}
      <div className="shrink-0 px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-sans">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{isZh ? '语音智能双轨引擎 就绪' : 'Audio Intelligence Ready'}</span>
        </span>
        <span className="text-amber-400/80 uppercase tracking-wider text-xs font-mono font-semibold flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 text-amber-400" />
          {phase || 'IDLE'}
        </span>
      </div>
    </div>
  );
};
