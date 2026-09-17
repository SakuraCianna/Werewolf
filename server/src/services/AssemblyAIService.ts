import WebSocket from 'ws';
import { config } from '../config.js';

export interface AssemblyAITranscriptCallback {
  (text: string, isFinal: boolean): void;
}

export class AssemblyAIService {
  private ws: WebSocket | null = null;
  private onTranscriptCallback: AssemblyAITranscriptCallback | null = null;
  private finalTranscriptBuffer: string[] = [];
  private isConnecting: boolean = false;
  private forceMock: boolean = false;

  constructor(options: { forceMock?: boolean } = {}) {
    this.forceMock = options.forceMock ?? config.mockVoice;
  }

  public async startSession(
    onTranscript: AssemblyAITranscriptCallback,
    sampleRate: number = 16000,
  ): Promise<void> {
    this.onTranscriptCallback = onTranscript;
    this.finalTranscriptBuffer = [];

    if (this.forceMock || !config.assemblyAiApiKey) {
      // 开启 Mock 模拟模式，用于免 Key 或测试环境快速调试
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        // AssemblyAI Real-Time Streaming v3 Endpoint
        const endpoint = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${sampleRate}&speech_model=universal-3-5-pro`;
        this.ws = new WebSocket(endpoint, {
          headers: {
            Authorization: config.assemblyAiApiKey,
          },
        });

        this.ws.on('open', () => {
          this.isConnecting = false;
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const msg = JSON.parse(data.toString());
            // v3 Turn 事件结构
            if (msg.type === 'Turn') {
              const text = msg.transcript || '';
              const isFinal = Boolean(msg.end_of_turn);
              if (text) {
                if (isFinal) {
                  this.finalTranscriptBuffer.push(text);
                }
                this.onTranscriptCallback?.(text, isFinal);
              }
            } else if (msg.type === 'Begin') {
              // 会话成功建立
            }
          } catch {
            // ignore non-json
          }
        });

        this.ws.on('error', (err) => {
          this.isConnecting = false;
          // 若网络故障则安全回退至 Mock 模式，保证游戏不阻断
          console.warn('[AssemblyAI Warning] WebSocket connection error, falling back to mock mode:', err.message);
          this.forceMock = true;
          resolve();
        });

        this.ws.on('close', () => {
          this.ws = null;
        });
      } catch (err) {
        this.isConnecting = false;
        this.forceMock = true;
        resolve();
      }
    });
  }

  public sendAudioChunk(pcmChunk: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // AssemblyAI v3 接收二进制 PCM16 音频帧
      this.ws.send(pcmChunk);
    }
  }

  public async endSession(): Promise<string> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'Terminate' }));
      this.ws.close();
      this.ws = null;
    }
    return this.finalTranscriptBuffer.join(' ').trim();
  }
}
