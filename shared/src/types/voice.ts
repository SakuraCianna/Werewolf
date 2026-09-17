export interface VoiceConfig {
  moderatorVoiceZh: string;
  moderatorVoiceEn: string;
}

export interface TranscriptPayload {
  speakerId: number;
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface AudioStreamChunk {
  speakerId: number;
  audioBase64: string;
  isEnd: boolean;
}

export const DEFAULT_VOICES = {
  zh: {
    moderator: 'zh-CN-YunxiNeural',     // 庄重、威严旁白主持
    agent1: 'zh-CN-YunjianNeural',       // 沉稳理性男声
    agent2: 'zh-CN-XiaoxiaoNeural',      // 敏锐灵动女声
    agent3: 'zh-CN-YunyangNeural',       // 热情专业男声
    agent4: 'zh-CN-XiaoyiNeural',        // 随和温和女声
    agent5: 'zh-CN-YunfengNeural',       // 低沉怀疑男声
  },
  en: {
    moderator: 'en-US-GuyNeural',        // Authoritative narrator
    agent1: 'en-US-ChristopherNeural',   // Calm, analytical male
    agent2: 'en-US-JennyNeural',         // Sharp, observant female
    agent3: 'en-US-EricNeural',          // Passionate, assertive male
    agent4: 'en-US-AriaNeural',          // Friendly, cautious female
    agent5: 'en-US-RogerNeural',         // Deep, skeptical male
  },
};
