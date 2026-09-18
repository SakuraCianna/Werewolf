/**
 * 全浏览器原生 Web Speech API 智能体与法官神谕语音合成引擎
 * 针对 5 位不同性格 AI 角色与法官神谕提供定制化超自然声线（Natural Neural Voices）
 * 严格保持自然基频（pitch=1.0），锁定微软超自然神经语音（云希/晓晓/云健/云扬/晓伊/云枫）与 Google 高保真音色
 * 内置防抢话连续播报队列与真人最高优先级打断机制，杜绝机械电音与中途掐断
 */
import { sfx } from './soundEffects.js';

export interface SpeakerPersonaConfig {
  name: string;
  preferredVoices: string[];
  gender: 'male' | 'female';
  rate: number;
}

const PERSONA_VOICE_CONFIGS: Record<number, SpeakerPersonaConfig> = {
  // 0 号：法官神谕 (深沉稳重，威严神圣) -> 优选 云健 (Yunjian) / 云希 (Yunxi)
  0: {
    name: '法官神谕',
    preferredVoices: ['yunjian', 'yunxi', 'yunyang', 'google', 'xiaoxiao'],
    gender: 'male',
    rate: 1.0,
  },
  // 2 号：亚瑟 (逻辑学者，沉稳清晰) -> 优选 云希 (Yunxi) / 云扬 (Yunyang)
  2: {
    name: '亚瑟',
    preferredVoices: ['yunxi', 'yunyang', 'yunjian', 'google'],
    gender: 'male',
    rate: 1.02,
  },
  // 3 号：卢娜 (敏锐直觉，灵动知性) -> 优选 晓晓 (Xiaoxiao) / 晓伊 (Xiaoyi)
  3: {
    name: '卢娜',
    preferredVoices: ['xiaoxiao', 'xiaoyi', 'xiaobei', 'google'],
    gender: 'female',
    rate: 1.02,
  },
  // 4 号：雷欧 (狂热执矛，激昂直率) -> 优选 云扬 (Yunyang) / 云希 (Yunxi)
  4: {
    name: '雷欧',
    preferredVoices: ['yunyang', 'yunxi', 'yunjian', 'google'],
    gender: 'male',
    rate: 1.04,
  },
  // 5 号：索菲亚 (温和守御，舒缓温柔) -> 优选 晓伊 (Xiaoyi) / 晓晓 (Xiaoxiao)
  5: {
    name: '索菲亚',
    preferredVoices: ['xiaoyi', 'xiaoxiao', 'xiaobei', 'google'],
    gender: 'female',
    rate: 0.98,
  },
  // 6 号：维克托 (冷峻观察，低沉理性) -> 优选 云枫 (Yunfeng) / 云健 (Yunjian)
  6: {
    name: '维克托',
    preferredVoices: ['yunfeng', 'yunjian', 'yunxi', 'google'],
    gender: 'male',
    rate: 0.98,
  },
};

interface SpeechQueueItem {
  speakerId: number;
  text: string;
  language: string;
}

class VoiceNarrator {
  private isAvailable: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private lastSpokenText: string = '';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: SpeechQueueItem[] = [];
  private isSpeaking: boolean = false;

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
   * 停止当前所有正在播放的语音并清空队列 (用于静音、真人开麦、游戏重开等高优先级场景)
   */
  public stop() {
    if (!this.isAvailable) return;
    try {
      this.queue = [];
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.lastSpokenText = '';
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
    const clean = text.replace(/✦/g, '').trim();
    if (!clean) return;

    this.lastSpokenText = text;
    this.enqueue(0, clean, language);
  }

  /**
   * 朗读指定席位玩家发言
   */
  public speakPlayer(speakerId: number, text: string, language: string = 'zh-CN') {
    if (!text || speakerId === 1) return; // 1号为真人玩家，无需朗读
    this.enqueue(speakerId, text, language);
  }

  private enqueue(speakerId: number, text: string, language: string) {
    if (!this.isAvailable || sfx.getMuted()) return;

    // 检查队列中是否已有完全相同文本，避免重复入队
    if (this.queue.some((q) => q.text === text)) return;

    this.queue.push({ speakerId, text, language });
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length === 0 || !this.isAvailable || sfx.getMuted()) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      return;
    }

    this.isSpeaking = true;
    const item = this.queue.shift()!;
    const config = PERSONA_VOICE_CONFIGS[item.speakerId] || PERSONA_VOICE_CONFIGS[0];

    const utterance = new SpeechSynthesisUtterance(item.text);
    this.currentUtterance = utterance;

    // 关键：保持 natural pitch=1.0，杜绝算法机械失真与电音人机感
    utterance.pitch = 1.0;
    utterance.rate = config.rate;
    utterance.lang = item.language === 'zh-CN' ? 'zh-CN' : 'en-US';

    // 匹配最优质的超自然神经声线 (优先微软 Natural / Online 与 Google 高清声线)
    const bestVoice = this.findBestVoice(config, utterance.lang);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => {
      if (this.currentUtterance !== utterance) return;
      this.currentUtterance = null;
      this.processQueue();
    };

    utterance.onerror = () => {
      if (this.currentUtterance !== utterance) return;
      this.currentUtterance = null;
      this.processQueue();
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue();
    }
  }

  /**
   * 优先匹配超自然神经音色（Natural / Online / Neural / Google），屏蔽机械 SAPI5 桌面音色
   */
  private findBestVoice(config: SpeakerPersonaConfig, lang: string): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) return null;

    const targetPrefix = lang.toLowerCase().replace('_', '-').slice(0, 2);
    const langVoices = this.voices.filter((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix)
    );
    if (langVoices.length === 0) return this.voices[0] || null;

    // 第一梯队：优先在带有 Natural/Online/Neural/Google 的超自然音色中，按人设偏好查找
    for (const pref of config.preferredVoices) {
      const match = langVoices.find((v) => {
        const name = v.name.toLowerCase();
        const isNatural = /natural|online|neural|google|premium/i.test(name);
        return isNatural && name.includes(pref);
      });
      if (match) return match;
    }

    // 第二梯队：匹配任意带有 Natural/Online/Neural/Google 的该语言音色
    const anyNatural = langVoices.find((v) =>
      /natural|online|neural|google/i.test(v.name.toLowerCase())
    );
    if (anyNatural) return anyNatural;

    // 第三梯队：过滤掉已知的极度机械音色（Desktop / SAPI），按偏好匹配
    const nonDesktop = langVoices.filter((v) => !/desktop|sapi/i.test(v.name.toLowerCase()));
    if (nonDesktop.length > 0) {
      for (const pref of config.preferredVoices) {
        const match = nonDesktop.find((v) => v.name.toLowerCase().includes(pref));
        if (match) return match;
      }
      return nonDesktop[0];
    }

    // 兜底返回该语言首个音色
    return langVoices[0];
  }
}

export const narrator = new VoiceNarrator();
