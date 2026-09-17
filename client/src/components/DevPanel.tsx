import React, { useState } from 'react';
import type { GameState, Language } from 'voice-werewolf-shared';
import { Bug, FastForward, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';

interface DevPanelProps {
  gameState: GameState | null;
  language: Language;
  onSkipTurn: () => void;
  onSimulateSpeech: (text: string) => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({
  gameState,
  language,
  onSkipTurn,
  onSimulateSpeech,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const isZh = language === 'zh-CN';

  const handleSendMock = () => {
    if (inputText.trim()) {
      onSimulateSpeech(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur max-w-sm overflow-hidden transition-all">
        {/* 折叠栏头部 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300"
        >
          <div className="flex items-center gap-2">
            <Bug className="w-3.5 h-3.5 text-amber-400" />
            <span>{isZh ? '开发者极速调试抽屉 (Dev Tool)' : 'Dev Testing Drawer'}</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="p-4 flex flex-col gap-3 text-xs">
            {/* 极速跳过 */}
            <div className="flex items-center gap-2">
              <button
                onClick={onSkipTurn}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-300 font-medium transition-all"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{isZh ? '跳过当前发言人' : 'Skip Speaker'}</span>
              </button>
            </div>

            {/* 模拟文本输入表水 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400">
                {isZh ? '文字模拟真人发言 (免麦克风):' : 'Simulate Voice Speech (Text):'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMock()}
                  placeholder={
                    isZh ? '输入你的辩白台词……' : 'Type simulated speech...'
                  }
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleSendMock}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 当前真实全知状态透视 (调试专用) */}
            {gameState && (
              <div className="mt-1 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                <div className="font-semibold text-slate-300 mb-1">
                  {isZh ? '场上身份透视 (仅供调试):' : 'Debug Roles (God View):'}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {gameState.players.map((p) => (
                    <div key={p.id} className="truncate">
                      #{p.id} {p.name}: <span className="text-amber-400">{p.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
