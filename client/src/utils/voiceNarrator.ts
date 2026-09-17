/**
 * 全浏览器原生 Web Speech API 智能体与法官神谕语音合成引擎
 * 针对 5 位不同性格 AI 角色与法官神谕提供定制化音调、语速与声线映射
 * 零外部网络依赖，彻底杜绝云端 TTS 403 限流与无声问题
 */
import { sfx } from './soundEffects.js';

export interface SpeakerPersonaConfig {
  name: string;
  pitch: number;
  rate: number;
  gender: 'male' | 'female' | 'neutral';
}

const PERSONA_VOICE_CONFIGS: Record<number, SpeakerPersonaConfig> = {
  // 0 号：法官神谕 (Authoritative, deep, steady)
  0: {
    name: '法官神谕',
    pitch: 0.88,
    rate: 1.02,
    gender: 'male',
  },
  // 2 号：亚瑟 / 卢娜 (依据人设：逻辑学者 / 敏锐直觉)
  2: {
    name: '亚瑟',
    pitch: 0.95,
    rate: 1.02,
    gender: 'male',
  },
  // 3 号：卢娜
  3: {
    name: '卢娜',
    pitch: 1.18,
    rate: 1.06,
    gender: 'female',
  },
  // 4 号：雷欧 (狂热执矛，语速偏快、激昂)
  4: {
    name: '雷欧',
    pitch: 1.08,
    rate: 1.16,
    gender: 'male',
  },
  // 5 号：索菲亚 (温和守御，温和、舒缓)
  5: {
    name: '索菲亚',
    pitch: 1.12,
    rate: 0.95,
    gender: 'female',
  },
  // 6 号：维克托 (冷峻观察，低沉、克制)
  6: {
    name: '维克托',
    pitch: 0.82,
    rate: 0.92,
    gender: 'male',
  },
};

class VoiceNarrator {
  private isAvailable: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private lastSpokenText: string = '';
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isAvailable = true;
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.isAvailable) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  /**
   * 唤醒浏览器的 Speech 引擎 (解除浏览器 Autoplay 限制)
   */
  public prime() {
    if (!this.isAvailable) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // safe fallback
    }
  }

  /**
   * 停止当前所有正在播放的语音
   */
  public stop() {
    if (!this.isAvailable) return;
    try {
      this.currentUtterance = null;
      window.speechSynthesis.cancel();
    } catch {
      // safe fallback
    }
  }

  /**
   * 朗读法官神谕公告
   */
  public speakAnnouncement(text: string, language: string = 'zh-CN') {
    if (!text || text === this.lastSpokenText) return;
    // 过滤纯标点或空串
    const clean = text.replace(/✦/g, '').trim();
    if (!clean) return;

    this.lastSpokenText = text;
    this.speak(0, clean, language);
  }

  /**
   * 朗读指定席位玩家发言
   */
  public speakPlayer(speakerId: number, text: string, language: string = 'zh-CN') {
    if (!text || speakerId === 1) return; // 1号为真人玩家，无需朗读
    this.speak(speakerId, text, language);
  }

  private speak(speakerId: number, text: string, language: string) {
    if (!this.isAvailable || sfx.getMuted()) return;

    this.stop(); // 掐断前一段发言，避免多角色语音堆叠

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    utterance.onend = () => {
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
      }
    };
    utterance.onerror = () => {
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
      }
    };

    const config = PERSONA_VOICE_CONFIGS[speakerId] || PERSONA_VOICE_CONFIGS[0];

    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    utterance.lang = language === 'zh-CN' ? 'zh-CN' : 'en-US';

    // 匹配最适合的本地声线 (优先中文/英文高质量系统语音)
    if (this.voices.length > 0) {
      const targetLang = utterance.lang.toLowerCase();
      const matchedVoice = this.voices.find((v) => {
        const langMatch = v.lang.toLowerCase().replace('_', '-').startsWith(targetLang.slice(0, 2));
        if (!langMatch) return false;
        if (config.gender === 'female') {
          return /female|xiaoxiao|huihui|yaoyao|samantha|zira/i.test(v.name);
        } else if (config.gender === 'male') {
          return /male|yunxi|kangkang|david|george/i.test(v.name);
        }
        return true;
      }) || this.voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(targetLang.slice(0, 2)));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // safe fallback
    }
  }
}

export const narrator = new VoiceNarrator();
